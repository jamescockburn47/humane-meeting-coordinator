import React, { useState, useEffect } from 'react';

export function WorldClock({ timezone }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const cities = [
        { name: 'You', zone: timezone },
        { name: 'London', zone: 'Europe/London' },
        { name: 'New York', zone: 'America/New_York' },
        { name: 'San Francisco', zone: 'America/Los_Angeles' },
        { name: 'Toronto', zone: 'America/Toronto' },
        { name: 'São Paulo', zone: 'America/Sao_Paulo' },
        { name: 'Berlin', zone: 'Europe/Berlin' },
        { name: 'Dubai', zone: 'Asia/Dubai' },
        { name: 'Singapore', zone: 'Asia/Singapore' },
        { name: 'Hong Kong', zone: 'Asia/Hong_Kong' },
        { name: 'Tokyo', zone: 'Asia/Tokyo' },
        { name: 'Sydney', zone: 'Australia/Sydney' },
        { name: 'Auckland', zone: 'Pacific/Auckland' },
        { name: 'Bangalore', zone: 'Asia/Kolkata' },
    ];

    return (
        <div className="card world-clock-card">
            <h3 style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Global Tech Hubs</h3>
            <div className="world-clock-grid">
                {cities.map(city => {
                    let cityTime;
                    try {
                        cityTime = new Date(time.toLocaleString("en-US", { timeZone: city.zone }));
                    } catch {
                        cityTime = time;
                    }
                    const hour = cityTime.getHours();
                    const isDay = hour >= 6 && hour < 20;
                    const isWorkHours = hour >= 9 && hour < 18;

                    return (
                        <div key={city.name} className={`clock-item ${isDay ? 'daytime' : 'nighttime'} ${isWorkHours ? 'work-hours' : ''}`}>
                            <div className="clock-city">{city.name}</div>
                            <div className="clock-time">
                                {cityTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="clock-indicator">{isDay ? '☀' : '☾'}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
