import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'EHA Connect Terms of Service Agreement',
}

export default function TermsOfServicePage() {
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
          Terms of Service Agreement
        </h2>
        <p className="text-text-muted text-sm font-sans mb-8">
          Effective Date: February 27, 2026
        </p>

        <div className="prose prose-invert max-w-none space-y-6 text-text-secondary font-sans text-sm leading-relaxed">
        <p className="font-semibold text-text-primary uppercase text-xs tracking-wide">
          PLEASE READ THESE TERMS OF SERVICE (&ldquo;AGREEMENT&rdquo;) CAREFULLY BEFORE USING THE EHA CONNECT PLATFORM. BY ACCESSING OR USING THIS PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THIS AGREEMENT. IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST IMMEDIATELY CEASE USE OF THE PLATFORM.
        </p>

        {/* Section 1 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">1. Parties and Definitions</h3>
          <p>
            This Agreement is entered into between Elite Hoops Association, a California limited liability company (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), and you, the individual or entity accessing or using the EHA Connect platform (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;). The following definitions shall apply throughout this Agreement:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li><strong>&ldquo;Platform&rdquo;</strong> means the EHA Connect web-based application, mobile application, and all associated services, features, content, and functionality.</li>
            <li><strong>&ldquo;Athlete Profile&rdquo;</strong> means the digital profile created for an individual youth basketball player, containing biographical, academic, and athletic performance data.</li>
            <li><strong>&ldquo;Club Director&rdquo; or &ldquo;EHA Admin&rdquo;</strong> means an authorized representative of a participating Elite Hoops Association club who administers team registrations and platform access.</li>
            <li><strong>&ldquo;Coach&rdquo;</strong> means any team coach, assistant coach, or authorized team staff member granted access to the Platform through a Club Director.</li>
            <li><strong>&ldquo;College Recruiter&rdquo;</strong> means any college or university athletic department representative, scout, or authorized agent who accesses the Platform for talent identification and recruitment purposes.</li>
            <li><strong>&ldquo;Parent/Guardian&rdquo;</strong> means the parent or legal guardian of a minor Athlete who creates or manages an account on behalf of such minor.</li>
            <li><strong>&ldquo;Minor&rdquo;</strong> means any individual under the age of eighteen (18) years.</li>
            <li><strong>&ldquo;Subscription&rdquo;</strong> means the paid access plan selected by a User to access the Platform&apos;s features.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">2. Description of Services</h3>
          <p>
            EHA Connect is a business-to-business (&ldquo;B2B&rdquo;) Software-as-a-Service (&ldquo;SaaS&rdquo;) platform designed to serve the youth basketball community. The Platform provides the following core services:
          </p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">2.1 Athlete Profile Management</h4>
          <p>The Platform enables youth basketball athletes to create and maintain verified digital athletic profiles, including but not limited to academic information, performance statistics, game footage links, and physical measurements.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">2.2 Team and Season Management</h4>
          <p>The Platform provides Club Directors and Coaches with tools to manage team rosters, game schedules, event registrations, scoring, and season-related administrative functions.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">2.3 Recruiting Discovery</h4>
          <p>The Platform provides vetted and approved College Recruiters with access to searchable Athlete Profiles for the purposes of legitimate collegiate recruitment and talent identification.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">2.4 Event Management</h4>
          <p>The Platform facilitates the administration of basketball tournaments and events, including registration workflows, bracket management, real-time scorekeeper interfaces, and results reporting.</p>
        </section>

        {/* Section 3 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">3. Eligibility and Account Registration</h3>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">3.1 Age Requirements</h4>
          <p>To create an account on the Platform, you must be at least eighteen (18) years of age. Users who are Minors may only access the Platform through an account created and managed by their Parent or Guardian, who must affirmatively consent to these Terms on the Minor&apos;s behalf. By creating an account for a Minor, the Parent or Guardian represents and warrants that they have legal authority to do so and accepts full responsibility for compliance with these Terms on the Minor&apos;s behalf.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">3.2 Account Accuracy</h4>
          <p>You represent and warrant that all information provided during account registration is accurate, current, and complete. You agree to promptly update your account information to maintain its accuracy. The Company reserves the right to suspend or terminate any account based on inaccurate, misleading, or fraudulent registration information.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">3.3 Account Security</h4>
          <p>You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to immediately notify the Company of any unauthorized use of your account or any other breach of security. The Company shall not be liable for any loss or damage arising from your failure to maintain adequate account security.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">3.4 One Account Per User</h4>
          <p>Each User is permitted to maintain only one (1) account per user type. The creation of multiple accounts by a single User for the purpose of circumventing restrictions, access limitations, or platform policies is strictly prohibited.</p>
        </section>

        {/* Section 4 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">4. Subscriptions, Fees, and Payment Terms</h3>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">4.1 Subscription Plans</h4>
          <p>Access to the Platform for Parent/Guardian users requires an active paid Subscription. The following Subscription tiers are currently offered:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Annual Subscription: Fifty Dollars ($50.00) per year, per athlete profile.</li>
            <li>Monthly Subscription: Ten Dollars ($10.00) per month, per athlete profile.</li>
          </ul>
          <p className="mt-2">The Company reserves the right to modify Subscription pricing at any time. Price changes will be communicated to existing subscribers no less than thirty (30) days in advance of taking effect.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">4.2 Payment Processing</h4>
          <p>All Subscription fees are processed through Stripe, Inc., a third-party payment processor. By providing payment information, you authorize the Company to charge your selected payment method for the applicable Subscription fees on the applicable billing cycle. Payment terms are subject to the policies of Stripe, Inc. The Company does not store full credit card or banking information.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">4.3 No Refunds</h4>
          <p className="font-semibold text-text-primary uppercase text-xs tracking-wide">ALL SUBSCRIPTION FEES ARE FINAL AND NON-REFUNDABLE. Except as expressly required by applicable law, the Company does not provide refunds, credits, or pro-rata adjustments for any Subscription fees paid, whether for annual or monthly plans, regardless of the reason for cancellation, termination, or non-use. By completing a Subscription purchase, you expressly acknowledge and agree to this no-refund policy.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">4.4 Lapsed Payment and Access Suspension</h4>
          <p>In the event a Subscription payment is not received by its due date—whether due to a declined payment method, account cancellation, or any other reason—the associated account(s) shall have Platform access immediately suspended upon the lapse of the applicable billing period. Access will be restored only upon receipt of a valid payment for the applicable Subscription fee. The Company shall not be liable for any loss of data, missed recruiting opportunities, or other consequences resulting from access suspension due to lapsed payment.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">4.5 Automatic Renewal</h4>
          <p>Subscriptions automatically renew at the end of each billing period unless cancelled by the User prior to the renewal date. It is the User&apos;s responsibility to cancel their Subscription prior to renewal if they do not wish to continue. The Company is not obligated to provide advance notice of automatic renewal charges unless required by applicable law.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">4.6 Taxes</h4>
          <p>Subscription fees do not include applicable taxes. Users are responsible for all taxes, levies, or duties imposed by applicable taxing authorities in connection with their Subscription purchase, excluding taxes on the Company&apos;s income.</p>
        </section>

        {/* Section 5 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">5. Athlete Profile Data and Privacy</h3>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">5.1 Parental Consent</h4>
          <p>The creation and publication of an Athlete Profile for a Minor requires the affirmative consent of such Minor&apos;s Parent or Guardian. By creating or authorizing an Athlete Profile, the Parent or Guardian consents to the collection, storage, display, and use of the Minor&apos;s athletic and biographical data as described in this Agreement and the Company&apos;s Privacy Policy.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">5.2 COPPA Compliance</h4>
          <p>The Company is committed to compliance with the Children&apos;s Online Privacy Protection Act (&ldquo;COPPA&rdquo;), 15 U.S.C. §§ 6501–6506, and all applicable regulations promulgated thereunder. The Company does not knowingly collect personal information from children under the age of thirteen (13) without verifiable parental consent. If the Company becomes aware that personal information has been collected from a child under thirteen (13) without such consent, it will promptly delete such information. Parents or Guardians who believe their child&apos;s information has been collected without consent should contact the Company immediately at the address provided in Section 14.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">5.3 Ownership of User-Submitted Content</h4>
          <p>Users retain ownership of all content they submit to the Platform, including athlete statistics, photographs, video links, and biographical information (&ldquo;User Content&rdquo;). By submitting User Content, you grant the Company a non-exclusive, royalty-free, worldwide license to display, reproduce, and distribute such User Content solely within the Platform for the purposes described in this Agreement.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">5.4 Accuracy of Athlete Information</h4>
          <p>Users are solely responsible for the accuracy and completeness of all information submitted to an Athlete Profile. The Company does not independently verify athlete statistics, academic records, or biographical data. Any misrepresentation of athlete eligibility, academic standing, or performance data may result in immediate account termination.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">5.5 Data Deletion Request</h4>
          <p>Parents or Guardians may request the deletion of their child&apos;s Athlete Profile and associated personal data at any time by submitting a written request to the Company. Deletion requests will be processed within thirty (30) days of receipt. Certain records may be retained as required by applicable law or for legitimate business purposes as described in the Company&apos;s Privacy Policy.</p>
        </section>

        {/* Section 6 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">6. Acceptable Use Policy</h3>
          <p>Users agree to use the Platform solely for its intended purposes and in compliance with all applicable federal, state, and local laws. The following activities are strictly prohibited:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>Sharing, selling, or transferring account credentials to any third party;</li>
            <li>Misrepresenting an athlete&apos;s statistics, academic eligibility, graduation year, or any other profile data;</li>
            <li>Using the Platform to contact athletes, parents, or coaches directly for purposes unrelated to legitimate team management or recruiting;</li>
            <li>Scraping, harvesting, or otherwise systematically extracting data from the Platform by automated means;</li>
            <li>Attempting to circumvent, disable, or interfere with any security features or access controls;</li>
            <li>Uploading or transmitting any content that is unlawful, defamatory, obscene, or harmful to minors;</li>
            <li>Using the Platform for any commercial purpose other than legitimate sports management or recruiting activities;</li>
            <li>Impersonating any person, entity, or affiliation;</li>
            <li>Interfering with or disrupting the integrity or performance of the Platform or its infrastructure.</li>
          </ul>
          <p className="mt-3">The Company reserves the right, in its sole discretion, to investigate and take appropriate action against any User who violates this Acceptable Use Policy, including immediate account suspension or termination without refund.</p>
        </section>

        {/* Section 7 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">7. College Recruiter Terms</h3>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">7.1 Vetting and Approval</h4>
          <p>Access to Athlete Profiles for recruiting purposes is restricted to College Recruiters who have been verified and approved by the Company. Approval requires submission of valid institutional credentials and acknowledgment of applicable NCAA, NAIA, NWAC, or other governing body recruiting regulations.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">7.2 Permitted Use</h4>
          <p>Approved College Recruiters may access and view Athlete Profiles solely for the purpose of legitimate collegiate athletic recruitment. Any use of Athlete Profile data for commercial purposes, data resale, unauthorized distribution, or any purpose inconsistent with lawful recruiting practices is expressly prohibited.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">7.3 No Data Export</h4>
          <p>College Recruiters may not export, download, or reproduce Athlete Profile data in bulk. Individual profile information may be reviewed and noted for internal recruiting purposes only.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">7.4 Compliance with Governing Body Rules</h4>
          <p>College Recruiters are solely responsible for ensuring that their use of the Platform complies with all applicable recruiting rules and regulations of their respective governing athletic body. The Company is not responsible for any recruiting violations arising from a recruiter&apos;s use of the Platform.</p>
        </section>

        {/* Section 8 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">8. Club Director and Coach Obligations</h3>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">8.1 Authority and Responsibility</h4>
          <p>Club Directors represent and warrant that they are authorized representatives of their respective EHA-affiliated club organizations and have authority to bind such organizations to this Agreement. Club Directors accept responsibility for the conduct of all Coaches and team staff granted access through their club account.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">8.2 Roster Accuracy</h4>
          <p>Club Directors and Coaches are solely responsible for the accuracy of team rosters, player eligibility determinations, and event registrations submitted through the Platform. The Company is not responsible for errors, disputes, or consequences arising from inaccurate roster information.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">8.3 Event Disputes</h4>
          <p>The Company is not a party to any disputes between clubs, coaches, athletes, or event organizers arising from basketball events administered through the Platform. All such disputes are the sole responsibility of the parties involved.</p>
        </section>

        {/* Section 9 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">9. Intellectual Property</h3>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">9.1 Company Ownership</h4>
          <p>The Platform, including all software, source code, databases, algorithms, designs, trademarks, trade names, logos, and content created by the Company (collectively, &ldquo;Company IP&rdquo;), is owned exclusively by Elite Hoops Association and is protected by applicable copyright, trademark, trade secret, and other intellectual property laws. Nothing in this Agreement grants User any ownership interest in Company IP.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">9.2 License to Use the Platform</h4>
          <p>Subject to the terms of this Agreement and payment of applicable Subscription fees, the Company grants User a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for its intended purposes during the term of the Subscription.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">9.3 Feedback</h4>
          <p>If you provide any suggestions, ideas, or feedback regarding the Platform (&ldquo;Feedback&rdquo;), you grant the Company a perpetual, irrevocable, royalty-free license to use, incorporate, and exploit such Feedback in any manner, without attribution or compensation to you.</p>
        </section>

        {/* Section 10 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">10. Disclaimers and Limitation of Liability</h3>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">10.1 Platform Provided &ldquo;As Is&rdquo;</h4>
          <p className="font-semibold text-text-primary uppercase text-xs tracking-wide">THE PLATFORM IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR UNINTERRUPTED, ERROR-FREE OPERATION. THE COMPANY DOES NOT WARRANT THAT THE PLATFORM WILL MEET YOUR REQUIREMENTS OR THAT ANY DATA OR CONTENT ON THE PLATFORM IS ACCURATE, RELIABLE, OR COMPLETE.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">10.2 No Guarantee of Recruiting Outcomes</h4>
          <p>The Company makes no representation or guarantee that use of the Platform will result in any athletic scholarship, college offer, recruiting contact, or other desired recruiting outcome. All recruiting decisions are made solely at the discretion of individual college and university programs.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">10.3 No Liability for In-Person Events</h4>
          <p>The Company is not responsible for any personal injury, property damage, or other harm arising from participation in any in-person basketball events, tournaments, or activities scheduled or facilitated through the Platform. Users participate in all in-person events at their own risk.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">10.4 Limitation of Liability</h4>
          <p className="font-semibold text-text-primary uppercase text-xs tracking-wide">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE PLATFORM. IN NO EVENT SHALL THE COMPANY&apos;S TOTAL AGGREGATE LIABILITY TO ANY USER EXCEED THE TOTAL SUBSCRIPTION FEES PAID BY SUCH USER IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE CLAIM.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">10.5 Essential Basis</h4>
          <p>The limitations of liability set forth in this Section reflect an informed, voluntary allocation of risk between the parties and are an essential basis of the bargain between the parties. These limitations shall apply notwithstanding any failure of essential purpose of any limited remedy.</p>
        </section>

        {/* Section 11 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">11. Indemnification</h3>
          <p>You agree to defend, indemnify, and hold harmless the Company and its officers, directors, employees, agents, affiliates, and successors from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your use of the Platform; (b) your violation of this Agreement; (c) your violation of any third-party rights, including intellectual property or privacy rights; (d) any inaccurate information submitted through your account; or (e) any dispute between you and any third party related to your use of the Platform.</p>
        </section>

        {/* Section 12 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">12. Termination</h3>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">12.1 Termination by Company</h4>
          <p>The Company reserves the right to suspend, restrict, or permanently terminate any User&apos;s access to the Platform, with or without notice, for any violation of this Agreement, fraudulent or harmful conduct, or for any other reason the Company deems necessary to protect the integrity of the Platform and the safety of its users. Termination for cause is not eligible for a refund of any Subscription fees paid.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">12.2 Cancellation by User</h4>
          <p>Users may cancel their Subscription at any time through their account settings or by contacting the Company in writing. Cancellation will take effect at the end of the then-current billing period. No refunds will be issued for any remaining portion of a prepaid annual or monthly Subscription term.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">12.3 Effect of Termination</h4>
          <p>Upon termination or cancellation, your license to access and use the Platform immediately ceases. Athlete Profile data associated with a terminated account will be retained in the Company&apos;s system for a period of ninety (90) days following termination, after which it may be permanently deleted, unless a data deletion request is submitted earlier pursuant to Section 5.5. The Company is not responsible for any data lost due to account termination.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">12.4 Survival</h4>
          <p>The following Sections shall survive any termination or expiration of this Agreement: Section 5 (Athlete Profile Data and Privacy), Section 9 (Intellectual Property), Section 10 (Disclaimers and Limitation of Liability), Section 11 (Indemnification), and Section 13 (Governing Law and Dispute Resolution).</p>
        </section>

        {/* Section 13 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">13. Governing Law and Dispute Resolution</h3>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">13.1 Governing Law</h4>
          <p>This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law principles. The parties specifically agree that the United Nations Convention on Contracts for the International Sale of Goods shall not apply to this Agreement.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">13.2 Venue</h4>
          <p>Any legal action or proceeding arising out of or related to this Agreement shall be brought exclusively in the state or federal courts located in Orange County, California. Both parties hereby consent to personal jurisdiction and venue in such courts and waive any objection to such jurisdiction or venue.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">13.3 Informal Resolution</h4>
          <p>Prior to initiating any formal legal proceeding, the parties agree to attempt in good faith to resolve any dispute through informal negotiation. Either party may initiate informal dispute resolution by providing written notice to the other party describing the nature of the dispute. The parties shall have thirty (30) days from the date of such notice to attempt resolution before either party may initiate formal proceedings.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">13.4 Class Action Waiver</h4>
          <p className="font-semibold text-text-primary uppercase text-xs tracking-wide">TO THE EXTENT PERMITTED BY APPLICABLE LAW, YOU AGREE THAT ANY DISPUTE ARISING UNDER THIS AGREEMENT SHALL BE RESOLVED ON AN INDIVIDUAL BASIS, AND YOU HEREBY WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.</p>
        </section>

        {/* Section 14 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">14. Changes to This Agreement</h3>
          <p>The Company reserves the right to modify or update this Agreement at any time. Material changes to this Agreement will be communicated to registered Users via email or in-app notification no less than thirty (30) days prior to taking effect. Non-material changes may take effect immediately upon posting to the Platform. Continued use of the Platform following notice of any change constitutes your acceptance of the revised Agreement. If you do not agree to any revised terms, you must discontinue use of the Platform prior to the effective date of such change.</p>
        </section>

        {/* Section 15 */}
        <section>
          <h3 className="font-heading text-lg font-semibold text-text-primary mt-8 mb-3">15. General Provisions</h3>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">15.1 Entire Agreement</h4>
          <p>This Agreement, together with the Company&apos;s Privacy Policy and any additional terms applicable to specific features of the Platform, constitutes the entire agreement between the parties with respect to its subject matter and supersedes all prior or contemporaneous agreements, representations, and understandings.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">15.2 Severability</h4>
          <p>If any provision of this Agreement is found to be invalid, illegal, or unenforceable under applicable law, such provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions of this Agreement shall continue in full force and effect.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">15.3 Waiver</h4>
          <p>The failure of the Company to enforce any right or provision of this Agreement shall not constitute a waiver of such right or provision. Any waiver must be in writing and signed by an authorized representative of the Company.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">15.4 Assignment</h4>
          <p>You may not assign or transfer this Agreement or any rights or obligations hereunder without the prior written consent of the Company. The Company may freely assign this Agreement in connection with a merger, acquisition, corporate reorganization, or sale of all or substantially all of its assets.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">15.5 Force Majeure</h4>
          <p>The Company shall not be liable for any failure or delay in performance resulting from circumstances beyond its reasonable control, including natural disasters, pandemics, acts of government, labor disputes, or internet service disruptions.</p>

          <h4 className="font-semibold text-text-primary mt-4 mb-2">15.6 Contact Information</h4>
          <p>For any questions, concerns, or notices regarding this Agreement, please contact:</p>
          <address className="not-italic mt-2 pl-4 border-l-2 border-border-subtle">
            Elite Hoops Association<br />
            EHA Connect Platform<br />
            Tustin, California<br />
            Email: <a href="mailto:legal@ehaconnect.com" className="text-[#E31837] hover:text-text-primary transition-colors">legal@ehaconnect.com</a>
          </address>
        </section>

        <hr className="border-border-subtle my-8" />

        <p className="font-semibold text-text-primary uppercase text-xs tracking-wide">
          BY USING THE EHA CONNECT PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREED TO THESE TERMS OF SERVICE.
        </p>
      </div>
      </div>
    </div>
  )
}
