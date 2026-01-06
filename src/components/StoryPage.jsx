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
                        But coordinating times is a nightmare. Calendly doesn't work when everyone has 
                        day jobs and wildly different schedules. When2Meet shows overlap but doesn't 
                        send invites. I was spending more time scheduling than actually talking.
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
                    </div>
                </div>

                <div className="story-cta">
                    <a href="/" className="btn-primary btn-large">Try Humane Calendar</a>
                    <a href="/how-it-works" className="btn-ghost">See How It Works</a>
                </div>
            </div>
        </div>
    );
}
