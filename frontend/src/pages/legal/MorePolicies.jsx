import LegalPage, { Section, Sub, List, Alert, InfoBox, BRAND, COMPANY, EMAIL, SUPPORT, ADDRESS, PHONE, WEBSITE, GRIEVANCE_OFFICER, GRIEVANCE_EMAIL } from './LegalPage';

export function DisclaimerPolicy() {
  return (
    <LegalPage title="Disclaimer & Limitation of Liability" lastUpdated="January 1, 2026">
      <InfoBox>This Disclaimer governs the use of the {BRAND} platform. Please read carefully before using our services.</InfoBox>

      <Section num="1" title="General Disclaimer">
        <Sub>The {BRAND} platform and all content therein are provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied. {COMPANY} expressly disclaims all warranties including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, and accuracy of information.</Sub>
      </Section>

      <Section num="2" title="Product Information Disclaimer">
        <List items={[
          'Product colors may vary due to monitor calibration and photography lighting',
          'Product dimensions and measurements are approximate and may have minor variations',
          'Fabric texture and feel cannot be accurately conveyed through digital images',
          'Fashion sizing is not standardized; always refer to our size guide',
          'Product availability is subject to change without notice',
        ]} />
      </Section>

      <Section num="3" title="Limitation of Liability">
        <Sub>To the fullest extent permitted by applicable law, {COMPANY} shall not be liable for: (a) any indirect, incidental, special, consequential, or punitive damages; (b) loss of profits, revenue, data, or business opportunities; (c) damages resulting from unauthorized access to or alteration of your data; (d) damages resulting from third-party conduct; or (e) any matter beyond our reasonable control.</Sub>
        <Sub>Our maximum aggregate liability for any claim shall not exceed the amount paid by you for the specific transaction giving rise to the claim.</Sub>
      </Section>

      <Section num="4" title="Third-Party Links Disclaimer">
        <Sub>Our platform may contain links to third-party websites. These links are provided for convenience only. We have no control over the content, privacy practices, or security of third-party sites and accept no responsibility for them. Accessing third-party links is at your own risk.</Sub>
      </Section>

      <Section num="5" title="Service Availability Disclaimer">
        <Sub>We do not guarantee uninterrupted, error-free, or secure access to our platform. We reserve the right to modify, suspend, or discontinue any aspect of the platform at any time without notice. We shall not be liable for any loss resulting from platform downtime, maintenance, or technical failures.</Sub>
      </Section>

      <Section num="6" title="Force Majeure">
        <Sub>{COMPANY} shall not be liable for any failure or delay in performance resulting from causes beyond our reasonable control, including but not limited to: acts of God, natural disasters, pandemics, government actions, civil unrest, strikes, power failures, internet outages, cyberattacks, or supply chain disruptions. In such events, our obligations will be suspended for the duration of the force majeure event.</Sub>
      </Section>

      <Section num="7" title="Warranty Disclaimer">
        <Sub>We make no warranty that: (a) the platform will meet your requirements; (b) the platform will be available at all times; (c) results obtained from using the platform will be accurate or reliable; (d) any errors in the platform will be corrected. Products are warranted only to the extent provided by the manufacturer.</Sub>
      </Section>
    </LegalPage>
  );
}

