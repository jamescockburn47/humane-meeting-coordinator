import React from 'react';

export function HowItWorks({ isStandalone = false, onClose }) {
    const content = (
        <>
            <div className="how-header">
                <span className="how-icon">📅</span>
                <h2>How Humane Calendar Works</h2>
            </div>

            <p className="how-intro">
                Humane Calendar finds meeting times that <strong>respect everyone's working hours</strong> across timezones. 
                No more 6 AM calls for someone just because it's convenient for you.
            </p>

            {/* Step 1 */}
            <div className="how-section">
                <div className="step-number">1</div>
                <div className="step-content">
                    <h3>🔐 Sign In (Organizer Only)</h3>
                    <p>
                        As the meeting organizer, sign in with <strong>Google</strong> or <strong>Microsoft</strong>. 
                        This allows Humane Calendar to:
                    </p>
                    <ul>
                        <li>See when you're busy (not <em>what</em> you're doing)</li>
                        <li>Create calendar events on your behalf</li>
                        <li>Send invites to participants</li>
                        <li>Generate Google Meet or Teams links automatically</li>
                    </ul>
                    <div className="step-note">
                        💡 <strong>Guests don't need to sign in</strong> — they can just share their availability manually.
                    </div>
                </div>
            </div>

            {/* Step 2 */}
            <div className="how-section">
                <div className="step-number">2</div>
                <div className="step-content">
                    <h3>👥 Create a Scheduling Group</h3>
                    <p>
                        Create a group for your meeting (e.g., "Project Kickoff" or "Weekly Sync"). 
                        You'll get a <strong>shareable link</strong> to send to participants.
                    </p>
                    <div className="example-box">
                        <code>humanecalendar.com/join/ABC123</code>
                        <p>Share via email, Slack, WhatsApp, or any messaging app!</p>
                    </div>
                </div>
            </div>

            {/* Step 3 */}
            <div className="how-section">
                <div className="step-number">3</div>
                <div className="step-content">
                    <h3>🌍 Everyone Sets Their "Humane Hours"</h3>
                    <p>
                        Each participant defines when they're willing to meet — their <strong>Humane Hours</strong>. 
                        This is timezone-aware, so everyone sets times in their local timezone.
                    </p>
                    <div className="hours-example">
                        <div className="hours-row">
                            <span className="hours-person">🇬🇧 Sarah (London)</span>
                            <span className="hours-times">9:00 AM - 5:00 PM weekdays</span>
                        </div>
                        <div className="hours-row">
                            <span className="hours-person">🇺🇸 Mike (New York)</span>
                            <span className="hours-times">10:00 AM - 6:00 PM weekdays</span>
                        </div>
                        <div className="hours-row">
                            <span className="hours-person">🇯🇵 Yuki (Tokyo)</span>
                            <span className="hours-times">9:00 AM - 7:00 PM weekdays</span>
                        </div>
                    </div>
                    <div className="step-note">
                        ⚙️ You can set multiple windows — e.g., different hours for different days.
                    </div>
                </div>
            </div>

            {/* Step 4 */}
            <div className="how-section">
                <div className="step-number">4</div>
                <div className="step-content">
                    <h3>🔍 Find the Magic Overlap</h3>
                    <p>
                        Humane Calendar scans everyone's availability and finds times that work for <strong>all participants</strong>:
                    </p>
                    <ul>
                        <li>✓ Within everyone's Humane Hours</li>
                        <li>✓ Not during anyone's busy times (if calendars connected)</li>
                        <li>✓ Converted to each person's local timezone</li>
                    </ul>
                    <div className="overlap-visual">
                        <div className="overlap-bar">
                            <div className="overlap-segment sarah"></div>
                            <div className="overlap-segment mike"></div>
                            <div className="overlap-segment yuki"></div>
                            <div className="overlap-match">✓ 2 PM London = 9 AM NYC = 11 PM Tokyo</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 5 */}
            <div className="how-section">
                <div className="step-number">5</div>
                <div className="step-content">
                    <h3>📨 Send Invites with One Click</h3>
                    <p>
                        Pick a time slot and click <strong>"Send Invites"</strong>. Everyone receives:
                    </p>
                    <ul>
                        <li>📧 A calendar invite via email</li>
                        <li>📹 Auto-generated <strong>Google Meet</strong> or <strong>Microsoft Teams</strong> link</li>
                        <li>🕐 Time shown in their local timezone</li>
                    </ul>
                    <div className="step-note">
                        🍎 <strong>Apple Calendar users</strong> can download an .ics file that works with any calendar app.
                    </div>
                </div>
            </div>

            {/* Why It's Different */}
            <div className="how-section highlight-section">
                <h3>🌟 Why Humane Calendar?</h3>
                <div className="comparison-grid">
                    <div className="comparison-item">
                        <div className="comparison-bad">❌ Traditional Scheduling</div>
                        <p>"Let's meet at 3 PM" — but whose 3 PM?</p>
                    </div>
                    <div className="comparison-item">
                        <div className="comparison-bad">❌ Doodle/When2Meet</div>
                        <p>Everyone votes, but ignores timezone sanity</p>
                    </div>
                    <div className="comparison-item">
                        <div className="comparison-good">✅ Humane Calendar</div>
                        <p>Finds times that are reasonable for <em>everyone</em></p>
                    </div>
                </div>
            </div>

            {/* Privacy Note */}
            <div className="how-section">
                <h3>🔒 Privacy First</h3>
                <p>
                    We only see <strong>when</strong> you're busy, never <strong>what</strong> you're doing. 
                    No event titles, descriptions, or attendee lists are ever accessed.
                </p>
                <a href="/privacy" className="privacy-link">Read our full Privacy Policy →</a>
            </div>

            {/* CTA */}
            <div className="how-cta">
                <h3>Ready to schedule humanely?</h3>
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
