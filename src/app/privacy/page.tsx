import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'EHA Connect Privacy Policy',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blur Circles */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E31837] blur-[150px] opacity-10 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500 blur-[120px] opacity-5 rounded-full -translate-x-1/3 translate-y-1/3" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pt-32 pb-16">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-text-primary mb-2 tracking-tight">
          EHA Connect
        </h1>
        <h2 className="font-heading text-xl sm:text-2xl font-semibold text-text-primary mb-1">
          Privacy Policy
        </h2>
        <p className="text-text-muted text-sm font-sans mb-8">
          Effective Date: February 27, 2026
        </p>

        <div className="prose prose-invert max-w-none space-y-6 text-text-secondary font-sans text-sm leading-relaxed">
          <p>
            Elite Hoops Association (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the EHA Connect platform (the &ldquo;Platform&rdquo;), which includes the EHA Connect website, mobile application, and all associated services. This Privacy Policy describes how we collect, use, disclose, and protect personal information when you access or use the Platform.
          </p>
          <p>
            By accessing or using the Platform, you acknowledge that you have read, understood, and agree to the practices described in this Privacy Policy. If you do not agree to this Privacy Policy, you must immediately cease use of the Platform. This Privacy Policy is incorporated by reference into our{' '}
            <a href="/terms" className="text-[#E31837] hover:text-text-primary transition-colors">Terms of Service</a>.
          </p>

          {/* Section 1 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">1. Information We Collect</h3>
            <p>We collect the following categories of personal information:</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">1.1 Information You Provide Directly</h4>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and password (or Google OAuth credentials).</li>
              <li><strong>Athlete Profile Data:</strong> For player profiles, we collect the athlete&apos;s first and last name, date of birth, graduation year, school name, height, weight, positions, academic information (GPA), and photographs.</li>
              <li><strong>Parent/Guardian Information:</strong> For accounts managing minor athletes, we collect the parent or legal guardian&apos;s name, email address, and relationship to the athlete.</li>
              <li><strong>Payment Information:</strong> When you purchase a subscription, payment information (credit card number, billing address) is collected and processed directly by Stripe, Inc. We do not store full payment card details on our servers.</li>
              <li><strong>Recruiting Communications:</strong> When you use the recruiting email feature, we collect the content of messages sent to college coaches and maintain a log of recruiting correspondence.</li>
              <li><strong>Club and Team Information:</strong> Program directors and coaches provide organization names, team rosters, and event registration details.</li>
              <li><strong>Media Uploads:</strong> Photographs, highlight video links, and other media files uploaded to the Platform.</li>
            </ul>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">1.2 Information Collected Automatically</h4>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Device and Browser Information:</strong> We collect information about the device and browser you use to access the Platform, including device type, operating system, browser type, and screen resolution.</li>
              <li><strong>Usage Data:</strong> We collect information about how you interact with the Platform, including pages visited, features used, and the date and time of your activity.</li>
              <li><strong>IP Address:</strong> Your Internet Protocol address is collected automatically when you access the Platform.</li>
              <li><strong>Cookies and Similar Technologies:</strong> We use cookies and similar technologies for authentication, session management, and to remember your preferences. See Section 7 for more information.</li>
            </ul>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">1.3 Information from Third Parties</h4>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Google OAuth:</strong> If you sign in with Google, we receive your name, email address, and profile picture from Google.</li>
              <li><strong>Exposure Events:</strong> We may receive team rosters, game schedules, and event information from the Exposure Events tournament management system for events administered through their platform.</li>
              <li><strong>Stripe:</strong> We receive confirmation of payment status and subscription information from Stripe, Inc. We do not receive or store your full payment card details.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">2. How We Use Your Information</h3>
            <p>We use the personal information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Platform Operations:</strong> To create and maintain your account, manage athlete profiles, process subscriptions, and deliver the core features of the Platform.</li>
              <li><strong>Athletic Performance Tracking:</strong> To record, display, and aggregate game statistics, leaderboard rankings, and career performance data for athletes participating in EHA events.</li>
              <li><strong>Recruiting Services:</strong> To facilitate communication between athletes (or their parents/guardians) and college coaching staff through the Platform&apos;s recruiting tools.</li>
              <li><strong>Event Administration:</strong> To manage tournament registrations, game schedules, live scoring, bracket management, and results reporting.</li>
              <li><strong>Communications:</strong> To send transactional emails related to your account, including guardian invitations, recruiting correspondence, password resets, and subscription confirmations.</li>
              <li><strong>Security and Fraud Prevention:</strong> To protect the Platform and its users from unauthorized access, fraud, and other harmful activity.</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal obligations.</li>
              <li><strong>Platform Improvement:</strong> To analyze usage patterns and improve the functionality, performance, and user experience of the Platform.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">3. How We Share Your Information</h3>
            <p>We do not sell your personal information. We may share your information in the following limited circumstances:</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">3.1 Athlete Profile Visibility</h4>
            <p>Athlete profiles are visible to other Platform users based on the following access rules:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Basic profile information (name, school, graduation year, position) is publicly visible on the Platform.</li>
              <li>Detailed performance statistics are accessible to the athlete&apos;s guardians, club directors with the athlete on their roster, users with an active subscription, and Platform administrators.</li>
              <li>Approved college recruiters may view athlete profiles for legitimate recruiting purposes as described in our Terms of Service.</li>
            </ul>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">3.2 Service Providers</h4>
            <p>We share information with third-party service providers who perform services on our behalf, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Stripe, Inc.:</strong> Payment processing for subscriptions and one-time purchases.</li>
              <li><strong>Resend:</strong> Transactional email delivery.</li>
              <li><strong>Vercel:</strong> Web application hosting and file storage.</li>
              <li><strong>Cloudinary:</strong> Image processing and delivery.</li>
              <li><strong>NeonDB:</strong> Database hosting.</li>
              <li><strong>Exposure Events:</strong> Tournament and event management synchronization.</li>
            </ul>
            <p className="mt-2">These service providers are contractually obligated to use your information only to perform the services we have engaged them to provide and in accordance with applicable data protection laws.</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">3.3 Legal Requirements</h4>
            <p>We may disclose your information if required to do so by law, court order, or governmental authority, or if we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a valid legal process.</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">3.4 Business Transfers</h4>
            <p>In the event of a merger, acquisition, reorganization, sale of assets, or bankruptcy, your personal information may be transferred as part of that transaction. We will notify you of any such change in ownership or control of your personal information.</p>
          </section>

          {/* Section 4 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">4. Children&apos;s Privacy (COPPA Compliance)</h3>
            <p>The Platform is designed to serve youth athletes. We take the privacy of children seriously and are committed to compliance with the Children&apos;s Online Privacy Protection Act (&ldquo;COPPA&rdquo;), 15 U.S.C. §§ 6501–6506.</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">4.1 Parental Consent Required</h4>
            <p>The Platform does not permit children under the age of thirteen (13) to create accounts independently. All accounts for minor athletes must be created and managed by a parent or legal guardian. By creating an athlete profile for a minor, the parent or guardian provides verifiable parental consent for the collection and use of the minor&apos;s information as described in this Privacy Policy.</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">4.2 Information Collected from Minors</h4>
            <p>For minor athletes, we collect only the information reasonably necessary to provide the Platform&apos;s services, including the athlete&apos;s name, school, graduation year, physical measurements, athletic statistics, and photographs provided by the parent or guardian.</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">4.3 Parental Rights</h4>
            <p>Parents and guardians have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Review the personal information collected about their child;</li>
              <li>Request correction of inaccurate information;</li>
              <li>Request deletion of their child&apos;s personal information and athlete profile;</li>
              <li>Refuse further collection or use of their child&apos;s information.</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, please contact us at the address provided in Section 11.</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">4.4 Unauthorized Collection</h4>
            <p>If we become aware that we have collected personal information from a child under thirteen (13) without verifiable parental consent, we will promptly delete such information from our records.</p>
          </section>

          {/* Section 5 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">5. Data Retention</h3>
            <p>We retain your personal information for as long as your account is active or as needed to provide you with the Platform&apos;s services. Specific retention periods include:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Active Accounts:</strong> Personal information and athlete profile data are retained for the duration of your active account.</li>
              <li><strong>Cancelled Subscriptions:</strong> Account data is retained but access to premium features is suspended. Profile data remains visible per the Platform&apos;s access rules.</li>
              <li><strong>Terminated Accounts:</strong> Athlete profile data is retained for ninety (90) days following termination, after which it may be permanently deleted.</li>
              <li><strong>Game Statistics:</strong> Athletic performance data and game statistics may be retained indefinitely as part of the Platform&apos;s historical records, even after account deletion, in anonymized or aggregated form.</li>
              <li><strong>Legal and Compliance Records:</strong> Certain records, including Terms of Service acceptance logs and payment transaction records, may be retained as required by applicable law or for legitimate business purposes.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">6. Data Security</h3>
            <p>We implement commercially reasonable administrative, technical, and physical safeguards to protect your personal information from unauthorized access, disclosure, alteration, or destruction. These measures include:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Encryption of data in transit using TLS/SSL;</li>
              <li>Secure password hashing using bcrypt;</li>
              <li>JWT-based session management with signed tokens;</li>
              <li>Role-based access controls limiting data visibility;</li>
              <li>Secure storage of authentication tokens on mobile devices;</li>
              <li>Regular review of security practices and access controls.</li>
            </ul>
            <p className="mt-3">No method of transmission over the Internet or method of electronic storage is completely secure. While we strive to protect your personal information, we cannot guarantee its absolute security. You are responsible for maintaining the confidentiality of your account credentials.</p>
          </section>

          {/* Section 7 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">7. Cookies and Tracking Technologies</h3>
            <p>The Platform uses the following cookies and similar technologies:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Authentication Cookies:</strong> Essential cookies that maintain your signed-in session. These are strictly necessary for the Platform to function and cannot be disabled.</li>
              <li><strong>CSRF Protection Cookies:</strong> Security cookies that protect against cross-site request forgery attacks.</li>
              <li><strong>Preference Cookies:</strong> Cookies that remember your display preferences (such as theme selection).</li>
              <li><strong>Preview Cookies:</strong> Cookies used to manage early access and preview functionality during pre-launch periods.</li>
            </ul>
            <p className="mt-3">The Platform does not use third-party advertising cookies or tracking pixels. We do not engage in behavioral advertising or cross-site tracking.</p>
          </section>

          {/* Section 8 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">8. Your Rights and Choices</h3>
            <p>Depending on your jurisdiction, you may have the following rights regarding your personal information:</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">8.1 Access and Portability</h4>
            <p>You have the right to request a copy of the personal information we hold about you. You may access and download your athlete profile data at any time through the Platform.</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">8.2 Correction</h4>
            <p>You have the right to request correction of inaccurate or incomplete personal information. You may update your account information and athlete profiles directly through the Platform.</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">8.3 Deletion</h4>
            <p>You have the right to request deletion of your personal information. Deletion requests will be processed within thirty (30) days. Certain data may be retained as required by law or as described in Section 5.</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">8.4 Account Cancellation</h4>
            <p>You may cancel your account at any time through your account settings or by contacting us in writing. Upon cancellation, your data will be handled in accordance with the retention periods described in Section 5.</p>

            <h4 className="font-semibold text-text-primary mt-4 mb-2">8.5 Communication Preferences</h4>
            <p>You may manage your notification preferences through the Platform&apos;s settings. Transactional communications necessary for account operation (such as password resets and subscription confirmations) cannot be opted out of while your account remains active.</p>
          </section>

          {/* Section 9 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">9. California Privacy Rights</h3>
            <p>If you are a California resident, you may have additional rights under the California Consumer Privacy Act (&ldquo;CCPA&rdquo;) and the California Privacy Rights Act (&ldquo;CPRA&rdquo;), including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>The right to know what personal information is collected, used, shared, or sold;</li>
              <li>The right to request deletion of personal information;</li>
              <li>The right to opt out of the sale or sharing of personal information;</li>
              <li>The right to non-discrimination for exercising your privacy rights.</li>
            </ul>
            <p className="mt-3"><strong>We do not sell personal information.</strong> To exercise your California privacy rights, please contact us at the address provided in Section 11.</p>
          </section>

          {/* Section 10 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">10. Changes to This Privacy Policy</h3>
            <p>We reserve the right to modify this Privacy Policy at any time. Material changes will be communicated to registered users via email or in-app notification no less than thirty (30) days prior to taking effect. Non-material changes may take effect immediately upon posting to the Platform. Your continued use of the Platform following notice of any change constitutes your acceptance of the revised Privacy Policy.</p>
            <p className="mt-2">We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.</p>
          </section>

          {/* Section 11 */}
          <section>
            <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">11. Contact Information</h3>
            <p>For any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact:</p>
            <address className="not-italic mt-2 pl-4 border-l-2 border-border-subtle">
              Elite Hoops Association<br />
              EHA Connect Platform<br />
              Tustin, California<br />
              Email: <a href="mailto:legal@ehaconnect.com" className="text-[#E31837] hover:text-text-primary transition-colors">legal@ehaconnect.com</a>
            </address>
            <p className="mt-4">For COPPA-related inquiries or to exercise parental rights regarding your child&apos;s information, please include &ldquo;COPPA Request&rdquo; in the subject line of your correspondence.</p>
          </section>

          <hr className="border-border-subtle my-8" />

          <p className="font-semibold text-text-primary uppercase text-xs tracking-wide">
            BY USING THE EHA CONNECT PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY AND AGREE TO THE COLLECTION, USE, AND DISCLOSURE OF YOUR INFORMATION AS DESCRIBED HEREIN.
          </p>
        </div>
      </div>
    </div>
  )
}
