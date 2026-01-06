import React from 'react';

export function StoryPage() {
    return (
        <div className="story-page">
            <div className="story-page-header">
                <a href="/" className="story-back-link">
                    <img src="/logo.png" alt="Humane Calendar" className="story-logo" />
                </a>
            </div>
            
            <div className="story-page-content">
                <div className="story-badge">
                    <span className="vibe-icon">⚡</span> A Vibe Coding Experiment
                </div>
                
                <h1>The Story</h1>
                
                <div className="story-intro">
                    <p className="story-lead">
                        Built in 48 hours by a litigator who doesn't write code.
                    </p>
                </div>

                <div className="story-body">
                    <h2>The Problem</h2>
                    <p>
                        I'm a commercial litigator based in London. In my spare time, I've joined the 
                        fast-growing amateur global legal tech community — a world of Slack channels, 
                        Discord servers, and WhatsApp groups where lawyers, developers, and AI enthusiasts 
                        share ideas across every timezone.
                    </p>
                    <p>
                        The community is incredibly enthusiastic. Thanks to <strong>Jamie Tso</strong> for 
                        setting up the Vibe Coding group and spearheading — it's brought together people 
                        from Hong Kong, Sydney, Singapore, Toronto, New York, San Francisco, London, and 
                        beyond. Everyone wants to jump on calls, share demos, and collaborate.
                    </p>
                    <p>
                        But coordinating times is a nightmare. Traditional scheduling tools don't work 
                        when everyone has day jobs and wildly different schedules. Some show overlap 
                        but don't send invites. Others require voting polls that take days. I was 
                        spending more time scheduling than actually talking.
                    </p>

                    <h2>The Experiment</h2>
                    <p>
                        So I decided to test something: <strong>can one non-technical professional build 
                        useful working software to fix a specific problem?</strong>
                    </p>
                    <p>
                        I described my problem to <strong>Cursor</strong> (an AI-powered code editor), 
                        using <strong>Claude Opus 4.5</strong> as the underlying model. I iterated through 
                        prompts, debugged errors I didn't fully understand, and kept pushing until 
                        something worked.
                    </p>
                    <p>
                        48 hours later, Humane Calendar existed.
                    </p>

                    <div className="story-highlight">
                        <h3>What is "Vibe Coding"?</h3>
                        <p>
                            Vibe coding is building software by describing what you want to an AI, 
                            then iterating until it works. No computer science degree. No bootcamp. 
                            Just a clear problem, stubbornness, and a willingness to read error messages 
                            you don't fully understand.
                        </p>
                        <p>
                            It's a fundamentally different relationship with technology — you're the 
                            product owner, the tester, and the user. The AI is the developer.
                        </p>
                    </div>

                    <h2>Security Approach</h2>
                    <p>
                        I've taken a security-conscious approach to permissions. Humane Calendar only 
                        asks for access to:
                    </p>
                    <ul className="security-list">
                        <li><strong>Create calendar events</strong> — so we can send meeting invites on your behalf</li>
                        <li><strong>Check when you're free/busy</strong> (optional) — so we can avoid double-booking you</li>
                    </ul>
                    <p>
                        We don't read your event titles, attendees, or any other calendar details. 
                        Just whether a time slot is blocked or free.
                    </p>

                    <div className="story-warning">
                        <h3>⚠️ Beta Caveat</h3>
                        <p>
                            I'm still learning about the security side of building web applications. 
                            This is a proof of concept, not battle-tested enterprise software.
                        </p>
                        <p>
                            <strong>Please don't sign up with your work calendar</strong> or any account 
                            you're concerned about. Use a personal calendar you're comfortable experimenting with.
                        </p>
                        <p>
                            <strong>Microsoft work/school accounts:</strong> If you use Microsoft 365 through 
                            your employer (e.g., a law firm), their IT policies may block sign-in from 
                            unverified apps. Use a personal Microsoft account (outlook.com, hotmail.com) 
                            or Google instead.
                        </p>
                        <p>
                            <strong>Beta test at your own risk.</strong>
                        </p>
                    </div>

                    <h2>The Test</h2>
                    <p>
                        This project is a proof of concept. The question isn't just "can it be built?" — 
                        it's "can it be <em>reliable</em>?"
                    </p>
                    <p>
                        The closed beta phase will show whether AI-assisted coding is inherently buggy, 
                        or whether vibe-coded software can genuinely solve real problems for real people.
                    </p>
                    <p>
                        If you find bugs (you probably will), that's part of the experiment. 
                        Report them and help prove — or disprove — that this approach works.
                    </p>

                    <h2>The Pricing Philosophy</h2>
                    <p>
                        When Humane Calendar launches properly, there will be a small fee to cover 
                        hosting and API costs. This isn't intended as a profit exercise.
                    </p>
                    <p>
                        Vibe coding is quick, but it still requires expertise — understanding the problem, 
                        knowing how to prompt effectively, testing relentlessly, and iterating until 
                        it actually works. The time saved on traditional development gets reinvested 
                        into making the product better.
                    </p>
                    <p>
                        <strong>My ethos is simple: keep user costs as low as realistically possible.</strong> 
                        If the servers cost £X and the AI APIs cost £Y, I'll charge enough to cover that 
                        plus a small buffer — not 10x markup for "SaaS margins." The goal is sustainability, 
                        not extraction.
                    </p>
                    <div className="story-highlight pricing-note">
                        <p>
                            <strong>During beta:</strong> Completely free.<br />
                            <strong>After launch:</strong> Small fee to cover real costs.<br />
                            <strong>Forever:</strong> No investor pressure to maximize revenue.
                        </p>
                    </div>

                    <h2>The AI Difference</h2>
                    <p>
                        Most scheduling tools are essentially just shared calendars. You still have 
                        to figure out the best time yourself. Humane Calendar uses AI to do the thinking:
                    </p>
                    <ul className="ai-list">
                        <li><strong>Analyzes availability</strong> across any number of people and timezones</li>
                        <li><strong>Suggests specific changes</strong> when no perfect time exists</li>
                        <li><strong>Explains group dynamics</strong> — who's blocking, what would help</li>
                        <li><strong>Scores fairness</strong> so the same people don't always get bad times</li>
                    </ul>
                    <p>
                        It's not just a calendar grid. It's an intelligent assistant that helps you 
                        coordinate without the back-and-forth.
                    </p>

                    <h2>Why "Humane"?</h2>
                    <p>
                        Most scheduling tools treat people like machines. If the calendar says "free," 
                        they'll book you at 6 AM or 10 PM without a second thought.
                    </p>
                    <p>
                        Humane Calendar is built on a different premise: <strong>just because you're 
                        technically available doesn't mean you should take that meeting.</strong> 
                        It respects sleep cycles, work-life boundaries, and the reality that global 
                        collaboration shouldn't require someone to sacrifice their wellbeing.
                    </p>

                    <div className="story-signature-box">
                        <p className="story-signature">
                            — James Cockburn<br />
                            <span className="story-role">Litigator, London</span><br />
                            <span className="story-role">Amateur Legal Tech Enthusiast</span>
                        </p>
                        <div className="story-author-links">
                            <a href="https://james.cockburn.io" target="_blank" rel="noopener noreferrer" className="author-link">
                                🌐 james.cockburn.io
                            </a>
                            <a href="https://www.linkedin.com/in/james-cockburn/" target="_blank" rel="noopener noreferrer" className="author-link">
                                💼 LinkedIn
                            </a>
                            <a href="https://github.com/jamescockburn47/humane-meeting-coordinator" target="_blank" rel="noopener noreferrer" className="author-link">
                                📦 GitHub
                            </a>
                        </div>
                    </div>
                </div>

                <div className="story-cta">
                    <a href="/" className="btn-primary btn-large">Try Humane Calendar</a>
                    <a href="/how-it-works" className="btn-ghost">See How It Works</a>
                    <a href="https://github.com/jamescockburn47/humane-meeting-coordinator" target="_blank" rel="noopener noreferrer" className="btn-ghost">
                        View Source on GitHub
                    </a>
                </div>
            </div>
        </div>
    );
}
