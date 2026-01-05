import React from 'react';

export function HowItWorks({ isStandalone = false, onClose }) {
    const content = (
        <>
            <div className="how-header">
                <span className="how-icon">📅</span>
                <h2>How Humane Calendar Works</h2>
            </div>

            <p className="how-intro">
                <strong>You set the rules. We find the match.</strong>
                <br /><br />
                Standard schedulers assume that if your calendar is empty, you're available. 
                We know that's not true—especially for side projects and global teams.
            </p>

            {/* The Problem */}
            <div className="how-section problem-section">
                <h3>❌ The Problem with "Smart" Schedulers</h3>
                <p>
                    Tools like Calendly, Reclaim, and Outlook scan your calendar and assume 
                    <strong> empty = available</strong>. But just because you're "free" at 6 AM 
                    doesn't mean you <em>want</em> to meet then.
                </p>
                <p>
                    Doodle lets hosts pick a few time slots and asks everyone to vote—but what if 
                    <strong> none of those options work</strong>? You're back to email ping-pong.
                </p>
            </div>

            {/* Step 1 - Active Consent */}
            <div className="how-section">
                <div className="step-number">1</div>
                <div className="step-content">
                    <h3>🎨 Invitees Define Their Own "Go Zones"</h3>
                    <p>
                        Instead of the host guessing random times, <strong>Humane Calendar</strong> asks 
                        each participant to highlight the windows that actually work for them.
                    </p>
                    <div className="example-scenarios">
                        <div className="scenario">
                            <span className="scenario-icon">🌅</span>
                            <p>Happy to hop on a call at 6 AM before the kids wake up? <strong>Mark it green.</strong></p>
                        </div>
                        <div className="scenario">
                            <span className="scenario-icon">🌙</span>
                            <p>Prefer to keep evenings strictly offline? <strong>Leave it blank.</strong></p>
                        </div>
                        <div className="scenario">
                            <span className="scenario-icon">🌍</span>
                            <p>Different hours for different days? <strong>Set multiple windows.</strong></p>
                        </div>
                    </div>
                    <div className="step-note highlight">
                        💡 <strong>You are in control, not the algorithm.</strong>
                    </div>
                </div>
            </div>

            {/* Step 2 - Privacy */}
            <div className="how-section">
                <div className="step-number">2</div>
                <div className="step-content">
                    <h3>🔒 Privacy by Design (No "Creepy" Access)</h3>
                    <p>
                        Because invitees <strong>proactively select</strong> their slots, we don't need 
                        invasive access to scour your entire calendar history.
                    </p>
                    <ul>
                        <li>You share only the windows you want us to see for <em>this specific meeting</em></li>
                        <li>Your dentist appointments and private notes remain 100% invisible</li>
                        <li>No event titles, descriptions, or attendee lists are ever accessed</li>
                        <li>Calendar connection is <strong>optional</strong> for invitees</li>
                    </ul>
                    <div className="privacy-highlight">
                        <span className="shield-icon">🛡️</span>
                        <p>
                            <strong>"We don't track your life; we only process the time slots you explicitly hand to us."</strong>
                        </p>
                    </div>
                </div>
            </div>

            {/* Step 3 - Auto Booking */}
            <div className="how-section">
                <div className="step-number">3</div>
                <div className="step-content">
                    <h3>⚡ Instant Consensus & Auto-Booking</h3>
                    <p>
                        Our engine overlays everyone's "Go Zones" to find the perfect overlap—or the 
                        best possible time for the core group.
                    </p>
                    <ul>
                        <li>✅ <strong>Full matches</strong> — Times that work for everyone</li>
                        <li>⚠️ <strong>Quorum matches</strong> — Best options when full consensus isn't possible</li>
                        <li>📧 <strong>One-click invites</strong> — Calendar event sent to all attendees</li>
                        <li>📹 <strong>Video link included</strong> — Google Meet or Teams, automatically</li>
                    </ul>
                    <div className="step-note">
                        No email tag. No "let me check." Just a booked meeting.
                    </div>
                </div>
            </div>

            {/* Competitive Comparison */}
            <div className="how-section highlight-section">
                <h3>🌟 Why We're Different</h3>
                <div className="comparison-table">
                    <div className="comp-row header">
                        <div className="comp-tool">Tool</div>
                        <div className="comp-approach">Approach</div>
                        <div className="comp-problem">The Problem</div>
                    </div>
                    <div className="comp-row">
                        <div className="comp-tool">
                            <span className="tool-icon">📊</span>
                            Reclaim / Clockwise
                        </div>
                        <div className="comp-approach">Passive Scanning</div>
                        <div className="comp-problem">Assumes empty = available. Books 6 AM calls.</div>
                    </div>
                    <div className="comp-row">
                        <div className="comp-tool">
                            <span className="tool-icon">📋</span>
                            Doodle / Rallly
                        </div>
                        <div className="comp-approach">Host-Centric Polling</div>
                        <div className="comp-problem">"None of these options work for me."</div>
                    </div>
                    <div className="comp-row">
                        <div className="comp-tool">
                            <span className="tool-icon">🎨</span>
                            When2Meet
                        </div>
                        <div className="comp-approach">Participant Painting</div>
                        <div className="comp-problem">Finds overlap but doesn't book the meeting.</div>
                    </div>
                    <div className="comp-row featured">
                        <div className="comp-tool">
                            <span className="tool-icon">📅</span>
                            <strong>Humane Calendar</strong>
                        </div>
                        <div className="comp-approach"><strong>Active Consent + Auto-Execute</strong></div>
                        <div className="comp-problem">✅ Everyone opts in. Meeting is booked automatically.</div>
                    </div>
                </div>
            </div>

            {/* Perfect For */}
            <div className="how-section">
                <h3>🎯 Perfect For</h3>
                <div className="use-cases-grid">
                    <div className="use-case">
                        <span className="use-icon">🌍</span>
                        <strong>Global Teams</strong>
                        <p>Respects everyone's local working hours</p>
                    </div>
                    <div className="use-case">
                        <span className="use-icon">🚀</span>
                        <strong>Side Projects</strong>
                        <p>Coordinate around day jobs & life</p>
                    </div>
                    <div className="use-case">
                        <span className="use-icon">👨‍👩‍👧‍👦</span>
                        <strong>Family & Friends</strong>
                        <p>Find time that works for everyone</p>
                    </div>
                    <div className="use-case">
                        <span className="use-icon">💼</span>
                        <strong>Freelancers</strong>
                        <p>Control when clients can book you</p>
                    </div>
                </div>
            </div>

            {/* Video Links */}
            <div className="how-section">
                <h3>📹 Automatic Video Meeting Links</h3>
                <p>
                    The <strong>organizer</strong> connects their Google or Microsoft account. 
                    When they send invites, video links are generated automatically:
                </p>
                <div className="integration-grid">
                    <div className="integration-item">
                        <span className="integration-icon">🔴</span>
                        <div>
                            <strong>Google Users</strong>
                            <p>Google Meet link included</p>
                        </div>
                    </div>
                    <div className="integration-item">
                        <span className="integration-icon">🔵</span>
                        <div>
                            <strong>Microsoft Users</strong>
                            <p>Teams link included</p>
                        </div>
                    </div>
                    <div className="integration-item">
                        <span className="integration-icon">🍎</span>
                        <div>
                            <strong>Apple/Other</strong>
                            <p>Download .ics file</p>
                        </div>
                    </div>
                </div>
                <div className="step-note">
                    💡 <strong>Invitees don't need to connect anything</strong> — they just set their availability.
                </div>
            </div>

            {/* Privacy Footer */}
            <div className="how-section">
                <h3>🔐 Trust & Security</h3>
                <ul>
                    <li>✓ Encrypted in transit and at rest (TLS 1.3, AES-256)</li>
                    <li>✓ Availability data auto-deleted after 30 days</li>
                    <li>✓ GDPR & CCPA ready — delete your data anytime</li>
                    <li>✓ No selling or sharing of data. Ever.</li>
                </ul>
                <a href="/privacy" className="privacy-link">Read our full Privacy Policy →</a>
            </div>

            {/* CTA */}
            <div className="how-cta">
                <h3>Ready to schedule humanely?</h3>
                <p className="cta-tagline">Your time. Your terms. Your meeting.</p>
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