export function LegalNotice() {
  return (
    <LegalPage title="Legal Notice & Compliance Statement" lastUpdated="January 1, 2026">

      <Section num="1" title="Corporate Identity">
        <Sub>
          <strong>{BRAND}</strong> is a registered fashion e-commerce brand owned, operated, managed, maintained, and developed by <strong>{COMPANY}</strong>, a company incorporated under the Companies Act, 2013, India.
        </Sub>
        <List items={[
          `Legal Entity: ${COMPANY}`,
          `Brand: ${BRAND}`,
          `Website: ${WEBSITE}`,
          `Registered Address: ${ADDRESS}`,
          `Customer Support: ${SUPPORT}`,
          `Legal Inquiries: ${EMAIL}`,
          `Phone: ${PHONE}`,
          `GST Number: [To Be Updated]`,
          `CIN: [To Be Updated]`,
        ]} />
      </Section>

      <Section num="2" title="Regulatory Compliance">
        <Sub>Our platform operates in compliance with the following Indian laws and regulations:</Sub>
        <List items={[
          'Information Technology Act, 2000 and IT (Amendment) Act, 2008',
          'Digital Personal Data Protection Act, 2023 (DPDP Act)',
          'Consumer Protection Act, 2019',
          'Consumer Protection (E-Commerce) Rules, 2020',
          'Payment and Settlement Systems Act, 2007',
          'Indian Contract Act, 1872',
          'Sale of Goods Act, 1930',
          'Goods and Services Tax (GST) Act, 2017',
          'Foreign Exchange Management Act (FEMA), 1999',
          'Trademarks Act, 1999',
          'Copyright Act, 1957',
        ]} />
      </Section>

      <Section num="3" title="Intellectual Property Notice">
        <Sub>All trademarks, service marks, trade names, logos, and brand identities associated with {BRAND} are the exclusive property of {COMPANY}. Unauthorized use, reproduction, or imitation of our intellectual property is strictly prohibited and will result in legal action.</Sub>
        <Alert>Any attempt to clone, copy, or impersonate the {BRAND} platform or brand identity will be prosecuted under the Trademarks Act, 1999, Copyright Act, 1957, and the Information Technology Act, 2000.</Alert>
      </Section>

      <Section num="4" title="Grievance Officer">
        <Sub>In accordance with Rule 3(11) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the DPDP Act, 2023, we have designated a Grievance Officer:</Sub>
        <List items={[
          `Name: ${GRIEVANCE_OFFICER}`,
          `Designation: Grievance Officer`,
          `Email: ${GRIEVANCE_EMAIL}`,
          `Address: ${ADDRESS}`,
          `Working Hours: Monday to Saturday, 9:00 AM – 6:00 PM IST`,
          `Response Time: Within 30 days of receipt`,
        ]} />
      </Section>

      <Section num="5" title="DMCA & Copyright Takedown">
        <Sub>If you believe that content on our platform infringes your copyright, please submit a written notice to {EMAIL} containing: (a) identification of the copyrighted work; (b) identification of the infringing material with sufficient detail to locate it; (c) your contact information; (d) a statement of good faith belief; (e) a statement of accuracy under penalty of perjury; and (f) your physical or electronic signature. We will respond within 15 business days.</Sub>
      </Section>

      <Section num="6" title="Anti-Fraud & Security Notice">
        <Sub>{COMPANY} employs advanced fraud detection, IP monitoring, behavioral analytics, and security systems to protect our platform and users. We cooperate fully with law enforcement agencies in investigations of fraud, cybercrime, and other illegal activities. Users engaging in fraudulent activities will be reported to the Cyber Crime Cell and relevant authorities.</Sub>
      </Section>

      <Section num="7" title="Strict Enforcement Policy">
        <Alert>
          {COMPANY} maintains a zero-tolerance policy toward platform abuse. The following enforcement actions may be taken without prior notice: permanent account suspension, order cancellation and fund forfeiture, IP address blocking, legal proceedings for damages, criminal complaints with law enforcement, reporting to payment fraud databases, and civil suits for injunctive relief and monetary damages.
        </Alert>
      </Section>

      <Section num="8" title="Contact for Legal Matters">
        <List items={[
          `Legal & Compliance: ${EMAIL}`,
          `Grievance Officer: ${GRIEVANCE_EMAIL}`,
          `Customer Support: ${SUPPORT}`,
          `Phone: ${PHONE}`,
          `Address: ${ADDRESS}`,
        ]} />
      </Section>

    </LegalPage>
  );
}

export function ReturnPolicy() {
  return (
    <LegalPage title="Return Policy" lastUpdated="January 1, 2026">
      <InfoBox>Our Return Policy is designed to be fair, transparent, and compliant with the Consumer Protection Act, 2019. Please read this policy carefully before initiating a return.</InfoBox>

      <Section num="1" title="Return Window">
        <Sub>All return requests must be initiated within <strong>7 days</strong> of the delivery date. Returns requested after this window will not be accepted under any circumstances, except where required by applicable law.</Sub>
      </Section>

      <Section num="2" title="Return Conditions">
        <List items={[
          'Product must be unused, unworn, and unwashed',
          'All original tags, labels, and packaging must be intact',
          'Product must be in its original condition with no signs of use',
          'Original invoice or order confirmation must be included',
          'Photographic evidence of the issue must be provided',
        ]} />
        <Alert>Products that do not meet these conditions will be rejected and returned to the customer at their expense.</Alert>
      </Section>

      <Section num="3" title="How to Return">
        <List items={[
          '1. Go to My Orders in your account',
          '2. Select the order and click "Request Return"',
          '3. Choose the item and select return reason',
          '4. Upload photos of the product',
          '5. Submit — we will review within 48 hours',
          '6. If approved, follow the pickup/shipping instructions provided',
        ]} />
      </Section>

      <Section num="4" title="Refund After Return">
        <Sub>Once the returned product is received and passes quality inspection, your refund will be processed within 5–7 business days to the original payment method. You will receive an email confirmation when the refund is initiated.</Sub>
      </Section>

      <Section num="5" title="Non-Returnable Items">
        <List items={[
          'Innerwear and intimate apparel',
          'Worn, washed, or altered products',
          'Products with removed tags',
          'Final sale or clearance items',
          'Customized products',
        ]} />
      </Section>
    </LegalPage>
  );
}
