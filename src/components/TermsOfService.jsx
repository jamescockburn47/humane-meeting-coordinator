import { useEffect } from 'react';

export function TermsOfService({ onBack }) {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="legal-page">
            <div className="legal-header">
                {onBack && (
                    <button onClick={onBack} className="back-link">
                        ← Back to App
                    </button>
                )}
                <h1>Terms of Service</h1>
                <p className="last-updated">Last updated: January 2025</p>
            </div>

            <div className="legal-content">
                <section>
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using Humane Calendar ("the Service"), you agree to be bound by these 
                        Terms of Service. If you do not agree to these terms, please do not use the Service.
                    </p>
                </section>

                <section>
                    <h2>2. Description of Service</h2>
                    <p>
                        Humane Calendar is a scheduling coordination tool that helps groups find meeting times 
                        across different timezones. The Service allows users to:
                    </p>
                    <ul>
                        <li>Set their available meeting hours</li>
                        <li>Create and join scheduling groups</li>
                        <li>Find overlapping availability with other users</li>
                        <li>Optionally connect calendars to check for conflicts</li>
                        <li>Send calendar invites with video conferencing links</li>
                    </ul>
                </section>

                <section>
                    <h2>3. User Accounts</h2>
                    <p>
                        You may use the Service by signing in with a Google or Microsoft account, or by 
                        joining as a guest. You are responsible for:
                    </p>
                    <ul>
                        <li>Maintaining the security of your account credentials</li>
                        <li>All activities that occur under your account</li>
                        <li>Providing accurate availability information</li>
                    </ul>
                </section>

                <section>
                    <h2>4. Acceptable Use</h2>
                    <p>You agree NOT to:</p>
                    <ul>
                        <li>Use the Service for any unlawful purpose</li>
                        <li>Attempt to gain unauthorised access to other users' data</li>
                        <li>Interfere with or disrupt the Service</li>
                        <li>Use automated systems to access the Service without permission</li>
                        <li>Share invite links with malicious intent</li>
                    </ul>
                </section>

                <section>
                    <h2>5. Calendar Integration</h2>
                    <p>
                        When you connect a Google or Microsoft calendar:
                    </p>
                    <ul>
                        <li>We access only free/busy information, not event details</li>
                        <li>We may create calendar events on your behalf when you book a meeting</li>
                        <li>You can disconnect your calendar at any time</li>
                        <li>See our <a href="/privacy">Privacy Policy</a> for details on data handling</li>
                    </ul>
                </section>

                <section>
                    <h2>6. Intellectual Property</h2>
                    <p>
                        The Service, including its design, features, and content, is owned by Humane Calendar. 
                        You retain ownership of any data you provide (such as availability preferences).
                    </p>
                </section>

                <section>
                    <h2>7. Disclaimer of Warranties</h2>
                    <p>
                        The Service is provided "as is" without warranties of any kind, either express or implied. 
                        We do not guarantee that:
                    </p>
                    <ul>
                        <li>The Service will be uninterrupted or error-free</li>
                        <li>Meeting times suggested will be accurate in all circumstances</li>
                        <li>Calendar integrations will always sync correctly</li>
                    </ul>
                </section>

                <section>
                    <h2>8. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, Humane Calendar shall not be liable for any 
                        indirect, incidental, special, or consequential damages arising from your use of 
                        the Service, including but not limited to missed meetings or scheduling conflicts.
                    </p>
                </section>

                <section>
                    <h2>9. Changes to Terms</h2>
                    <p>
                        We may update these Terms from time to time. We will notify users of significant 
                        changes by posting a notice on the Service. Continued use after changes constitutes 
                        acceptance of the new terms.
                    </p>
                </section>

                <section>
                    <h2>10. Termination</h2>
                    <p>
                        We reserve the right to suspend or terminate your access to the Service at any time, 
                        for any reason, including violation of these Terms. You may stop using the Service 
                        and request deletion of your data at any time.
                    </p>
                </section>

                <section>
                    <h2>11. Governing Law</h2>
                    <p>
                        These Terms shall be governed by and construed in accordance with the laws of 
                        England and Wales, without regard to its conflict of law provisions.
                    </p>
                </section>

                <section>
                    <h2>12. Contact</h2>
                    <p>
                        For questions about these Terms, please contact us through the app or visit 
                        our website at <a href="https://www.humanecalendar.com">humanecalendar.com</a>.
                    </p>
                </section>
            </div>
        </div>
    );
}
