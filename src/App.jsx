import { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";
import { updateProfile, getProfile, createGroup, joinGroup, getGroupMembers, getBusySlotsForUsers, syncAvailability, supabase, deleteAllUserData, exportUserData } from "./services/supabase";
import { findCommonHumaneSlots } from './services/scheduler';
import { callMsGraph, findMeetingTimes, createMeeting } from './services/graph';
import { fetchGoogleAvailability, createGoogleEvent } from './services/google';
import { useGoogleLogin } from '@react-oauth/google';
import { Sidebar } from './components/Sidebar';
import { GroupView } from './components/GroupView';
import { WorldClock } from './components/WorldClock';
import { GuestJoinModal } from './components/GuestJoinModal';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { AdminDashboard } from './components/AdminDashboard';
import { JoinGroupPage } from './components/JoinGroupPage';
import { HowItWorks } from './components/HowItWorks';
import { SchedulingAssistant } from './components/SchedulingAssistant';
import { AvailabilityWizard } from './components/AvailabilityWizard';

import './index.css';

function App() {
  const { instance, accounts } = useMsal();
  const [activeAccount, setActiveAccount] = useState(null);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [calendarConnected, setCalendarConnected] = useState(false);

  // State
  const [view, setView] = useState('dashboard');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentGroupMembers, setCurrentGroupMembers] = useState([]);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState(null); // Auto-send question
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [myBusySlots, setMyBusySlots] = useState([]); // For calendar overlay
  const [joinInviteCode, setJoinInviteCode] = useState(null); // For URL-based joins

  // New: Multiple Windows State
  const [humaneWindows, setHumaneWindows] = useState([
    { start: "09:00", end: "17:00", type: "weekday" } // Default
  ]);

  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [nightOwl, setNightOwl] = useState(false); // Allow midnight-6am slots
  const [showAvailabilityWizard, setShowAvailabilityWizard] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Idle");
  const [betaBannerDismissed, setBetaBannerDismissed] = useState(() => {
    return localStorage.getItem('betaBannerDismissed') === 'true';
  });

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Check for special URLs on load (/join/:code, /privacy, /how-it-works)
  useEffect(() => {
    const path = window.location.pathname;
    
    // Check for invite code
    const joinMatch = path.match(/\/join\/([A-Za-z0-9]+)/);
    if (joinMatch) {
      setJoinInviteCode(joinMatch[1].toUpperCase());
      return;
    }
    
    // Check for privacy policy page
    if (path === '/privacy' || path === '/privacy/') {
      setView('privacy');
      return;
    }
    
    // Check for how it works page
    if (path === '/how-it-works' || path === '/how-it-works/' || path === '/how') {
      setView('how-it-works');
      return;
    }
    
    // Check for terms of service page
    if (path === '/terms' || path === '/terms/') {
      setView('terms');
      return;
    }
  }, []);

  // Admin dashboard keyboard shortcut (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdminDashboard(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // PERSISTENT LOGIN: Restore session from localStorage on page load
  useEffect(() => {
    const restoreSession = async () => {
      const savedSession = localStorage.getItem('userSession');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          // Verify profile still exists in Supabase
          const profile = await getProfile(session.username);
          if (profile) {
            setActiveAccount({
              username: session.username,
              name: session.name || profile.display_name,
              provider: session.provider
            });
            if (profile.humane_windows && profile.humane_windows.length > 0) {
              setHumaneWindows(profile.humane_windows);
            }
            if (profile.timezone) setTimezone(profile.timezone);
            if (profile.night_owl !== undefined) setNightOwl(profile.night_owl);
            // Calendar is connected if they logged in with OAuth provider
            setCalendarConnected(session.provider === 'microsoft' || session.provider === 'google');
            fetchMyGroups(session.username);
          } else {
            // Profile gone, clear session
            localStorage.removeItem('userSession');
            localStorage.removeItem('guestEmail');
          }
        } catch {
          localStorage.removeItem('userSession');
        }
      }
    };
    
    // Only restore if no account is set
    if (!activeAccount && accounts.length === 0) {
      restoreSession();
    }
  }, []);

  // Handle Microsoft MSAL login (save session after successful login)
  useEffect(() => {
    const acc = accounts[0];
    if (acc) {
      const msAccount = {
        username: acc.username,
        name: acc.name,
        provider: 'microsoft'
      };
      setActiveAccount(msAccount);
      setCalendarConnected(true);
      
      // Save session to localStorage for persistence
      localStorage.setItem('userSession', JSON.stringify(msAccount));
      
      // Fetch Profile Logic - load saved preferences
      getProfile(acc.username).then(profile => {
        if (profile) {
          // Load saved availability windows
          if (profile.humane_windows && profile.humane_windows.length > 0) {
            setHumaneWindows(profile.humane_windows);
          }
          if (profile.timezone) setTimezone(profile.timezone);
          if (profile.night_owl !== undefined) setNightOwl(profile.night_owl);
        } else {
          // Only create profile if it doesn't exist (first time user)
          updateProfile(
            acc.username,
            acc.name,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            "09:00",
            "17:00",
            [{ start: "09:00", end: "17:00", type: "weekday" }]
          );
        }
      });
      fetchMyGroups(acc.username);
    }
  }, [accounts]);

  const fetchMyGroups = async (email) => {
    // Fetch logic for groups would go here in V2
    // For now we persist in state or fetch from Supabase if we implemented that query
    const { data } = await supabase
      .from('group_members')
      .select('groups(*)')
      .eq('profile_email', email);

    if (data) setGroups(data.map(d => d.groups));
  };

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch(console.error);
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleAccessToken(tokenResponse.access_token);
      setCalendarConnected(true);

      const userInfo = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      }).then(res => res.json());

      const googleUser = {
        username: userInfo.email,
        name: userInfo.name,
        provider: 'google'
      };

      setActiveAccount(googleUser);
      
      // Save session to localStorage for persistence
      localStorage.setItem('userSession', JSON.stringify(googleUser));

      // Check if profile exists - load saved preferences or create new
      const existingProfile = await getProfile(googleUser.username);
      if (existingProfile) {
        // Load saved availability windows
        if (existingProfile.humane_windows && existingProfile.humane_windows.length > 0) {
          setHumaneWindows(existingProfile.humane_windows);
        }
        if (existingProfile.timezone) setTimezone(existingProfile.timezone);
        if (existingProfile.night_owl !== undefined) setNightOwl(existingProfile.night_owl);
      } else {
        // First time user - create profile with defaults
        await updateProfile(
          googleUser.username, 
          googleUser.name, 
          Intl.DateTimeFormat().resolvedOptions().timeZone, 
          "09:00", 
          "17:00", 
          [{ start: "09:00", end: "17:00", type: "weekday" }]
        );
      }
      fetchMyGroups(googleUser.username);
    },
    scope: 'https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.events.owned'
  });

  // Guest login (no calendar integration)
  const handleGuestJoin = async (guestData) => {
    // Create/update profile in Supabase FIRST
    const profile = await updateProfile(
      guestData.email,
      guestData.name,
      guestData.timezone,
      guestData.windows[0]?.start || "09:00",
      guestData.windows[0]?.end || "17:00",
      guestData.windows
    );

    if (!profile) {
      alert("Failed to create profile. Please try again.");
      return;
    }

    const guestUser = {
      username: guestData.email,
      name: guestData.name,
      provider: 'guest'
    };

    // Save session to localStorage for persistence
    localStorage.setItem('userSession', JSON.stringify(guestUser));
    localStorage.setItem('guestEmail', guestData.email); // Keep for backwards compatibility

    setActiveAccount(guestUser);
    setHumaneWindows(guestData.windows);
    setTimezone(guestData.timezone);
    setCalendarConnected(false);

    // If there's a group code, join it
    if (guestData.groupCode) {
      await joinGroup(guestData.groupCode, guestData.email);
    }
    
    fetchMyGroups(guestData.email);
    setShowGuestModal(false);
  };

  // Connect calendar for existing guest
  const handleConnectCalendar = (provider) => {
    if (provider === 'microsoft') {
      handleLogin();
    } else {
      handleGoogleLogin();
    }
  };

  const handleLogout = async () => {
    const provider = activeAccount?.provider;
    
    // Clear all local session data
    localStorage.removeItem('userSession');
    localStorage.removeItem('guestEmail');
    setActiveAccount(null);
    setGoogleAccessToken(null);
    setCalendarConnected(false);
    setGroups([]);
    setMyBusySlots([]);
    
    // Provider-specific logout
    if (provider === 'microsoft') {
      try {
        await instance.logoutPopup();
      } catch {
        console.log("Microsoft logout cancelled or failed");
      }
    } else if (provider === 'google') {
      // Google OAuth tokens are session-only, just clearing state is enough
      // Optionally revoke token:
      // google.accounts.oauth2.revoke(googleAccessToken);
      console.log("Google session cleared");
    }
    // Guest logout just clears local state (already done above)
  };

  // Fetch user's busy slots for calendar overlay
  const fetchMyBusySlots = async () => {
    if (!calendarConnected || !activeAccount) return;
    
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 14);

    try {
      if (activeAccount.provider === 'google' && googleAccessToken) {
        const slots = await fetchGoogleAvailability(googleAccessToken, activeAccount.username, start, end);
        setMyBusySlots(slots);
      } else if (activeAccount.provider === 'microsoft') {
        const msalAccount = accounts[0];
        if (!msalAccount) {
          console.error("Microsoft account not found for busy slots");
          return;
        }

        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: msalAccount
        });
        
        const graphUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}&$select=start,end`;
        const fetchRes = await fetch(graphUrl, {
          headers: { Authorization: `Bearer ${response.accessToken}` }
        });
        const data = await fetchRes.json();
        
        if (data.error) {
          console.error("Microsoft Graph API error:", data.error);
          return;
        }

        if (data.value) {
          const slots = data.value.map(event => ({
            start: { dateTime: event.start.dateTime },
            end: { dateTime: event.end.dateTime }
          }));
          setMyBusySlots(slots);
        }
      }
    } catch (err) {
      console.error("Failed to fetch busy slots for overlay:", err);
    }
  };

  // Fetch busy slots when calendar is connected
  useEffect(() => {
    if (calendarConnected && activeAccount) {
      fetchMyBusySlots();
    }
  }, [calendarConnected, activeAccount]);

  // Delete all user data (GDPR)
  const handleDeleteAllData = async () => {
    if (!activeAccount) return;
    
    const result = await deleteAllUserData(activeAccount.username);
    
    if (result.success) {
      alert("All your data has been deleted. You will now be logged out.");
      handleLogout();
      setShowPrivacyPolicy(false);
    } else {
      alert("There was an error deleting some data. Please contact support.");
    }
  };

  // Export user data (GDPR)
  const handleExportData = async () => {
    if (!activeAccount) return;
    
    const data = await exportUserData(activeAccount.username);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `humane-calendar-data-${activeAccount.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- ACTIONS ---

  const handleSync = async () => {
    if (!activeAccount) return;
    setSyncStatus("Syncing...");
    try {
      if (activeAccount.provider === 'google') {
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 14);

        const slots = await fetchGoogleAvailability(googleAccessToken, activeAccount.username, start, end);
        await syncAvailability(activeAccount.username, slots);
      } else if (activeAccount.provider === 'microsoft') {
        // Use MSAL accounts[0], not our custom activeAccount object
        const msalAccount = accounts[0];
        if (!msalAccount) {
          throw new Error("Microsoft account not found. Please log in again.");
        }

        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: msalAccount
        });

        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 14);

        const graphUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}&$select=start,end`;

        const fetchRes = await fetch(graphUrl, {
          headers: { Authorization: `Bearer ${response.accessToken}` }
        });
        const data = await fetchRes.json();

        if (data.error) {
          console.error("Microsoft Graph API error:", data.error);
          throw new Error(data.error.message || "Failed to fetch calendar");
        }

        if (data.value) {
          await syncAvailability(activeAccount.username, data.value);
        }
      } else {
        // Guest without calendar - just save profile
        console.log("Guest user - no calendar to sync");
      }

      await updateProfile(
        activeAccount.username,
        activeAccount.name,
        timezone,
        humaneWindows[0]?.start || "09:00", // Fallback for legacy
        humaneWindows[0]?.end || "17:00",   // Fallback for legacy
        humaneWindows, // New JSONB
        nightOwl // Allow midnight-6am slots
      );

      setSyncStatus("Synced!");
      setTimeout(() => setSyncStatus("Idle"), 3000);
    } catch (err) {
      console.error(err);
      setSyncStatus("Failed");
    }
  };

  // Test calendar connection by creating a test event
  const handleTestCalendar = async () => {
    if (!activeAccount || !calendarConnected) {
      alert("Please connect your calendar first.");
      return;
    }

    const confirmTest = confirm(
      "This will create a TEST event on your calendar in 5 minutes (and delete it after).\n\n" +
      "This verifies that Humane Calendar can:\n" +
      "✓ Create events on YOUR calendar\n" +
      "✓ Send invites on YOUR behalf\n" +
      "✓ Generate video meeting links\n\n" +
      "Continue?"
    );

    if (!confirmTest) return;

    try {
      const now = new Date();
      const testStart = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
      const testEnd = new Date(testStart.getTime() + 15 * 60 * 1000); // 15 minutes later

      if (activeAccount.provider === 'google') {
        const result = await createGoogleEvent(
          googleAccessToken,
          "🧪 Humane Calendar Test Event",
          "This is a test event to verify calendar integration.\n\nYou can delete this event.",
          testStart.toISOString(),
          testEnd.toISOString(),
          [activeAccount.username], // Only invite yourself
          activeAccount.username
        );

        alert(
          "✅ SUCCESS! Test event created.\n\n" +
          "Check your Google Calendar - you should see:\n" +
          "• Event: '🧪 Humane Calendar Test Event'\n" +
          "• Time: Starting in 5 minutes\n" +
          "• Google Meet link included\n\n" +
          "Organizer: " + (result.organizer?.email || activeAccount.username) + "\n\n" +
          "You can delete this test event from your calendar."
        );
      } else if (activeAccount.provider === 'microsoft') {
        const tokenResponse = await instance.acquireTokenSilent({ 
          ...loginRequest, 
          account: accounts[0] 
        });

        const result = await createMeeting(
          tokenResponse.accessToken,
          "🧪 Humane Calendar Test Event",
          "This is a test event to verify calendar integration. You can delete this event.",
          testStart.toISOString(),
          testEnd.toISOString(),
          [activeAccount.username],
          activeAccount.username,
          false
        );

        alert(
          "✅ SUCCESS! Test event created.\n\n" +
          "Check your Outlook Calendar - you should see:\n" +
          "• Event: '🧪 Humane Calendar Test Event'\n" +
          "• Time: Starting in 5 minutes\n" +
          "• Teams link (if available)\n\n" +
          "You can delete this test event from your calendar."
        );
      }

      console.log("Calendar test completed successfully!");

    } catch (err) {
      console.error("Calendar test failed:", err);
      alert(
        "❌ FAILED to create test event.\n\n" +
        "Error: " + err.message + "\n\n" +
        "Common causes:\n" +
        "1. OAuth token expired - try logging out and back in\n" +
        "2. Calendar API not enabled in Google Cloud Console\n" +
        "3. Missing permissions\n\n" +
        "Check browser console (F12) for details."
      );
    }
  };

  const checkOrganiserAccess = () => {
    const isOrganiser = localStorage.getItem('isOrganiser');
    if (isOrganiser === 'true') return true;

    const code = prompt("Enter Organiser Access Code:");
    if (code === import.meta.env.VITE_ORGANISER_CODE) {
      localStorage.setItem('isOrganiser', 'true');
      return true;
    } else {
      alert("Incorrect Code. Access Denied.");
      return false;
    }
  };

  const handleCreateGroup = async () => {
    if (!checkOrganiserAccess()) return;

    const name = prompt("Group Name:");
    if (!name) return;
    const grp = await createGroup(name, activeAccount.username);
    if (grp) {
      setGroups([...groups, grp]);
    }
  };

  const handleJoinGroup = async () => {
    if (!activeAccount) { alert("Please sign in to join a group."); return; }
    const id = prompt("Group ID:");
    if (!id) return;
    await joinGroup(id, activeAccount.username);
    fetchMyGroups(activeAccount.username);
  };

  const handleFindTimes = async (groupId, startStr, endStr, durationMinutes = 60) => {
    setLoading(true);
    try {
      const members = await getGroupMembers(groupId);
      const memberEmails = members.map(m => m.email);

      console.log("=== FIND TIMES DEBUG ===");
      console.log("Group ID:", groupId);
      console.log("Date range:", startStr, "to", endStr);
      console.log("Duration:", durationMinutes, "minutes");
      console.log("Members found:", members.length);
      members.forEach(m => {
        console.log(`  - ${m.email}: timezone=${m.timezone}, windows=`, m.humane_windows);
      });

      const start = new Date(startStr);
      const end = new Date(endStr);
      end.setHours(23, 59, 59);

      const busySlots = await getBusySlotsForUsers(memberEmails, start, end);
      console.log("Busy slots fetched:", busySlots.length);

      const slots = findCommonHumaneSlots(members, busySlots, startStr, endStr, durationMinutes);
      console.log("Slots found:", slots.length);
      
      if (slots.length === 0) {
        alert("No matching times found. This could mean:\n\n1. Members' availability windows don't overlap\n2. All overlapping times are during busy periods\n3. Members haven't set their availability windows\n\nCheck the browser console for detailed debugging info.");
      }
      
      setSuggestions(slots);
    } catch (e) {
      console.error("Find times error:", e);
      alert("Error finding times: " + e.message);
      setLoading(false);
    }
  };

  const handleBookMeeting = async (groupId, slot, subject, description, membersToInvite = null) => {
    if (!activeAccount) { 
      alert("Please sign in to book a meeting."); 
      throw new Error("Not signed in");
    }
    
    // Guests without calendar integration can't send invites
    if (activeAccount.provider === 'guest' && !calendarConnected) {
      alert("To send calendar invites, please connect your Google or Microsoft calendar first.");
      throw new Error("Calendar not connected");
    }
    
    if (!checkOrganiserAccess()) {
      throw new Error("Not authorized");
    }

    try {
      // Use provided members list if available (for partial attendance), otherwise fetch all
      let members;
      if (membersToInvite && membersToInvite.length > 0) {
        members = membersToInvite;
      } else {
        members = await getGroupMembers(groupId);
      }
      
      const memberEmails = members.map(m => m.email);
      const organizerEmail = activeAccount.username;

      // Ensure organizer is included in attendee list
      if (!memberEmails.includes(organizerEmail)) {
        memberEmails.push(organizerEmail);
      }

      console.log("Sending invites to:", memberEmails, "(", members.length, "members)", "Organizer:", organizerEmail);

      if (activeAccount.provider === 'google') {
        const result = await createGoogleEvent(
          googleAccessToken,
          subject,
          description,
          slot.start,
          slot.end,
          memberEmails,
          organizerEmail
        );
        console.log("Google Event created:", result);
        alert(`✅ Meeting created with Google Meet!\n\nAll ${memberEmails.length} attendees will receive a calendar invitation with the video link.`);
      } else if (activeAccount.provider === 'microsoft') {
        const tokenResponse = await instance.acquireTokenSilent({ 
          ...loginRequest, 
          account: accounts[0] 
        });
        
        // Detect if personal Microsoft account (outlook.com, hotmail.com, live.com)
        // vs work/school account
        const personalDomains = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'];
        const emailDomain = organizerEmail.split('@')[1]?.toLowerCase() || '';
        const isPersonalAccount = personalDomains.some(d => emailDomain.includes(d));
        
        console.log("Account type:", isPersonalAccount ? "Personal" : "Work/School");
        
        const result = await createMeeting(
          tokenResponse.accessToken,
          subject,
          description,
          slot.start,
          slot.end,
          memberEmails,
          organizerEmail,
          isPersonalAccount
        );
        console.log("Microsoft Event created:", result);
        
        // Show appropriate message
        const hasTeams = result.onlineMeeting?.joinUrl;
        if (hasTeams) {
          alert(`✅ Meeting created with Teams link!\n\nAll ${memberEmails.length - 1} attendees will receive a calendar invitation.\n\nThe event is now on your calendar.`);
        } else {
          alert(`✅ Meeting created!\n\nAll ${memberEmails.length - 1} attendees will receive a calendar invitation.\n\nNote: Teams link may not be available for personal accounts. Consider using Skype or sharing a video link in the description.`);
        }
      }

      setSuggestions([]);
    } catch (e) {
      console.error("Booking error:", e);
      alert("Booking Failed: " + e.message);
      throw e;
    }
  };

  // --- Handle join success ---
  const handleJoinSuccess = (group, guestUser = null) => {
    if (guestUser) {
      setActiveAccount(guestUser);
    }
    // Clear URL and go to group
    window.history.replaceState({}, '', '/');
    setJoinInviteCode(null);
    setSelectedGroup(group);
    setView('groups');
    if (activeAccount || guestUser) {
      fetchMyGroups((guestUser || activeAccount).username);
    }
  };

  // --- RENDER ---

  // Show standalone privacy policy page if URL is /privacy
  if (view === 'privacy') {
    return (
      <PrivacyPolicy 
        isStandalone={true}
        onClose={() => {
          window.history.replaceState({}, '', '/');
          setView('dashboard');
        }}
        onDeleteData={handleDeleteAllData}
        userEmail={activeAccount?.username}
      />
    );
  }

  // Show standalone how it works page if URL is /how-it-works
  if (view === 'how-it-works') {
    return (
      <HowItWorks 
        isStandalone={true}
        onClose={() => {
          window.history.replaceState({}, '', '/');
          setView('dashboard');
        }}
      />
    );
  }

  // Show standalone terms of service page if URL is /terms
  if (view === 'terms') {
    return (
      <TermsOfService 
        onBack={() => {
          window.history.replaceState({}, '', '/');
          setView('dashboard');
        }}
      />
    );
  }

  // Show join page if there's an invite code in URL
  if (joinInviteCode) {
    return (
      <JoinGroupPage
        inviteCode={joinInviteCode}
        currentUser={activeAccount}
        onClose={() => {
          window.history.replaceState({}, '', '/');
          setJoinInviteCode(null);
        }}
        onLoginMS={handleLogin}
        onLoginGoogle={() => handleGoogleLogin()}
        onJoinSuccess={handleJoinSuccess}
      />
    );
  }

  return (
    <div className="app-wrapper">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰
        </button>
        <img src="/logo.png" alt="Logo" style={{ height: '32px' }} />
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        activeView={view}
        setView={(v) => { setView(v); setSidebarOpen(false); }}
        user={activeAccount}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        onSync={handleSync}
        onLoginMS={handleLogin}
        onLoginGoogle={() => handleGoogleLogin()}
        onGuestJoin={() => setShowGuestModal(true)}
        calendarConnected={calendarConnected}
        onConnectCalendar={handleConnectCalendar}
        isOpen={sidebarOpen}
        onShowPrivacy={() => setShowPrivacyPolicy(true)}
        onShowAdmin={() => setShowAdminDashboard(true)}
        onTestCalendar={handleTestCalendar}
      />

      {/* Guest Join Modal */}
      {showGuestModal && (
        <GuestJoinModal
          onClose={() => setShowGuestModal(false)}
          onJoin={handleGuestJoin}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <PrivacyPolicy
          onClose={() => setShowPrivacyPolicy(false)}
          onDeleteData={handleDeleteAllData}
          userEmail={activeAccount?.username}
        />
      )}

      {/* Admin Dashboard Modal */}
      {showAdminDashboard && (
        <AdminDashboard 
          onClose={() => setShowAdminDashboard(false)} 
          currentUserEmail={activeAccount?.username}
        />
      )}

      <main className="main-area">
        {/* Beta Banner - Dismissible */}
        {activeAccount && !betaBannerDismissed && (
          <div className="beta-banner">
            <span className="beta-banner-text">
              <strong>Alpha Preview:</strong> Humane Calendar is in closed testing. Calendar connections limited to 100 users pending Google verification.
            </span>
            <button 
              className="beta-banner-close"
              onClick={() => {
                setBetaBannerDismissed(true);
                localStorage.setItem('betaBannerDismissed', 'true');
              }}
            >
              ✕
            </button>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="animate-fade-in">
            {/* Hero Section - Show when not logged in */}
            {!activeAccount && (
              <div className="hero-section">
                <h1 className="hero-title">
                  Schedule Across Timezones.<br />
                  <span className="hero-highlight">Respect Everyone's Hours.</span>
                </h1>
                <p className="hero-subtitle">
                  Each person picks when they're actually free — in their own timezone. 
                  You see the overlap and send the invite.
                </p>
                <div className="hero-features">
                  <div className="hero-feature">
                    Invitees choose their own slots
                  </div>
                  <div className="hero-feature">
                    Times shown in local hours
                  </div>
                  <div className="hero-feature">
                    One-click calendar invite with video link
                  </div>
                </div>
                <div className="hero-cta">
                  <p className="hero-cta-text">Sign in to create a scheduling group:</p>
                </div>
              </div>
            )}

            <h2>{activeAccount ? 'Dashboard' : ''}</h2>

            <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
              <div className="card">
                <h3>My Humane Hours</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>When do you prefer to meet?</p>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Your Time Zone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    list="timezones"
                  />
                  <datalist id="timezones">
                    {Intl.supportedValuesOf('timeZone').map((tz) => (
                      <option key={tz} value={tz} />
                    ))}
                  </datalist>
                </div>

                {/* Show wizard or manual editor */}
                {showAvailabilityWizard ? (
                  <AvailabilityWizard
                    onComplete={(windows) => {
                      setHumaneWindows(windows);
                      setShowAvailabilityWizard(false);
                    }}
                    onCancel={() => setShowAvailabilityWizard(false)}
                  />
                ) : (
                  <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Your Availability Windows</label>
                      <button
                        onClick={() => setShowAvailabilityWizard(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Try Quick Setup
                      </button>
                    </div>

                    {humaneWindows.map((win, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={win.type}
                          onChange={(e) => {
                            const newWins = [...humaneWindows];
                            newWins[idx].type = e.target.value;
                            setHumaneWindows(newWins);
                          }}
                          style={{ width: '170px', fontSize: '0.8rem' }}
                        >
                          <option value="weekday">Weekdays (Mon-Fri)</option>
                          <option value="weekend">Weekends (Sat-Sun)</option>
                          <option value="me_workday">Sun-Thu (Mid. East)</option>
                          <option value="me_weekend">Fri-Sat (Mid. East)</option>
                          <option value="everyday">Every Day</option>
                        </select>
                        <input
                          type="time"
                          value={win.start}
                          onChange={e => {
                            const newWins = [...humaneWindows];
                            newWins[idx].start = e.target.value;
                            setHumaneWindows(newWins);
                          }}
                          style={{ flex: 1 }}
                        />
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                        <input
                          type="time"
                          value={win.end}
                          onChange={e => {
                            const newWins = [...humaneWindows];
                            newWins[idx].end = e.target.value;
                            setHumaneWindows(newWins);
                          }}
                          style={{ flex: 1 }}
                        />
                        <button
                          className="btn-ghost"
                          style={{ padding: '0 0.5rem', color: '#ff4444' }}
                          onClick={() => {
                            const newWins = humaneWindows.filter((_, i) => i !== idx);
                            setHumaneWindows(newWins);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    <button
                      className="btn-ghost"
                      style={{ fontSize: '0.8rem', marginTop: '0.5rem', border: '1px dashed var(--border)', width: '100%' }}
                      onClick={() => setHumaneWindows([...humaneWindows, { start: "09:00", end: "17:00", type: "weekday" }])}
                    >
                      + Add Time Window
                    </button>

                    {/* Night Owl Preference */}
                    <label 
                      className="night-owl-toggle"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        marginTop: '1rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={nightOwl}
                        onChange={(e) => setNightOwl(e.target.checked)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>Include overnight slots (midnight-6am)</span>
                    </label>
                  </div>
                )}

                {/* Calendar Conflicts Overlay */}
                {calendarConnected && myBusySlots.length > 0 && (
                  <div className="busy-times-overlay">
                    <h4>📅 Your Upcoming Busy Times</h4>
                    {myBusySlots.slice(0, 5).map((slot, idx) => {
                      const start = new Date(slot.start.dateTime);
                      const end = new Date(slot.end.dateTime);
                      return (
                        <div key={idx} className="busy-slot">
                          <span>{start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          <span>•</span>
                          <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      );
                    })}
                    {myBusySlots.length > 5 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        + {myBusySlots.length - 5} more busy slots
                      </div>
                    )}
                  </div>
                )}

                {/* Prompt to connect calendar for guests */}
                {activeAccount && !calendarConnected && (
                  <div className="sync-prompt" style={{ marginTop: '1rem' }}>
                    <span className="sync-icon">📅</span>
                    <div className="sync-prompt-text">
                      <strong>See your calendar conflicts</strong>
                      <p>Connect your calendar to avoid double-booking.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-connect" onClick={() => handleConnectCalendar('microsoft')}>
                        Microsoft
                      </button>
                      <button className="btn-connect" onClick={() => handleConnectCalendar('google')}>
                        Google
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <button className="btn-primary" onClick={handleSync}>Save & Sync</button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <WorldClock timezone={timezone} />

                <div className="card">
                  <h3>Quick Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn-primary" onClick={handleCreateGroup}>+ Create New Group</button>
                    <button className="btn-ghost" onClick={handleJoinGroup}>Join Group by ID</button>
                  </div>
                </div>
              </div>
            </div>

            <h3>Your Groups</h3>
            <div className="grid-cols-2">
              {groups.map(g => (
                <div
                  key={g.id}
                  className="card"
                  style={{ cursor: 'pointer', borderLeft: '4px solid var(--secondary)' }}
                  onClick={() => { setSelectedGroup(g); setView('groups'); }}
                >
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{g.name}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {g.id}</div>
                </div>
              ))}
              {groups.length === 0 && (
                <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No groups yet. Create one to get started!</div>
              )}
            </div>
          </div>
        )}

        {view === 'groups' && selectedGroup && (
          <GroupView
            group={selectedGroup}
            currentUser={activeAccount}
            onBack={() => {
              setView('dashboard');
              setCurrentGroupMembers([]);
            }}
            onFindTimes={handleFindTimes}
            suggestions={suggestions}
            loading={loading}
            onBook={handleBookMeeting}
            onDeleteGroup={(groupId) => {
              setGroups(prev => prev.filter(g => g.id !== groupId));
              setSelectedGroup(null);
              setCurrentGroupMembers([]);
              setView('dashboard');
            }}
            onMembersLoaded={setCurrentGroupMembers}
            onOpenAssistant={(question) => {
              setAssistantQuestion(question || "Why can't we find a time that works for everyone?");
              setAssistantOpen(true);
            }}
          />
        )}

        {view === 'groups' && !selectedGroup && (
          <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
            Select a group from the dashboard.
            <br /><br />
            <button className="btn-ghost" onClick={() => setView('dashboard')}>Go to Dashboard</button>
          </div>
        )}
        {/* Footer with legal links - visible for Google verification */}
        <footer className="app-footer">
          <div className="footer-links">
            <a href="/privacy" className="footer-link">Privacy Policy</a>
            <span className="footer-divider">•</span>
            <a href="/terms" className="footer-link">Terms of Service</a>
            <span className="footer-divider">•</span>
            <a href="/how-it-works" className="footer-link">How It Works</a>
          </div>
          <div className="footer-brand">
            © 2025 Humane Calendar
          </div>
        </footer>
      </main>
      
      {/* AI Scheduling Assistant */}
      <SchedulingAssistant 
        currentUser={activeAccount}
        currentGroup={selectedGroup}
        groupMembers={currentGroupMembers}
        suggestions={suggestions}
        humaneWindows={humaneWindows}
        busySlots={myBusySlots}
        isOpen={assistantOpen}
        onOpenChange={(open) => {
          setAssistantOpen(open);
          if (!open) setAssistantQuestion(null); // Clear question when closing
        }}
        initialQuestion={assistantQuestion}
        isOrganiser={selectedGroup?.created_by === activeAccount?.username}
      />
    </div>
  )
}

export default App
