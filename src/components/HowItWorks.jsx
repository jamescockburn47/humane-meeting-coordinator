import React from 'react';

export function HowItWorks({ isStandalone = false, onClose }) {
    const content = (
        <>
            <div className="how-header">
                <h2>How Humane Calendar Works</h2>
                <p className="how-tagline">
                    Traditional tools fill your calendar. <strong>We protect your energy.</strong>
                </p>
            </div>

            <p className="how-intro">
                Most scheduling tools ask: <em>"Is this slot empty?"</em>
                <br /><br />
                We ask: <strong>"Is this slot healthy?"</strong>
                <br /><br />
                Even if your calendar shows "free" at 6 AM or 10 PM, that doesn't mean you 
                should take a meeting then. Humane Calendar respects sleep cycles, work-life 
                boundaries, and timezone differences — so you can schedule like a human, not a machine.
            </p>

            {/* AI-Powered Features */}
            <div className="how-section ai-features">
                <h3>🤖 AI-Powered Scheduling Intelligence</h3>
                <p className="ai-intro">
                    Unlike traditional scheduling tools, Humane Calendar uses AI to actively help you find the right time.
                </p>
                
                <div className="ai-feature-grid">
                    <div className="ai-feature-card">
                        <div className="ai-feature-icon">🔍</div>
                        <h4>Smart Availability Analysis</h4>
                        <p>AI scans everyone's availability windows and calendar conflicts, then instantly identifies times that work across all timezones.</p>
                    </div>
                    
                    <div className="ai-feature-card">
                        <div className="ai-feature-icon">💡</div>
                        <h4>Intelligent Suggestions</h4>
                        <p>When no perfect time exists, the AI explains exactly why and suggests specific changes each person could make.</p>
                    </div>
                    
                    <div className="ai-feature-card">
                        <div className="ai-feature-icon">⚖️</div>
                        <h4>Fairness Scoring</h4>
                        <p>The AI calculates timezone fairness so the same people don't always get stuck with early morning or late night calls.</p>
                    </div>
                    
                    <div className="ai-feature-card">
                        <div className="ai-feature-icon">📊</div>
                        <h4>Group Insights</h4>
                        <p>Understand your group at a glance — timezone spread, who hasn't set availability, and what's blocking the perfect time.</p>
                    </div>
                </div>
            </div>

            {/* Why Different */}
            <div className="how-section calendly-compare">
                <h3>Why Humane Calendar is Different</h3>
                
                <div className="compare-cards">
                    <div className="compare-card old-way">
                        <div className="compare-label">Traditional Scheduling</div>
                        <ul>
                            <li>You send a link and say "you figure it out"</li>
                            <li>Burden on the guest to find a good time</li>
                            <li>Group meetings require voting polls</li>
                            <li>Empty slot = available (even 6 AM)</li>
                            <li>No intelligence — just availability grids</li>
                        </ul>
                    </div>
                    
                    <div className="compare-card new-way">
                        <div className="compare-label">The Humane Way</div>
                        <ul>
                            <li>AI analyzes everyone's wellness windows</li>
                            <li>You show leadership by finding the best time</li>
                            <li>Group overlap calculated instantly — no polls</li>
                            <li>Flags times that damage sleep or balance</li>
                            <li>Guests join with zero friction</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Core Principles */}
            <div className="how-section principles">
                <h3>Four Things We Do Differently</h3>
                
                <div className="principle-grid">
                    <div className="principle-card">
                        <div className="principle-num">1</div>
                        <h4>Wellness, Not Just Availability</h4>
                        <p>
                            Other tools treat you like a machine. If you're technically free at 9 PM, 
                            they offer that slot. We flag and penalize times that ruin sleep or work-life 
                            balance — even if the calendar is "free."
                        </p>
                    </div>
                    
                    <div className="principle-card">
                        <div className="principle-num">2</div>
                        <h4>AI-Powered Decision Making</h4>
                        <p>
                            Traditional tools are passive — you send a link and hope for the best. 
                            Our AI says: "I've analyzed your timezones and availability. Here's the 
                            best time for everyone." It shows leadership and care.
                        </p>
                    </div>
                    
                    <div className="principle-card">
                        <div className="principle-num">3</div>
                        <h4>Instant Group Analysis</h4>
                        <p>
                            Multi-person meetings usually require voting polls where everyone 
                            picks manually. Our AI reads the data and finds the overlap instantly. 
                            No voting, no waiting — just the right answer.
                        </p>
                    </div>
                    
                    <div className="principle-card">
                        <div className="principle-num">4</div>
                        <h4>Frictionless Guest Mode</h4>
                        <p>
                            Guests can accept an invite without creating an account (zero friction) 
                            OR connect their calendar for AI optimization (high value). 
                            We meet the user where they are.
                        </p>
                    </div>
                </div>
            </div>

            {/* How It Works Steps */}
            <div className="how-section">
                <h3>The Three-Step Flow</h3>
                
                <div className="flow-steps">
                    <div className="flow-step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h4>Everyone Sets Their "Green Zones"</h4>
                            <p>
                                You send a link. Each person defines when they're genuinely available — 
                                <strong> in their own timezone</strong>.
                            </p>
                            <p className="step-detail">
                                Early morning before the family wakes up? Mark it. 
                                Evenings off-limits? Leave it blank. 
                                No one is forced into a slot they didn't offer.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flow-step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h4>AI Finds the Overlap</h4>
                            <p>
                                Our AI analyzes everyone's availability and timezone, 
                                then highlights times that work for all — with fairness scoring 
                                so the same people don't always get the bad slots.
                            </p>
                            <p className="step-detail">
                                If there's no perfect time, the AI explains why and suggests 
                                what each person could change to make it work.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flow-step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h4>One-Click Booking</h4>
                            <p>
                                Pick a slot, add a title, and send. A calendar invite goes out 
                                to everyone — with a Google Meet or Teams link included.
                            </p>
                            <div className="auto-magic-list">
                                <div className="magic-item">Calendar invite sent from your account</div>
                                <div className="magic-item">Video link auto-generated</div>
                                <div className="magic-item">Times shown in each person's local timezone</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Guest vs Calendar Mode */}
            <div className="how-section">
                <h3>Two Ways to Participate</h3>
                <div className="mode-cards">
                    <div className="mode-card guest">
                        <h4>Guest Mode</h4>
                        <p>No login required. Just click the times you're free.</p>
                        <span className="mode-tag">Zero data access</span>
                    </div>
                    <div className="mode-card calendar">
                        <h4>Calendar Mode</h4>
                        <p>Connect to overlay your "Free/Busy" status. You still choose which slots to offer.</p>
                        <span className="mode-tag">See conflicts automatically</span>
                    </div>
                </div>
            </div>

            {/* What Makes Us Different */}
            <div className="how-section">
                <h3>What Makes Us Different</h3>
                <div className="diff-grid">
                    <div className="diff-item">
                        <div className="diff-check">✓</div>
                        <div>
                            <strong>Invitees pick their own slots</strong>
                            <p>No guessing what works — everyone defines their availability</p>
                        </div>
                    </div>
                    <div className="diff-item">
                        <div className="diff-check">✓</div>
                        <div>
                            <strong>No voting or polling required</strong>
                            <p>AI calculates overlap instantly across any group size</p>
                        </div>
                    </div>
                    <div className="diff-item">
                        <div className="diff-check">✓</div>
                        <div>
                            <strong>Sends real calendar invites</strong>
                            <p>With video links included — no manual follow-up needed</p>
                        </div>
                    </div>
                    <div className="diff-item">
                        <div className="diff-check">✓</div>
                        <div>
                            <strong>Wellness-aware scheduling</strong>
                            <p>Respects sleep cycles and work-life balance across timezones</p>
                        </div>
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
                <h3>Privacy by Design</h3>
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
                            <strong>Minimal Retention</strong>
                            <p>
                                We find the match, send the invite, then get out of the way. 
                                You can delete your data at any time from your profile.
                            </p>
                        </div>
                    </div>
                </div>
                <a href="/privacy" className="privacy-link">Read our full Privacy Policy</a>
            </div>

            {/* CTA */}
            <div className="how-cta">
                <h3>Ready to schedule like a human?</h3>
                <p className="cta-tagline">Free for individuals and small teams.</p>
                <div className="cta-buttons">
                    <a href="/" className="btn-primary btn-large">Get Started</a>
                    <a href="/story" className="btn-ghost">Read the Story</a>
                </div>
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
