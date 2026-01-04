import React, { useState } from 'react';

export function GuestJoinModal({ onClose, onJoin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [windows, setWindows] = useState([
    { start: "09:00", end: "17:00", type: "weekday" }
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email) {
      alert('Please enter your name and email');
      return;
    }
    onJoin({ name, email, groupCode, timezone, windows });
  };

  const addWindow = () => {
    setWindows([...windows, { start: "09:00", end: "17:00", type: "weekday" }]);
  };

  const removeWindow = (idx) => {
    setWindows(windows.filter((_, i) => i !== idx));
  };

  const updateWindow = (idx, field, value) => {
    const newWindows = [...windows];
    newWindows[idx][field] = value;
    setWindows(newWindows);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content guest-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2>Join as Guest</h2>
        <p className="modal-subtitle">
          No calendar sync required. Just tell us when you're available.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Group Invite Code (Optional)</label>
            <input
              type="text"
              value={groupCode}
              onChange={e => setGroupCode(e.target.value)}
              placeholder="Enter code to join a group"
            />
          </div>

          <div className="form-group">
            <label>Your Timezone</label>
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

          <div className="form-group">
            <label>Your Availability Windows</label>
            <p className="help-text">When are you generally available for meetings?</p>
            
            {windows.map((win, idx) => (
              <div key={idx} className="window-row">
                <select
                  value={win.type}
                  onChange={e => updateWindow(idx, 'type', e.target.value)}
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
                  onChange={e => updateWindow(idx, 'start', e.target.value)}
                />
                <span className="time-separator">to</span>
                <input
                  type="time"
                  value={win.end}
                  onChange={e => updateWindow(idx, 'end', e.target.value)}
                />
                {windows.length > 1 && (
                  <button type="button" className="btn-remove" onClick={() => removeWindow(idx)}>
                    ×
                  </button>
                )}
              </div>
            ))}
            
            <button type="button" className="btn-add-window" onClick={addWindow}>
              + Add Another Window
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Join
            </button>
          </div>
        </form>

        <div className="calendar-note">
          <span className="info-icon">ℹ️</span>
          You can connect your calendar later for automatic availability sync.
        </div>
      </div>
    </div>
  );
}
