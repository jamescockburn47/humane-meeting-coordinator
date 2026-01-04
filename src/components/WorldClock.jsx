import React, { useState, useEffect } from 'react';

export function WorldClock({ timezone }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const cities = [
        { name: 'Local', zone: timezone },
        { name: 'London', zone: 'Europe/London' },
        { name: 'New York', zone: 'America/New_York' },
        { name: 'Tokyo', zone: 'Asia/Tokyo' },
    ];

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3>Global Time</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {cities.map(city => {
                    const cityTime = new Date(time.toLocaleString("en-US", { timeZone: city.zone }));
                    const isDay = cityTime.getHours() > 8 && cityTime.getHours() < 18;

                    return (
                        <div key={city.name} style={{
                            borderLeft: `2px solid ${isDay ? 'var(--primary)' : 'var(--border)'}`,
                            paddingLeft: '0.75rem'
                        }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{city.name}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 500, color: isDay ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                {cityTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    )
                })}
            </div>
            {/* Visual Flair imitating the logo */}
            <div style={{ alignSelf: 'center', marginTop: '1rem', opacity: 0.3 }}>
                <img src="/logo.png" style={{ width: '40px', height: 'auto', filter: 'grayscale(100%)' }} />
            </div>
        </div>
    );
}
