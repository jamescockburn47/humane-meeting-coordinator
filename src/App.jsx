import { useState } from 'react'
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";
import { callMsGraph, findMeetingTimes } from "./services/graph";
import './App.css'

function App() {
  const { instance, accounts } = useMsal();
  const [attendees, setAttendees] = useState("");
  const [duration, setDuration] = useState(60);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  const activeAccount = accounts[0];

  const handleLogin = () => {
    instance.loginPopup(loginRequest).then(response => {
      // Successful login
      console.log("Login success:", response);
    }).catch(e => {
      console.error(e);
    });
  };

  const handleLogout = () => {
    instance.logoutPopup().catch(e => {
      console.error(e);
    });
  };

  const handleFindTimes = async () => {
    if (!activeAccount) return;
    setLoading(true);

    const request = {
      ...loginRequest,
      account: activeAccount
    };

    try {
      const response = await instance.acquireTokenSilent(request);
      const accessToken = response.accessToken;

      // Parse attendees
      const attendeeList = attendees.split(',').map(e => e.trim()).filter(e => e);

      // Define range: Selected date 00:00 to +3 days (or just 24h?)
      // Let's search for the selected date + 48 hours to give some options
      const start = new Date(meetingDate);
      const end = new Date(meetingDate);
      end.setDate(end.getDate() + 3);

      const data = await findMeetingTimes(accessToken, attendeeList, start, end, duration);
      setSuggestions(data.meetingTimeSuggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr + "Z"); // Incoming is UTC
    return date.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Meeting Coordinator</h1>
        <div className="auth-controls">
          {activeAccount ? (
            <div className="user-info">
              <span>Hello, {activeAccount.name}</span>
              <button onClick={handleLogout} className="btn-secondary">Logout</button>
            </div>
          ) : (
            <button onClick={handleLogin} className="btn-primary">Sign In with Microsoft</button>
          )}
        </div>
      </header>

      <main className="main-content">
        {!activeAccount && (
          <div className="welcome-card">
            <h2>Schedule Across Timezones</h2>
            <p>Find humane meeting times for everyone, instantly.</p>
            <div className="login-prompt">Please sign in to continue.</div>
          </div>
        )}

        {activeAccount && (
          <div className="scheduler-layout">
            <div className="input-section card">
              <h3>New Meeting</h3>

              <div className="form-group">
                <label>Attendees (comma separated emails)</label>
                <textarea
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  placeholder="alice@example.com, bob@example.com"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Duration (min)</label>
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleFindTimes}
                className="btn-primary full-width"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Find Humane Times'}
              </button>
            </div>

            <div className="results-section">
              {suggestions && suggestions.length === 0 && (
                <div className="info-message">No common times found in working hours. Try extending the range or changing attendees.</div>
              )}

              {suggestions && suggestions.length > 0 && (
                <div className="suggestions-list">
                  <h3>Suggested Times</h3>
                  {suggestions.map((slot, index) => (
                    <div key={index} className="suggestion-card">
                      <div className="time-display">
                        <span className="time-primary">{formatTime(slot.meetingTimeSlot.start.dateTime)}</span>
                        <span className="time-secondary">
                          {formatTime(slot.meetingTimeSlot.end.dateTime)}
                        </span>
                      </div>
                      <div className="confidence-score">
                        Match: {Math.round(slot.confidence * 100)}%
                      </div>
                      <button className="btn-sm">Select</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
