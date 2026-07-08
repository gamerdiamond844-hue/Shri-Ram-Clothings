import LegalPage, { Section, Sub, List, Alert, InfoBox, BRAND, COMPANY, EMAIL, ADDRESS, WEBSITE } from './LegalPage';

export default function TermsConditions() {
  return (
    <LegalPage title="Terms & Conditions" lastUpdated="January 1, 2026">

      <InfoBox>
        These Terms & Conditions ("Terms") constitute a legally binding agreement between you ("User", "Customer", "You") and {COMPANY} ("Company", "We", "Us"), the owner and operator of {BRAND}. By accessing, browsing, registering, or transacting on our platform, you unconditionally accept these Terms. If you do not agree, you must immediately cease use of the platform.
      </InfoBox>

      <Section num="1" title="Acceptance & Eligibility">
        <Sub title="1.1 Legal Capacity">
          By using this platform, you represent and warrant that: (a) you are at least 18 years of age; (b) you have the legal capacity to enter into binding contracts under Indian law; (c) you are not barred from receiving services under applicable law; and (d) all information you provide is accurate, current, and complete.
        </Sub>
        <Sub title="1.2 Minor Users">
          Individuals under 18 years of age may use the platform only under the supervision and with the express consent of a parent or legal guardian, who assumes full responsibility for all transactions and activities.
        </Sub>
        <Alert>Use of this platform by individuals under 18 without parental supervision is strictly prohibited. The Company reserves the right to cancel orders and suspend accounts where minor usage is detected without proper authorization.</Alert>
      </Section>

      <Section num="2" title="Account Registration & Security">
        <Sub title="2.1 Account Creation">
          To access certain features, you must register an account by providing accurate personal information. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
        </Sub>
        <Sub title="2.2 Account Security Obligations">
          <List items={[
            'You must immediately notify us of any unauthorized access to your account at ' + EMAIL,
            'You must not share your account credentials with any third party',
            'You must not create multiple accounts for the same individual',
            'You must not use automated tools to create or manage accounts',
            'You must not impersonate any person or entity',
          ]} />
        </Sub>
        <Sub title="2.3 Account Termination Rights">
          We reserve the absolute right to suspend, restrict, or permanently terminate any account at our sole discretion, without prior notice, if we determine that the account has been used in violation of these Terms, applicable law, or in a manner detrimental to the platform or other users.
        </Sub>
      </Section>

      <Section num="3" title="Products, Pricing & Availability">
        <Sub title="3.1 Product Descriptions">
          We make every effort to display product information accurately. However, we do not warrant that product descriptions, images, colors, sizes, or other content are completely accurate, complete, or error-free. Product images are for illustrative purposes only; actual products may vary slightly due to photography lighting, screen calibration, and manufacturing variations.
        </Sub>
        <Sub title="3.2 Pricing Policy">
          <List items={[
            'All prices are displayed in Indian Rupees (INR) and are inclusive of applicable GST unless stated otherwise',
            'Prices are subject to change without prior notice',
            'In the event of a pricing error, we reserve the right to cancel orders placed at incorrect prices',
            'Promotional prices are valid only for the specified duration and cannot be applied retroactively',
            'We are not obligated to honor prices resulting from technical errors or unauthorized modifications',
          ]} />
        </Sub>
        <Sub title="3.3 Product Availability">
          All products are subject to availability. We reserve the right to limit quantities, discontinue products, or refuse orders at our discretion. In the event a product becomes unavailable after order placement, we will notify you and process a full refund.
        </Sub>
        <Sub title="3.4 Size & Fit Disclaimer">
          Fashion sizing varies by brand, style, and manufacturing batch. We provide size guides as a reference only. We strongly recommend consulting our size chart before purchase. Size-related dissatisfaction does not automatically qualify for a return unless the product is demonstrably defective or incorrectly labeled.
        </Sub>
      </Section>

      <Section num="4" title="Orders & Contracts">
        <Sub title="4.1 Order Placement">
          Placing an order constitutes an offer to purchase. A binding contract is formed only upon our confirmation of the order via email or platform notification. We reserve the right to reject any order for any reason, including but not limited to: suspected fraud, payment failure, product unavailability, or policy violations.
        </Sub>
        <Sub title="4.2 Order Modification">
          Orders may be modified or cancelled only before they enter the processing stage. Once an order is confirmed and dispatched, modifications are not possible. Please refer to our Cancellation Policy for detailed procedures.
        </Sub>
        <Alert>Placing fraudulent, fake, or malicious orders is a criminal offense under the Information Technology Act, 2000 and the Indian Penal Code. Such activities will be reported to law enforcement authorities.</Alert>
      </Section>

      <Section num="5" title="Payments">
        <Sub title="5.1 Payment Methods">
          We currently accept only Cash on Delivery (COD) at checkout. Payment is collected by the delivery partner when your order is delivered.
        </Sub>
        <Sub title="5.2 Payment Security">
          We do not store complete card details on our servers. For COD orders, payment is handled in cash at the time of delivery, and no online payment credentials are collected.
        </Sub>
        <Sub title="5.3 Failed Payments">
          In the event of a COD payment issue, our delivery partner will notify you and work with you to complete the transaction at delivery. Orders are confirmed after placement and will not be processed without your payment.
        </Sub>
        <Sub title="5.4 Chargeback Policy">
          Initiating a chargeback without first attempting resolution through our customer support constitutes a breach of these Terms. We reserve the right to suspend accounts involved in fraudulent chargebacks and pursue legal remedies for damages incurred.
        </Sub>
      </Section>

      <Section num="6" title="Intellectual Property">
        <Sub>
          All content on the {BRAND} platform, including but not limited to logos, trademarks, product images, text, graphics, user interface design, software code, and databases, is the exclusive intellectual property of {COMPANY} or its licensors. No content may be reproduced, distributed, modified, publicly displayed, or used for commercial purposes without our express written consent.
        </Sub>
        <Alert>Unauthorized use of our intellectual property, including website cloning, content scraping, image theft, or brand impersonation, will result in immediate legal action including injunctions, damages claims, and criminal complaints.</Alert>
      </Section>

      <Section num="7" title="Prohibited Conduct">
        <Sub>The following activities are strictly prohibited on our platform:</Sub>
        <List items={[
          'Placing fake, fraudulent, or test orders with no intention to pay',
          'Using bots, scripts, or automated tools to access the platform',
          'Scraping, crawling, or harvesting data from the platform',
          'Reverse engineering, decompiling, or disassembling platform software',
          'Attempting to gain unauthorized access to any system or account',
          'Uploading malware, viruses, or malicious code',
          'Engaging in phishing, spoofing, or impersonation',
          'Manipulating product reviews or ratings',
          'Exploiting pricing errors, coupon systems, or promotional offers',
          'Creating multiple accounts to circumvent restrictions',
          'Reselling products purchased at promotional prices without authorization',
          'Harassing, threatening, or abusing other users or staff',
          'Violating any applicable local, national, or international law',
        ]} />
        <Alert>Violation of any prohibited conduct may result in immediate account suspension, order cancellation, forfeiture of funds, and civil or criminal legal proceedings.</Alert>
      </Section>

      <Section num="8" title="Limitation of Liability">
        <Sub>
          To the maximum extent permitted by applicable law, {COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or business opportunities, arising from your use of or inability to use the platform, even if we have been advised of the possibility of such damages.
        </Sub>
        <Sub>
          Our total aggregate liability to you for any claim arising from your use of the platform shall not exceed the amount paid by you for the specific transaction giving rise to the claim in the 3 months preceding the claim.
        </Sub>
      </Section>

      <Section num="9" title="Indemnification">
        <Sub>
          You agree to indemnify, defend, and hold harmless {COMPANY}, its directors, officers, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising from: (a) your use of the platform; (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) any content you submit to the platform.
        </Sub>
      </Section>

      <Section num="10" title="Governing Law & Jurisdiction">
        <Sub>
          These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from or relating to these Terms shall be subject to the exclusive jurisdiction of the courts located in Bharuch, Gujarat, India. You hereby consent to the personal jurisdiction of such courts and waive any objection to venue.
        </Sub>
      </Section>

      <Section num="11" title="Dispute Resolution & Arbitration">
        <Sub>
          In the event of any dispute, controversy, or claim arising out of or relating to these Terms, the parties shall first attempt to resolve the matter through good-faith negotiation. If unresolved within 30 days, the dispute shall be referred to binding arbitration under the Arbitration and Conciliation Act, 1996 (India). The arbitration shall be conducted by a sole arbitrator mutually agreed upon by the parties, in the English language, at Bharuch, Gujarat.
        </Sub>
      </Section>

      <Section num="12" title="Amendments">
        <Sub>
          We reserve the right to modify these Terms at any time. Updated Terms will be posted on the platform with a revised "Last Updated" date. Your continued use of the platform after such changes constitutes your acceptance of the new Terms. We recommend reviewing these Terms periodically.
        </Sub>
      </Section>

    </LegalPage>
  );
}
