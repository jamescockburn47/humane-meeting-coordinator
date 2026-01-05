import { useState } from 'react';

/**
 * AvailabilityWizard - Two alternative methods for setting availability:
 * 1. Quick Wizard - 3 simple questions
 * 2. Natural Language - "I'm free weekday mornings"
 */
export function AvailabilityWizard({ onComplete, onCancel }) {
    const [mode, setMode] = useState(null); // 'wizard' or 'natural'
    
    // Wizard state
    const [step, setStep] = useState(1);
    const [preference, setPreference] = useState(null); // 'morning', 'afternoon', 'evening', 'flexible'
    const [offDays, setOffDays] = useState([]); // ['saturday', 'sunday']
    const [earliest, setEarliest] = useState('09:00');
    const [latest, setLatest] = useState('18:00');
    
    // Natural language state
    const [naturalText, setNaturalText] = useState('');
    const [parsing, setParsing] = useState(false);
    
    const days = [
        { id: 'monday', label: 'Mon' },
        { id: 'tuesday', label: 'Tue' },
        { id: 'wednesday', label: 'Wed' },
        { id: 'thursday', label: 'Thu' },
        { id: 'friday', label: 'Fri' },
        { id: 'saturday', label: 'Sat' },
        { id: 'sunday', label: 'Sun' }
    ];

    const toggleDay = (dayId) => {
        setOffDays(prev => 
            prev.includes(dayId) 
                ? prev.filter(d => d !== dayId)
                : [...prev, dayId]
        );
    };

    const generateWindowsFromWizard = () => {
        const windows = [];
        
        // Determine time range based on preference
        let start = earliest;
        let end = latest;
        
        if (preference === 'morning') {
            start = earliest;
            end = '12:00';
        } else if (preference === 'afternoon') {
            start = '12:00';
            end = '18:00';
        } else if (preference === 'evening') {
            start = '17:00';
            end = latest;
        }
        
        // Check if weekends are off
        const weekendsOff = offDays.includes('saturday') && offDays.includes('sunday');
        const weekdaysOff = offDays.filter(d => !['saturday', 'sunday'].includes(d));
        
        if (weekendsOff && weekdaysOff.length === 0) {
            // Standard weekday availability
            windows.push({ start, end, type: 'weekday' });
        } else if (offDays.length === 0) {
            // Available every day
            windows.push({ start, end, type: 'everyday' });
        } else {
            // Custom - create weekday window if not all weekdays are off
            if (weekdaysOff.length < 5) {
                windows.push({ start, end, type: 'weekday' });
            }
            // Add weekend if not off
            if (!weekendsOff) {
                windows.push({ start, end, type: 'weekend' });
            }
        }
        
        return windows;
    };

    const parseNaturalLanguage = async () => {
        setParsing(true);
        
        // Simple local parsing (no API needed for common patterns)
        const text = naturalText.toLowerCase();
        const windows = [];
        
        // Detect time preferences
        let start = '09:00';
        let end = '17:00';
        
        if (text.includes('morning')) {
            start = '08:00';
            end = '12:00';
        }
        if (text.includes('afternoon')) {
            start = '12:00';
            end = '18:00';
        }
        if (text.includes('evening')) {
            start = '17:00';
            end = '21:00';
        }
        if (text.includes('early')) {
            start = '07:00';
        }
        if (text.includes('late')) {
            end = '21:00';
        }
        
        // Detect specific times
        const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g);
        if (timeMatch && timeMatch.length >= 2) {
            // Try to parse as start-end
            const parseTime = (t) => {
                const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
                if (!m) return null;
                let hour = parseInt(m[1]);
                const min = m[2] ? parseInt(m[2]) : 0;
                const period = m[3];
                if (period === 'pm' && hour < 12) hour += 12;
                if (period === 'am' && hour === 12) hour = 0;
                return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            };
            const t1 = parseTime(timeMatch[0]);
            const t2 = parseTime(timeMatch[1]);
            if (t1 && t2) {
                start = t1;
                end = t2;
            }
        }
        
        // Detect day types
        let dayType = 'weekday';
        if (text.includes('everyday') || text.includes('every day') || text.includes('any day')) {
            dayType = 'everyday';
        } else if (text.includes('weekend')) {
            dayType = 'weekend';
        }
        
        // Handle specific days mentioned
        if (text.includes('monday') || text.includes('tuesday') || text.includes('wednesday') || 
            text.includes('thursday') || text.includes('friday')) {
            dayType = 'weekday';
        }
        
        windows.push({ start, end, type: dayType });
        
        // If they mention multiple patterns, add another window
        if (text.includes('and') || text.includes('also') || text.includes(',')) {
            if (text.includes('evening') && !end.startsWith('17') && !end.startsWith('18') && !end.startsWith('19') && !end.startsWith('20') && !end.startsWith('21')) {
                windows.push({ start: '17:00', end: '21:00', type: dayType });
            }
        }
        
        setParsing(false);
        onComplete(windows);
    };

    const handleWizardComplete = () => {
        const windows = generateWindowsFromWizard();
        onComplete(windows);
    };

    // Mode selection
    if (!mode) {
        return (
            <div className="availability-wizard">
                <div className="wizard-header">
                    <h3>Set Your Availability</h3>
                    <p>Choose how you'd like to set your available times</p>
                </div>
                
                <div className="wizard-modes">
                    <button 
                        className="mode-option"
                        onClick={() => setMode('wizard')}
                    >
                        <span className="mode-title">Quick Setup</span>
                        <span className="mode-desc">Answer 3 simple questions</span>
                    </button>
                    
                    <button 
                        className="mode-option"
                        onClick={() => setMode('natural')}
                    >
                        <span className="mode-title">Just Tell Me</span>
                        <span className="mode-desc">Describe your availability in words</span>
                    </button>
                    
                    <button 
                        className="mode-option mode-manual"
                        onClick={onCancel}
                    >
                        <span className="mode-title">Manual</span>
                        <span className="mode-desc">Set specific time windows</span>
                    </button>
                </div>
            </div>
        );
    }

    // Natural language mode
    if (mode === 'natural') {
        return (
            <div className="availability-wizard">
                <div className="wizard-header">
                    <h3>Describe Your Availability</h3>
                    <p>Just tell me when you're generally free</p>
                </div>
                
                <div className="natural-input">
                    <textarea
                        value={naturalText}
                        onChange={(e) => setNaturalText(e.target.value)}
                        placeholder="e.g., I'm free weekday mornings before 11am, and Thursday afternoons. Not available on Fridays."
                        rows={4}
                    />
                    
                    <div className="natural-examples">
                        <span className="examples-label">Examples:</span>
                        <button onClick={() => setNaturalText("Weekday mornings 9am-12pm")}>
                            Weekday mornings
                        </button>
                        <button onClick={() => setNaturalText("Any time except before 10am")}>
                            Not early mornings
                        </button>
                        <button onClick={() => setNaturalText("Flexible, 8am-8pm any day")}>
                            Very flexible
                        </button>
                    </div>
                </div>
                
                <div className="wizard-actions">
                    <button className="btn-secondary" onClick={() => setMode(null)}>
                        Back
                    </button>
                    <button 
                        className="btn-primary" 
                        onClick={parseNaturalLanguage}
                        disabled={!naturalText.trim() || parsing}
                    >
                        {parsing ? 'Processing...' : 'Set Availability'}
                    </button>
                </div>
            </div>
        );
    }

    // Wizard mode
    return (
        <div className="availability-wizard">
            <div className="wizard-progress">
                <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
                <div className="progress-line"></div>
                <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
                <div className="progress-line"></div>
                <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
            </div>

            {step === 1 && (
                <div className="wizard-step">
                    <h3>When do you prefer meetings?</h3>
                    <div className="preference-options">
                        {[
                            { id: 'morning', label: 'Mornings', desc: 'Before noon' },
                            { id: 'afternoon', label: 'Afternoons', desc: '12pm - 5pm' },
                            { id: 'evening', label: 'Evenings', desc: 'After 5pm' },
                            { id: 'flexible', label: 'Flexible', desc: 'Any time works' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                className={`preference-option ${preference === opt.id ? 'selected' : ''}`}
                                onClick={() => setPreference(opt.id)}
                            >
                                <span className="pref-label">{opt.label}</span>
                                <span className="pref-desc">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                    <div className="wizard-actions">
                        <button className="btn-secondary" onClick={() => setMode(null)}>Back</button>
                        <button 
                            className="btn-primary" 
                            onClick={() => setStep(2)}
                            disabled={!preference}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="wizard-step">
                    <h3>Any days off-limits?</h3>
                    <p className="step-hint">Click days you're NOT available</p>
                    <div className="days-grid">
                        {days.map(day => (
                            <button
                                key={day.id}
                                className={`day-option ${offDays.includes(day.id) ? 'off' : ''}`}
                                onClick={() => toggleDay(day.id)}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                    <div className="wizard-actions">
                        <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
                        <button className="btn-primary" onClick={() => setStep(3)}>Next</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="wizard-step">
                    <h3>Your time boundaries</h3>
                    <div className="time-boundaries">
                        <div className="time-field">
                            <label>Earliest start</label>
                            <select value={earliest} onChange={(e) => setEarliest(e.target.value)}>
                                {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="time-field">
                            <label>Latest finish</label>
                            <select value={latest} onChange={(e) => setLatest(e.target.value)}>
                                {['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="wizard-actions">
                        <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
                        <button className="btn-primary" onClick={handleWizardComplete}>
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
