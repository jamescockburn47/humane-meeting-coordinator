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
import { AdminDashboard } from './components/AdminDashboard';

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
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [myBusySlots, setMyBusySlots] = useState([]); // For calendar overlay

  // New: Multiple Windows State
  const [humaneWindows, setHumaneWindows] = useState([
    { start: "09:00", end: "17:00", type: "weekday" } // Default
  ]);

  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [syncStatus, setSyncStatus] = useState("Idle");

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

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
      
      // Fetch Profile Logic
      getProfile(acc.username).then(profile => {
        if (profile) {
          if (profile.humane_windows && profile.humane_windows.length > 0) {
            setHumaneWindows(profile.humane_windows);
          }
          if (profile.timezone) setTimezone(profile.timezone);
        }

        // Ensure profile exists immediately
        updateProfile(
          acc.username,
          acc.name,
          profile?.timezone || timezone,
          "09:00", // Legacy
          "17:00", // Legacy
          profile?.humane_windows || humaneWindows
        );
      });
      fetchMyGroups(acc.username);
    }
  }, [accounts]);

  // Load guest session from Supabase (only email stored in localStorage)
  useEffect(() => {
    const guestEmail = localStorage.getItem('guestEmail');
    if (guestEmail && !activeAccount && accounts.length === 0) {
      // Fetch full profile from Supabase
      getProfile(guestEmail).then(profile => {
        if (profile) {
          const guestUser = {
            username: profile.email,
            name: profile.display_name,
            provider: 'guest'
          };
          setActiveAccount(guestUser);
          if (profile.humane_windows && profile.humane_windows.length > 0) {
            setHumaneWindows(profile.humane_windows);
          }
          if (profile.timezone) setTimezone(profile.timezone);
          fetchMyGroups(profile.email);
        } else {
          // Profile not found in Supabase, clear local session
          localStorage.removeItem('guestEmail');
        }
      });
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

      // Initial Sync
      await updateProfile(googleUser.username, googleUser.name, timezone, "09:00", "17:00", humaneWindows);
      fetchMyGroups(googleUser.username);
    },
    scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
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

    // Only store email in localStorage as session identifier
    localStorage.setItem('guestEmail', guestData.email);

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
    
    // Clear local state first
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
      } catch (e) {
        console.log("Microsoft logout:", e);
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
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        });
        
        const graphUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}&$select=start,end`;
        const fetchRes = await fetch(graphUrl, {
          headers: { Authorization: `Bearer ${response.accessToken}` }
        });
        const data = await fetchRes.json();
        
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
      } else {
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: activeAccount
        });

        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 14);

        const graphUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}&$select=start,end`;

        const fetchRes = await fetch(graphUrl, {
          headers: { Authorization: `Bearer ${response.accessToken}` }
        });
        const data = await fetchRes.json();

        if (data.value) {
          await syncAvailability(activeAccount.username, data.value);
        }
      }

      await updateProfile(
        activeAccount.username,
        activeAccount.name,
        timezone,
        humaneWindows[0]?.start || "09:00", // Fallback for legacy
        humaneWindows[0]?.end || "17:00",   // Fallback for legacy
        humaneWindows // New JSONB
      );

      setSyncStatus("Synced!");
      setTimeout(() => setSyncStatus("Idle"), 3000);
    } catch (err) {
      console.error(err);
      setSyncStatus("Failed");
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

  const handleFindTimes = async (groupId, startStr, endStr) => {
    setLoading(true);
    try {
      const members = await getGroupMembers(groupId);
      const memberEmails = members.map(m => m.email);

      const start = new Date(startStr);
      const end = new Date(endStr);
      end.setHours(23, 59, 59); // End of the last day

      const busySlots = await getBusySlotsForUsers(memberEmails, start, end);
      const slots = findCommonHumaneSlots(members, busySlots, startStr, endStr, 60);
      setSuggestions(slots);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleBookMeeting = async (groupId, slot, subject, description) => {
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
      const members = await getGroupMembers(groupId);
      const memberEmails = members.map(m => m.email);

      if (activeAccount.provider === 'google') {
        await createGoogleEvent(
          googleAccessToken,
          subject,
          description,
          slot.start,
          slot.end,
          memberEmails
        );
      } else if (activeAccount.provider === 'microsoft') {
        const tokenResponse = await instance.acquireTokenSilent({ 
          ...loginRequest, 
          account: accounts[0] 
        });
        await createMeeting(
          tokenResponse.accessToken,
          subject,
          description,
          slot.start,
          slot.end,
          memberEmails
        );
      }

      alert("✅ Meeting invites sent! All attendees will receive a calendar invitation.");
      setSuggestions([]);
    } catch (e) {
      console.error("Booking error:", e);
      alert("Booking Failed: " + e.message);
      throw e;
    }
  };

  // --- RENDER ---

  /* Blocking Login Screen Removed for Guest Mode */

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
        <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
      )}

      <main className="main-area">
        {view === 'dashboard' && (
          <div className="animate-fade-in">
            <h2>Dashboard</h2>

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

                <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Your Availability Windows</label>

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
                </div>

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
            onBack={() => setView('dashboard')}
            onFindTimes={handleFindTimes}
            suggestions={suggestions}
            loading={loading}
            onBook={handleBookMeeting}
          />
        )}

        {view === 'groups' && !selectedGroup && (
          <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
            Select a group from the dashboard.
            <br /><br />
            <button className="btn-ghost" onClick={() => setView('dashboard')}>Go to Dashboard</button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
