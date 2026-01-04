import React from 'react';

export function PrivacyPolicy({ onClose, onDeleteData, userEmail }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content privacy-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <div className="privacy-header">
                    <span className="privacy-shield">🛡️</span>
                    <h2>Privacy & Data Protection</h2>
                </div>

                <p className="privacy-intro">
                    Humane Calendar is built with <strong>privacy-by-design</strong> principles. 
                    We collect the absolute minimum data required to help you schedule meetings.
                </p>

                <div className="privacy-section">
                    <h3>📊 What We Collect</h3>
                    <div className="data-table">
                        <div className="data-row collected">
                            <span className="data-icon">✓</span>
                            <div>
                                <strong>Busy/Free Time Slots</strong>
                                <p>Only the start and end times when you're busy. Example: "Busy 9:00-10:00 AM"</p>
                            </div>
                        </div>
                        <div className="data-row collected">
                            <span className="data-icon">✓</span>
                            <div>
                                <strong>Email Address</strong>
                                <p>Used to identify you within groups and send calendar invites.</p>
                            </div>
                        </div>
                        <div className="data-row collected">
                            <span className="data-icon">✓</span>
                            <div>
                                <strong>Display Name & Timezone</strong>
                                <p>So group members can identify you and we can show times correctly.</p>
                            </div>
                        </div>
                        <div className="data-row collected">
                            <span className="data-icon">✓</span>
                            <div>
                                <strong>Availability Preferences</strong>
                                <p>Your "Humane Hours" windows (e.g., "9 AM - 5 PM weekdays").</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="privacy-section">
                    <h3>🚫 What We DO NOT Collect</h3>
                    <div className="data-table">
                        <div className="data-row not-collected">
                            <span className="data-icon">✗</span>
                            <div>
                                <strong>Event Titles or Subjects</strong>
                                <p>We never see "Dentist Appointment" or "Meeting with Client".</p>
                            </div>
                        </div>
                        <div className="data-row not-collected">
                            <span className="data-icon">✗</span>
                            <div>
                                <strong>Event Descriptions or Notes</strong>
                                <p>No content, agendas, or attachments are accessed.</p>
                            </div>
                        </div>
                        <div className="data-row not-collected">
                            <span className="data-icon">✗</span>
                            <div>
                                <strong>Attendee Lists</strong>
                                <p>We don't know who else is in your meetings.</p>
                            </div>
                        </div>
                        <div className="data-row not-collected">
                            <span className="data-icon">✗</span>
                            <div>
                                <strong>Locations or Meeting Links</strong>
                                <p>No addresses, Zoom links, or conference details.</p>
                            </div>
                        </div>
                        <div className="data-row not-collected">
                            <span className="data-icon">✗</span>
                            <div>
                                <strong>Passwords or Payment Info</strong>
                                <p>We don't store any credentials. OAuth tokens are session-only.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="privacy-section">
                    <h3>🔐 How We Protect Your Data</h3>
                    <ul className="security-list">
                        <li>
                            <strong>Encrypted in Transit:</strong> All data transmitted via HTTPS/TLS 1.3
                        </li>
                        <li>
                            <strong>Encrypted at Rest:</strong> Database encrypted using AES-256
                        </li>
                        <li>
                            <strong>Row-Level Security:</strong> Database policies restrict access to your data
                        </li>
                        <li>
                            <strong>No Third-Party Sharing:</strong> We never sell or share your data
                        </li>
                        <li>
                            <strong>Session-Only Tokens:</strong> Calendar access tokens are never stored permanently
                        </li>
                        <li>
                            <strong>Hosted in EU/US:</strong> Data stored in SOC 2 Type II compliant data centers
                        </li>
                    </ul>
                </div>

                <div className="privacy-section">
                    <h3>⏱️ Data Retention</h3>
                    <ul className="retention-list">
                        <li><strong>Availability Cache:</strong> Automatically deleted after 30 days</li>
                        <li><strong>Profile Data:</strong> Retained until you delete your account</li>
                        <li><strong>Group Membership:</strong> Removed when you leave or group is deleted</li>
                    </ul>
                </div>

                <div className="privacy-section">
                    <h3>✋ Your Rights</h3>
                    <p>Under GDPR, CCPA, and similar regulations, you have the right to:</p>
                    <ul className="rights-list">
                        <li><strong>Access:</strong> Request a copy of your data</li>
                        <li><strong>Rectification:</strong> Correct inaccurate data</li>
                        <li><strong>Erasure:</strong> Delete all your data ("Right to be Forgotten")</li>
                        <li><strong>Portability:</strong> Export your data in a standard format</li>
                        <li><strong>Object:</strong> Opt out of any data processing</li>
                    </ul>
                </div>

                {userEmail && (
                    <div className="privacy-actions">
                        <h3>🗑️ Delete My Data</h3>
                        <p>
                            This will permanently remove your profile, availability data, and group memberships. 
                            This action cannot be undone.
                        </p>
                        <button 
                            className="btn-danger" 
                            onClick={() => {
                                if (confirm('Are you sure you want to delete ALL your data? This cannot be undone.')) {
                                    onDeleteData();
                                }
                            }}
                        >
                            Delete All My Data
                        </button>
                    </div>
                )}

                <div className="privacy-footer">
                    <div className="compliance-badges">
                        <span className="badge">GDPR Ready</span>
                        <span className="badge">CCPA Ready</span>
                        <span className="badge">SOC 2 Infrastructure*</span>
                    </div>
                    <p className="compliance-note">
                        *Built to meet regulatory standards. Not yet formally certified.
                    </p>
                    <p className="contact-info">
                        Questions? Contact: <a href="mailto:privacy@humanecalendar.com">privacy@humanecalendar.com</a>
                    </p>
                    <p className="last-updated">
                        Last updated: January 2026
                    </p>
                </div>
            </div>
        </div>
    );
}
