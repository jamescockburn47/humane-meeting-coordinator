import React, { useState, useEffect } from 'react';

export function WorldClock({ timezone }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const cities = [
        { name: 'You', zone: timezone, emoji: '📍' },
        { name: 'London', zone: 'Europe/London', emoji: '🇬🇧' },
        { name: 'New York', zone: 'America/New_York', emoji: '🇺🇸' },
        { name: 'San Francisco', zone: 'America/Los_Angeles', emoji: '🌉' },
        { name: 'Toronto', zone: 'America/Toronto', emoji: '🇨🇦' },
        { name: 'São Paulo', zone: 'America/Sao_Paulo', emoji: '🇧🇷' },
        { name: 'Berlin', zone: 'Europe/Berlin', emoji: '🇩🇪' },
        { name: 'Dubai', zone: 'Asia/Dubai', emoji: '🇦🇪' },
        { name: 'Singapore', zone: 'Asia/Singapore', emoji: '🇸🇬' },
        { name: 'Hong Kong', zone: 'Asia/Hong_Kong', emoji: '🇭🇰' },
        { name: 'Tokyo', zone: 'Asia/Tokyo', emoji: '🇯🇵' },
        { name: 'Sydney', zone: 'Australia/Sydney', emoji: '🇦🇺' },
        { name: 'Auckland', zone: 'Pacific/Auckland', emoji: '🇳🇿' },
        { name: 'Bangalore', zone: 'Asia/Kolkata', emoji: '🇮🇳' },
    ];

    return (
        <div className="card world-clock-card">
            <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>🌍 Global Tech Hubs</h3>
            <div className="world-clock-grid">
                {cities.map(city => {
                    let cityTime;
                    try {
                        cityTime = new Date(time.toLocaleString("en-US", { timeZone: city.zone }));
                    } catch {
                        cityTime = time;
                    }
                    const hour = cityTime.getHours();
                    const isDay = hour >= 7 && hour < 19;
                    const isWorkHours = hour >= 9 && hour < 18;

                    return (
                        <div key={city.name} className={`clock-item ${isWorkHours ? 'work-hours' : ''} ${!isDay ? 'night' : ''}`}>
                            <span className="clock-emoji">{city.emoji}</span>
                            <div className="clock-info">
                                <div className="clock-city">{city.name}</div>
                                <div className="clock-time">
                                    {cityTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
