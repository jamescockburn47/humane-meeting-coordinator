import React from 'react';

export function HowItWorks({ isStandalone = false, onClose }) {
    const content = (
        <>
            <div className="how-header">
                <span className="how-icon">📅</span>
                <h2>How Humane Calendar Works</h2>
            </div>

            <p className="how-intro">
                <strong>You define the "When." We handle the "How."</strong>
                <br /><br />
                Think of it as <strong>"When2Meet with a Brain"</strong> — everyone picks their own times, 
                and we actually book the meeting.
            </p>

            {/* The Problem */}
            <div className="how-section problem-section">
                <h3>❌ The Problem with Every Other Tool</h3>
                <div className="problem-grid">
                    <div className="problem-item">
                        <strong>Calendly / Doodle</strong>
                        <p>Host guesses times. "None of these work for me."</p>
                    </div>
                    <div className="problem-item">
                        <strong>Reclaim / Clockwise</strong>
                        <p>Assumes empty = available. Books 6 AM calls.</p>
                    </div>
                    <div className="problem-item">
                        <strong>When2Meet</strong>
                        <p>Finds overlap but doesn't book anything.</p>
                    </div>
                </div>
            </div>

            {/* Step 1 - No Guessing */}
            <div className="how-section">
                <div className="step-number">1</div>
                <div className="step-content">
                    <h3>🎯 No "Guess the Slot" Games</h3>
                    <p>
                        Most schedulers force the host to guess times that might work. 
                        <strong> We flip the script.</strong>
                    </p>
                    <p>
                        You simply send a link, and invitees define their own <strong>"Green Zones"</strong>—whether 
                        that's 7 AM before the kids wake up or a strictly "weekend-only" window.
                    </p>
                    <div className="step-note highlight">
                        💡 <strong>No one is forced into a slot they didn't offer.</strong>
                    </div>
                </div>
            </div>

            {/* Step 2 - Smart Overlays */}
            <div className="how-section">
                <div className="step-number">2</div>
                <div className="step-content">
                    <h3>🔍 Smart Overlays (With or Without Your Calendar)</h3>
                    <p>
                        Invitees can connect their calendar to automatically block out busy times, 
                        or just join as a Guest and manually paint their availability.
                    </p>
                    <div className="mode-cards">
                        <div className="mode-card guest">
                            <div className="mode-icon">👤</div>
                            <h4>Guest Mode</h4>
                            <p>No login required. Just click the times you're free.</p>
                            <span className="mode-tag">Zero data access</span>
                        </div>
                        <div className="mode-card calendar">
                            <div className="mode-icon">📆</div>
                            <h4>Calendar Mode</h4>
                            <p>We overlay your "Free/Busy" status so you don't double-book.</p>
                            <span className="mode-tag">You still have final say</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 3 - Auto Magic */}
            <div className="how-section">
                <div className="step-number">3</div>
                <div className="step-content">
                    <h3>✨ The "Auto-Magic" Finish</h3>
                    <p>
                        Once the group (or the required subset) overlaps, we don't just send an email saying 
                        "Tuesday looks good." <strong>We book it.</strong>
                    </p>
                    <div className="auto-magic-list">
                        <div className="magic-item">
                            <span className="magic-icon">📧</span>
                            <span>Calendar invite sent to everyone</span>
                        </div>
                        <div className="magic-item">
                            <span className="magic-icon">📹</span>
                            <span>Google Meet or Teams link auto-generated</span>
                        </div>
                        <div className="magic-item">
                            <span className="magic-icon">🌍</span>
                            <span>Times shown in each person's timezone</span>
                        </div>
                        <div className="magic-item">
                            <span className="magic-icon">✅</span>
                            <span>Accept/Decline with one click</span>
                        </div>
                    </div>
                    <div className="step-note">
                        No admin work required. Zero email ping-pong.
                    </div>
                </div>
            </div>

            {/* Who Needs to Login */}
            <div className="how-section highlight-section">
                <h3>🔑 Who Needs to Log In?</h3>
                <div className="login-requirements">
                    <div className="login-card host">
                        <div className="login-header">
                            <span className="login-icon">👑</span>
                            <strong>The Host (You)</strong>
                        </div>
                        <p>Logs in with Google or Microsoft to:</p>
                        <ul>
                            <li>Create the calendar event</li>
                            <li>Generate the video link</li>
                            <li>Send invites from your account</li>
                        </ul>
                    </div>
                    <div className="login-card guest">
                        <div className="login-header">
                            <span className="login-icon">👥</span>
                            <strong>Everyone Else</strong>
                        </div>
                        <p>Can join with zero account setup:</p>
                        <ul>
                            <li>Click the invite link</li>
                            <li>Select their available times</li>
                            <li>Done!</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Competitive Comparison */}
            <div className="how-section">
                <h3>🌟 The Only Tool That Does Both</h3>
                <div className="comparison-table">
                    <div className="comp-row header">
                        <div className="comp-tool">Tool</div>
                        <div className="comp-approach">Participant-Led?</div>
                        <div className="comp-problem">Auto-Books?</div>
                    </div>
                    <div className="comp-row">
                        <div className="comp-tool">Doodle / Rallly</div>
                        <div className="comp-approach">❌ Host picks options</div>
                        <div className="comp-problem">❌ No</div>
                    </div>
                    <div className="comp-row">
                        <div className="comp-tool">Reclaim / Clockwise</div>
                        <div className="comp-approach">❌ Algorithm decides</div>
                        <div className="comp-problem">✅ Yes</div>
                    </div>
                    <div className="comp-row">
                        <div className="comp-tool">When2Meet</div>
                        <div className="comp-approach">✅ Yes</div>
                        <div className="comp-problem">❌ No</div>
                    </div>
                    <div className="comp-row featured">
                        <div className="comp-tool"><strong>Humane Calendar</strong></div>
                        <div className="comp-approach">✅ Yes</div>
                        <div className="comp-problem">✅ Yes</div>
                    </div>
                </div>
                <p className="comparison-summary">
                    <strong>We bridge the gap</strong> between <em>Participant-Led Availability</em> (the human part) 
                    and <em>Automated Logistics</em> (the robot part).
                </p>
            </div>

            {/* Perfect For */}
            <div className="how-section">
                <h3>🎯 Built For</h3>
                <div className="use-cases-grid">
                    <div className="use-case">
                        <span className="use-icon">🌍</span>
                        <strong>Global Teams</strong>
                        <p>Respects everyone's local hours</p>
                    </div>
                    <div className="use-case">
                        <span className="use-icon">🚀</span>
                        <strong>Side Projects</strong>
                        <p>Coordinate around day jobs</p>
                    </div>
                    <div className="use-case">
                        <span className="use-icon">👨‍👩‍👧‍👦</span>
                        <strong>Family & Friends</strong>
                        <p>Find time that works for all</p>
                    </div>
                    <div className="use-case">
                        <span className="use-icon">💼</span>
                        <strong>Freelancers</strong>
                        <p>Control when clients book you</p>
                    </div>
                </div>
            </div>

            {/* Privacy */}
            <div className="how-section">
                <h3>🔒 Privacy: Minimum Viable Access</h3>
                <p className="privacy-subtitle">
                    <strong>We respect the "Side Project" boundary.</strong> 
                    We know this calendar might live alongside your day job.
                </p>
                <div className="privacy-points">
                    <div className="privacy-point">
                        <span className="privacy-icon">👁️</span>
                        <div>
                            <strong>Free/Busy Only (The "What," Not the "Why")</strong>
                            <p>
                                If you connect a calendar, we see <em>that</em> you're busy at 2 PM, 
                                but never <em>what</em> you're doing. "Doctor's Appt" and "Strategy Meeting" 
                                remain invisible to us.
                            </p>
                        </div>
                    </div>
                    <div className="privacy-point">
                        <span className="privacy-icon">🚫</span>
                        <div>
                            <strong>No-Link Option</strong>
                            <p>
                                Don't want to connect a calendar at all? Use Guest Mode to manually 
                                select your times. Zero data access required.
                            </p>
                        </div>
                    </div>
                    <div className="privacy-point">
                        <span className="privacy-icon">⏳</span>
                        <div>
                            <strong>Transient Data</strong>
                            <p>
                                We process your availability to find the match, generate the invite, 
                                and then get out of the way. We're a bridge, not a database of your life.
                            </p>
                        </div>
                    </div>
                </div>
                <a href="/privacy" className="privacy-link">Read our full Privacy Policy →</a>
            </div>

            {/* CTA */}
            <div className="how-cta">
                <h3>Ready to schedule humanely?</h3>
                <p className="cta-tagline">Everyone opts in. The meeting books itself.</p>
                <a href="/" className="btn-primary btn-large">Get Started — It's Free</a>
            </div>
        </>
    );

    // Standalone page mode (for direct URL access)
    if (isStandalone) {
        return (
            <div className="how-page-standalone">
                <div className="how-page-header">
                    <a href="/" className="how-back-link">
                        <img src="/logo.png" alt="Humane Calendar" className="how-logo" />
                    </a>
                </div>
                <div className="how-page-content">
                    {content}
                </div>
            </div>
        );
    }

    // Modal mode (for in-app access)
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content how-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                {content}
            </div>
        </div>
    );
}
