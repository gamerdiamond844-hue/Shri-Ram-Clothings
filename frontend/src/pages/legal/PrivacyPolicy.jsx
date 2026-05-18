import LegalPage, { Section, Sub, List, Alert, InfoBox, BRAND, COMPANY, EMAIL, SUPPORT, ADDRESS, PHONE, WEBSITE, GRIEVANCE_OFFICER, GRIEVANCE_EMAIL } from './LegalPage';

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="January 1, 2026">

      <InfoBox>
        This Privacy Policy governs the collection, processing, storage, and protection of personal data by {BRAND}, operated by {COMPANY}. By accessing or using our platform, you expressly consent to the practices described herein. This policy is compliant with the Digital Personal Data Protection Act, 2023 (DPDP Act), the Information Technology Act, 2000, the Consumer Protection (E-Commerce) Rules, 2020, and GDPR-aligned principles.
      </InfoBox>

      <Section num="1" title="Identity of the Data Controller">
        <Sub>
          <strong>{COMPANY}</strong> ("Company", "We", "Us", "Our") is the Data Fiduciary and Data Controller responsible for the personal data collected through the {BRAND} platform accessible at <strong>{WEBSITE}</strong> and all associated mobile applications, APIs, and digital touchpoints.
        </Sub>
        <Sub title="Registered Business Details">
          <List items={[
            `Legal Entity: ${COMPANY}`,
            `Brand Name: ${BRAND}`,
            `Registered Address: ${ADDRESS}`,
            `Support Email: ${SUPPORT}`,
            `Legal/Compliance Email: ${EMAIL}`,
            `Contact Number: ${PHONE}`,
            `GST Registration: [GST Number — To Be Updated]`,
            `CIN: [Corporate Identification Number — To Be Updated]`,
          ]} />
        </Sub>
      </Section>

      <Section num="2" title="Scope of This Policy">
        <Sub>
          This Privacy Policy applies to all individuals who: (a) visit or browse the {BRAND} website or application; (b) register an account; (c) place orders or make purchases; (d) interact with our customer support; (e) subscribe to marketing communications; (f) participate in promotions, surveys, or contests; or (g) otherwise interact with our digital platforms in any capacity.
        </Sub>
        <Alert>This policy does not apply to third-party websites, payment gateways, or external services linked from our platform. We strongly recommend reviewing the privacy policies of all third-party services you interact with.</Alert>
      </Section>

      <Section num="3" title="Categories of Personal Data Collected">
        <Sub title="3.1 Identity & Contact Information">
          <List items={[
            'Full legal name and display name',
            'Email address (primary and secondary)',
            'Mobile phone number and alternate contact numbers',
            'Date of birth (for age verification purposes)',
            'Gender (optional, for personalization)',
            'Profile photograph (if uploaded)',
          ]} />
        </Sub>
        <Sub title="3.2 Address & Location Data">
          <List items={[
            'Delivery addresses (street, city, state, PIN code, country)',
            'Billing addresses',
            'GPS/geolocation data (if location services are enabled)',
            'IP address-derived approximate location',
          ]} />
        </Sub>
        <Sub title="3.3 Transaction & Financial Data">
          <List items={[
            'Order history, order IDs, and purchase records',
            'Payment method type (card, UPI, net banking, wallet)',
            'Transaction IDs and payment gateway references',
            'Paytm payment tokens and encrypted card metadata',
            'Refund and return transaction records',
            'Coupon and discount usage history',
          ]} />
        </Sub>
        <Sub title="3.4 Technical & Device Data">
          <List items={[
            'IP address (IPv4 and IPv6)',
            'Browser type, version, and language settings',
            'Operating system and device type (mobile, desktop, tablet)',
            'Device identifiers (IMEI, device ID where applicable)',
            'Screen resolution and viewport dimensions',
            'Referring URLs and exit pages',
            'Time zone and locale settings',
            'Network provider and connection type',
          ]} />
        </Sub>
        <Sub title="3.5 Behavioral & Usage Data">
          <List items={[
            'Pages visited, products viewed, and search queries',
            'Click patterns, scroll depth, and interaction heatmaps',
            'Session duration and frequency of visits',
            'Cart additions, wishlist items, and abandoned carts',
            'Product ratings, reviews, and feedback submitted',
            'Customer support interaction logs and chat transcripts',
          ]} />
        </Sub>
        <Sub title="3.6 Authentication & Security Data">
          <List items={[
            'Login timestamps and session tokens',
            'Authentication method (email/password, Google OAuth)',
            'Failed login attempts and account lockout events',
            'Two-factor authentication records',
            'Security question responses (if applicable)',
            'Fraud detection signals and risk scores',
          ]} />
        </Sub>
        <Sub title="3.7 Communication Data">
          <List items={[
            'Email correspondence with our support team',
            'WhatsApp and chat message logs',
            'Grievance submissions and resolution records',
            'Survey responses and feedback forms',
            'Marketing email open rates and click-through data',
          ]} />
        </Sub>
      </Section>

      <Section num="4" title="Legal Basis for Processing">
        <Sub>We process your personal data under the following legal bases as recognized under the DPDP Act 2023 and applicable Indian law:</Sub>
        <List items={[
          'Contractual Necessity: Processing required to fulfill your orders, manage your account, and provide our services.',
          'Legitimate Interests: Fraud prevention, security monitoring, platform improvement, and business analytics.',
          'Legal Obligation: Compliance with tax laws, court orders, regulatory requirements, and law enforcement requests.',
          'Consent: Marketing communications, optional personalization features, and cookie-based tracking (where consent is obtained).',
          'Vital Interests: In rare circumstances where processing is necessary to protect life or safety.',
        ]} />
      </Section>

      <Section num="5" title="Purposes of Data Processing">
        <List items={[
          'Account creation, authentication, and management',
          'Order processing, fulfillment, and delivery coordination',
          'Payment processing and fraud prevention',
          'Customer support and grievance resolution',
          'Personalized product recommendations and marketing',
          'Platform security, abuse prevention, and bot detection',
          'Legal compliance, audit trails, and regulatory reporting',
          'Analytics, performance monitoring, and service improvement',
          'Push notifications, SMS alerts, and email communications',
          'Loyalty programs, promotions, and coupon management',
          'Research and development of new features',
          'Enforcement of our Terms & Conditions and legal rights',
        ]} />
      </Section>

      <Section num="6" title="Cookies & Tracking Technologies">
        <Sub title="6.1 Types of Cookies Used">
          <List items={[
            'Essential Cookies: Required for platform functionality, session management, and security.',
            'Analytics Cookies: Used to understand user behavior via Google Analytics and similar tools.',
            'Marketing Cookies: Used for retargeting, personalized advertisements, and campaign tracking.',
            'Preference Cookies: Store user preferences such as language, currency, and display settings.',
            'Security Cookies: Used for fraud detection, CSRF protection, and bot mitigation.',
          ]} />
        </Sub>
        <Sub title="6.2 Third-Party Tracking">
          We use Google Analytics, Meta Pixel, Paytm analytics, and other third-party tracking tools. These services may collect data independently under their own privacy policies. You may opt out of Google Analytics tracking at <strong>tools.google.com/dlpage/gaoptout</strong>.
        </Sub>
        <InfoBox>You may manage cookie preferences through your browser settings. Disabling essential cookies may impair platform functionality.</InfoBox>
      </Section>

      <Section num="7" title="Data Sharing & Third-Party Disclosure">
        <Sub>We do not sell, rent, or trade your personal data. We share data only in the following circumstances:</Sub>
        <List items={[
          'Payment Processors: Paytm Payments Private Limited for secure payment processing.',
          'Logistics Partners: Delhivery, Blue Dart, and other courier services for order fulfillment.',
          'Cloud Infrastructure: Amazon Web Services (AWS), Neon Database, and Cloudinary for data storage and media hosting.',
          'Communication Services: Email service providers for transactional and marketing emails.',
          'Analytics Providers: Google Analytics and similar platforms for usage analytics.',
          'Legal Authorities: Government agencies, courts, or law enforcement when legally required.',
          'Business Transfers: In the event of merger, acquisition, or asset sale, subject to confidentiality obligations.',
          'Fraud Prevention: Credit bureaus, fraud detection agencies, and security services.',
        ]} />
        <Alert>All third-party service providers are contractually bound to process data only for specified purposes and maintain appropriate security standards.</Alert>
      </Section>

      <Section num="8" title="Data Retention Policy">
        <List items={[
          'Account Data: Retained for the duration of account existence plus 3 years post-closure.',
          'Transaction Records: Retained for 7 years as required under Indian tax and accounting laws.',
          'Communication Logs: Retained for 2 years for dispute resolution purposes.',
          'Security Logs: Retained for 1 year for fraud investigation and security auditing.',
          'Marketing Data: Retained until consent is withdrawn or 3 years of inactivity.',
          'Legal Hold Data: Retained indefinitely when subject to active legal proceedings.',
        ]} />
      </Section>

      <Section num="9" title="Your Rights Under DPDP Act 2023">
        <Sub>As a Data Principal under the Digital Personal Data Protection Act, 2023, you have the following rights:</Sub>
        <List items={[
          'Right to Access: Request a copy of personal data we hold about you.',
          'Right to Correction: Request correction of inaccurate or incomplete data.',
          'Right to Erasure: Request deletion of your personal data (subject to legal retention obligations).',
          'Right to Grievance Redressal: Lodge complaints with our Grievance Officer.',
          'Right to Nominate: Nominate a person to exercise rights on your behalf in case of death or incapacity.',
          'Right to Withdraw Consent: Withdraw consent for non-essential processing at any time.',
          'Right to Data Portability: Request your data in a structured, machine-readable format.',
        ]} />
        <InfoBox>To exercise any of these rights, submit a written request to {EMAIL} with your registered email address and identity verification. We will respond within 30 days.</InfoBox>
      </Section>

      <Section num="10" title="Data Security Measures">
        <List items={[
          'AES-256 encryption for data at rest',
          'TLS 1.3 encryption for all data in transit',
          'Bcrypt hashing for all stored passwords',
          'VAPID-secured Web Push notification infrastructure',
          'JWT-based authentication with 7-day expiry',
          'Rate limiting and DDoS protection on all API endpoints',
          'Regular security audits and penetration testing',
          'Access controls with role-based permissions',
          'Automated anomaly detection and alerting',
          'Secure cloud infrastructure with SOC 2 compliant providers',
        ]} />
        <Alert>Despite our best efforts, no system is 100% secure. In the event of a data breach affecting your rights, we will notify you within 72 hours as required by applicable law.</Alert>
      </Section>

      <Section num="11" title="International Data Transfers">
        <Sub>
          Your data may be processed on servers located outside India, including in the United States (AWS infrastructure). All international transfers are conducted under appropriate safeguards including Standard Contractual Clauses (SCCs) and data processing agreements that ensure equivalent protection to Indian data protection standards.
        </Sub>
      </Section>

      <Section num="12" title="Children's Privacy">
        <Sub>
          Our platform is not directed at individuals under the age of 18. We do not knowingly collect personal data from minors. If we become aware that a minor has provided personal data without verifiable parental consent, we will delete such data immediately. Parents or guardians who believe their child has submitted data to us should contact {EMAIL} immediately.
        </Sub>
      </Section>

      <Section num="13" title="Grievance Officer">
        <Sub>
          In accordance with the Information Technology Act, 2000 and the DPDP Act, 2023, we have appointed a Grievance Officer to address privacy-related complaints:
        </Sub>
        <List items={[
          `Name: ${GRIEVANCE_OFFICER}`,
          `Designation: Grievance Officer & Data Protection Officer`,
          `Email: ${GRIEVANCE_EMAIL}`,
          `Address: ${ADDRESS}`,
          `Response Time: Within 30 days of receipt of complaint`,
        ]} />
        <InfoBox>If you are not satisfied with our response, you may escalate your complaint to the Data Protection Board of India once constituted under the DPDP Act, 2023.</InfoBox>
      </Section>

      <Section num="14" title="Policy Updates">
        <Sub>
          We reserve the right to update this Privacy Policy at any time. Material changes will be communicated via email to registered users and/or prominent notice on our platform at least 15 days prior to the effective date. Continued use of the platform after the effective date constitutes acceptance of the revised policy.
        </Sub>
      </Section>

    </LegalPage>
  );
}
