import React from 'react';

export function HowItWorks({ isStandalone = false, onClose }) {
    const content = (
        <>
            <div className="how-header">
                <h2>How Humane Calendar Works</h2>
            </div>

            <p className="how-intro">
                <strong>Scheduling for global teams and side projects.</strong>
                <br /><br />
                Each person picks the times that work for them — in their own timezone. 
                You see where everyone overlaps, then send the invite.
            </p>

            {/* The Problem */}
            <div className="how-section problem-section">
                <h3>The Problem with Other Tools</h3>
                <div className="problem-grid">
                    <div className="problem-item">
                        <strong>Calendly / Doodle</strong>
                        <p>Host guesses a few times. Invitees vote. Often none work.</p>
                    </div>
                    <div className="problem-item">
                        <strong>Reclaim / Clockwise</strong>
                        <p>Scans your calendar. Assumes empty = available. Books 6 AM calls.</p>
                    </div>
                    <div className="problem-item">
                        <strong>When2Meet</strong>
                        <p>Everyone paints their slots. But then you're stuck with manual booking.</p>
                    </div>
                </div>
            </div>

            {/* Step 1 */}
            <div className="how-section">
                <div className="step-number">1</div>
                <div className="step-content">
                    <h3>Each Person Picks Their Own Slots</h3>
                    <p>
                        You send a link. Each invitee defines when they're genuinely available — 
                        <strong> in their own timezone</strong>.
                    </p>
                    <p>
                        Early morning before the family wakes up? Mark it. 
                        Evenings off-limits? Leave it blank. 
                        Different hours on different days? Set multiple windows.
                    </p>
                    <div className="step-note highlight">
                        No one is forced into a slot they didn't offer.
                    </div>
                </div>
            </div>

            {/* Step 2 */}
            <div className="how-section">
                <div className="step-number">2</div>
                <div className="step-content">
                    <h3>With or Without Calendar Access</h3>
                    <p>Invitees choose how to participate:</p>
                    <div className="mode-cards">
                        <div className="mode-card guest">
                            <h4>Guest Mode</h4>
                            <p>No login. Just select the times you're free.</p>
                            <span className="mode-tag">Zero data access</span>
                        </div>
                        <div className="mode-card calendar">
                            <h4>Calendar Mode</h4>
                            <p>Connect to see your busy times. You still choose which slots to offer.</p>
                            <span className="mode-tag">Free/Busy only</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 3 */}
            <div className="how-section">
                <div className="step-number">3</div>
                <div className="step-content">
                    <h3>See the Overlap. Send the Invite.</h3>
                    <p>
                        Once everyone has submitted their availability, you see where the schedules align.
                        Pick a slot, add a title, and send — a calendar invite goes out to everyone with 
                        a Google Meet or Teams link included.
                    </p>
                    <div className="auto-magic-list">
                        <div className="magic-item">
                            <span>Calendar invite sent from your account</span>
                        </div>
                        <div className="magic-item">
                            <span>Video link auto-generated</span>
                        </div>
                        <div className="magic-item">
                            <span>Times shown in each person's local timezone</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Who Needs to Login */}
            <div className="how-section highlight-section">
                <h3>Who Needs to Log In?</h3>
                <div className="login-requirements">
                    <div className="login-card host">
                        <div className="login-header">
                            <strong>The Host</strong>
                        </div>
                        <p>Logs in with Google or Microsoft to:</p>
                        <ul>
                            <li>Create the calendar event</li>
                            <li>Generate the video link</li>
                            <li>Send invites from their account</li>
                        </ul>
                    </div>
                    <div className="login-card guest">
                        <div className="login-header">
                            <strong>Invitees</strong>
                        </div>
                        <p>Can participate with no account:</p>
                        <ul>
                            <li>Click the invite link</li>
                            <li>Select available times</li>
                            <li>Done</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Comparison */}
            <div className="how-section">
                <h3>What Makes This Different</h3>
                <div className="comparison-table">
                    <div className="comp-row header">
                        <div className="comp-tool">Tool</div>
                        <div className="comp-approach">Invitees pick slots?</div>
                        <div className="comp-problem">Sends invite?</div>
                    </div>
                    <div className="comp-row">
                        <div className="comp-tool">Doodle / Rallly</div>
                        <div className="comp-approach">No — host picks options</div>
                        <div className="comp-problem">No</div>
                    </div>
                    <div className="comp-row">
                        <div className="comp-tool">Reclaim / Clockwise</div>
                        <div className="comp-approach">No — algorithm decides</div>
                        <div className="comp-problem">Yes</div>
                    </div>
                    <div className="comp-row">
                        <div className="comp-tool">When2Meet</div>
                        <div className="comp-approach">Yes</div>
                        <div className="comp-problem">No</div>
                    </div>
                    <div className="comp-row featured">
                        <div className="comp-tool"><strong>Humane Calendar</strong></div>
                        <div className="comp-approach"><strong>Yes</strong></div>
                        <div className="comp-problem"><strong>Yes</strong></div>
                    </div>
                </div>
            </div>

            {/* Use Cases */}
            <div className="how-section">
                <h3>Built For</h3>
                <div className="use-cases-grid">
                    <div className="use-case">
                        <strong>Global Teams</strong>
                        <p>London, New York, Tokyo — everyone's hours respected</p>
                    </div>
                    <div className="use-case">
                        <strong>Side Projects</strong>
                        <p>Coordinate around day jobs and family life</p>
                    </div>
                    <div className="use-case">
                        <strong>Remote Collaborators</strong>
                        <p>No guessing across time differences</p>
                    </div>
                    <div className="use-case">
                        <strong>Freelancers</strong>
                        <p>Control exactly when clients can reach you</p>
                    </div>
                </div>
            </div>

            {/* Privacy */}
            <div className="how-section">
                <h3>Privacy</h3>
                <p className="privacy-subtitle">
                    We know this might sit alongside your day job calendar. That's why:
                </p>
                <div className="privacy-points">
                    <div className="privacy-point">
                        <div>
                            <strong>Free/Busy Only</strong>
                            <p>
                                If you connect a calendar, we see that you're busy at 2 PM — 
                                not what the meeting is or who's in it.
                            </p>
                        </div>
                    </div>
                    <div className="privacy-point">
                        <div>
                            <strong>No Account Required</strong>
                            <p>
                                Invitees can use Guest Mode. No login, no calendar access, 
                                just pick your times.
                            </p>
                        </div>
                    </div>
                    <div className="privacy-point">
                        <div>
                            <strong>Transient Data</strong>
                            <p>
                                We find the match, send the invite, then get out of the way. 
                                Availability data auto-deletes after 30 days.
                            </p>
                        </div>
                    </div>
                </div>
                <a href="/privacy" className="privacy-link">Read our full Privacy Policy</a>
            </div>

            {/* CTA */}
            <div className="how-cta">
                <h3>Ready to try it?</h3>
                <p className="cta-tagline">Free for individuals and small teams.</p>
                <a href="/" className="btn-primary btn-large">Get Started</a>
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
