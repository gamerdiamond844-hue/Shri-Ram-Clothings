import LegalPage, { Section, Sub, List, Alert, InfoBox, BRAND, COMPANY, SUPPORT } from './LegalPage';

export function ShippingPolicy() {
  return (
    <LegalPage title="Shipping & Delivery Policy" lastUpdated="January 1, 2026">
      <InfoBox>{BRAND} partners with leading logistics providers to ensure timely and secure delivery of your orders across India. This policy outlines our shipping practices, timelines, and responsibilities.</InfoBox>

      <Section num="1" title="Shipping Coverage">
        <Sub>We currently ship to all serviceable PIN codes across India. International shipping is not available at this time but is planned for future expansion. Serviceability to specific PIN codes is subject to our logistics partners' coverage and may change without prior notice.</Sub>
      </Section>

      <Section num="2" title="Processing Time">
        <List items={[
          'Orders placed before 2:00 PM IST on business days are processed the same day',
          'Orders placed after 2:00 PM IST are processed the next business day',
          'Orders placed on Sundays or public holidays are processed the next business day',
          'Processing time may extend during peak seasons, sales events, or unforeseen circumstances',
        ]} />
      </Section>

      <Section num="3" title="Delivery Timelines">
        <List items={[
          'Metro Cities (Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Kolkata): 2–4 business days',
          'Tier 2 & Tier 3 Cities: 4–7 business days',
          'Remote & Rural Areas: 7–12 business days',
          'North-East India & Hilly Regions: 7–14 business days',
        ]} />
        <Alert>Delivery timelines are estimates and not guarantees. Delays may occur due to weather conditions, logistics disruptions, public holidays, or force majeure events. We are not liable for delays beyond our reasonable control.</Alert>
      </Section>

      <Section num="4" title="Shipping Charges">
        <List items={[
          'Orders above ₹999: FREE standard shipping',
          'Orders below ₹999: Flat shipping fee of ₹99',
          'Express delivery (where available): Additional charges apply as displayed at checkout',
          'Cash on Delivery orders: Additional COD handling fee may apply',
        ]} />
      </Section>

      <Section num="5" title="Order Tracking">
        <Sub>Once your order is dispatched, you will receive a tracking ID via email and SMS. You can track your order in real-time through: (a) the "My Orders" section in your account; (b) the courier partner's website using the AWB number; or (c) our Track Order page. Tracking information may take up to 24 hours to update after dispatch.</Sub>
      </Section>

      <Section num="6" title="Failed Delivery & Re-Delivery">
        <Sub>If delivery fails due to an incorrect address, recipient unavailability, or refusal to accept, the courier will attempt re-delivery up to 3 times. After 3 failed attempts, the package will be returned to our warehouse. Re-shipping charges will apply for re-dispatch. We are not responsible for failed deliveries due to incorrect address information provided by the customer.</Sub>
      </Section>

      <Section num="7" title="Damaged in Transit">
        <Sub>If your order arrives visibly damaged, please refuse the delivery and immediately contact {SUPPORT} with photographs. If damage is discovered upon opening, report within 48 hours with photographic evidence. We will arrange a replacement or refund upon verification.</Sub>
      </Section>

      <Section num="8" title="Lost Shipments">
        <Sub>In the rare event of a lost shipment, we will initiate an investigation with our logistics partner. If the shipment is confirmed lost, we will dispatch a replacement or issue a full refund within 10 business days of confirmation. We are not liable for losses due to incorrect delivery addresses provided by the customer.</Sub>
      </Section>
    </LegalPage>
  );
}

export function CancellationPolicy() {
  return (
    <LegalPage title="Cancellation Policy" lastUpdated="January 1, 2026">
      <InfoBox>{BRAND} understands that circumstances may require order cancellation. This policy outlines the conditions and procedures for cancelling orders placed on our platform.</InfoBox>

      <Section num="1" title="Customer-Initiated Cancellations">
        <Sub title="1.1 Before Dispatch">
          Orders may be cancelled by the customer at no charge before the order enters the "Processing" or "Shipped" status. To cancel, navigate to "My Orders" in your account and select "Cancel Order." Refunds for prepaid orders will be processed within 5–7 business days.
        </Sub>
        <Sub title="1.2 After Dispatch">
          Once an order has been dispatched, it cannot be cancelled. You may initiate a return after delivery in accordance with our Return Policy. Refusing delivery of a dispatched order without valid reason may result in return shipping charges being deducted from your refund.
        </Sub>
        <Alert>Repeated order cancellations without valid reason may result in account restrictions or suspension of ordering privileges.</Alert>
      </Section>

      <Section num="2" title="Company-Initiated Cancellations">
        <Sub>We reserve the right to cancel any order under the following circumstances:</Sub>
        <List items={[
          'Product is out of stock or discontinued after order placement',
          'Payment verification fails or payment is declined',
          'Suspected fraudulent activity or policy violation',
          'Incorrect pricing due to technical error',
          'Delivery address is unserviceable',
          'Order placed using unauthorized promotional codes or exploited discounts',
          'Violation of our Terms & Conditions',
        ]} />
        <Sub>In all company-initiated cancellations, a full refund will be processed to the original payment method within 5–7 business days, except in cases of confirmed fraud.</Sub>
      </Section>

      <Section num="3" title="Cancellation of Fraudulent Orders">
        <Sub>Orders identified as fraudulent, placed using stolen payment credentials, or associated with suspicious activity will be cancelled immediately without notice. No refund will be issued for confirmed fraudulent transactions. Such cases will be reported to relevant law enforcement and payment fraud prevention agencies.</Sub>
      </Section>

      <Section num="4" title="Refund for Cancelled Orders">
        <List items={[
          'Prepaid orders cancelled before dispatch: Full refund within 5–7 business days',
          'COD orders cancelled before dispatch: No charge (order simply not fulfilled)',
          'Orders cancelled after dispatch: Refund processed after product return and inspection',
          'Company-cancelled orders (non-fraud): Full refund within 5–7 business days',
        ]} />
      </Section>
    </LegalPage>
  );
}

export function CookiesPolicy() {
  return (
    <LegalPage title="Cookies Policy" lastUpdated="January 1, 2026">
      <InfoBox>This Cookies Policy explains how {BRAND}, operated by {COMPANY}, uses cookies and similar tracking technologies on our platform. By continuing to use our website, you consent to our use of cookies as described in this policy.</InfoBox>

      <Section num="1" title="What Are Cookies?">
        <Sub>Cookies are small text files placed on your device by websites you visit. They are widely used to make websites work efficiently, provide analytics data, and deliver personalized experiences. Cookies may be "session cookies" (deleted when you close your browser) or "persistent cookies" (remain on your device for a set period).</Sub>
      </Section>

      <Section num="2" title="Types of Cookies We Use">
        <Sub title="2.1 Strictly Necessary Cookies">
          These cookies are essential for the platform to function and cannot be disabled. They include session management, authentication tokens, shopping cart data, and security cookies. Without these cookies, services you have requested cannot be provided.
        </Sub>
        <Sub title="2.2 Performance & Analytics Cookies">
          These cookies collect information about how visitors use our platform, including pages visited, time spent, and error messages. We use Google Analytics and similar tools. This data is aggregated and anonymized.
        </Sub>
        <Sub title="2.3 Functionality Cookies">
          These cookies remember your preferences such as language, currency, saved addresses, and display settings to provide a personalized experience.
        </Sub>
        <Sub title="2.4 Marketing & Targeting Cookies">
          These cookies track your browsing activity to deliver relevant advertisements and measure campaign effectiveness. They may be set by us or third-party advertising partners including Google Ads and Meta.
        </Sub>
        <Sub title="2.5 Security Cookies">
          Used for fraud detection, bot mitigation, CSRF protection, and monitoring suspicious activity patterns.
        </Sub>
      </Section>

      <Section num="3" title="Third-Party Cookies">
        <Sub>We use the following third-party services that may set cookies:</Sub>
        <List items={[
          'Google Analytics — Usage analytics and behavior tracking',
          'Google Ads — Advertising and remarketing',
          'Meta Pixel — Social media advertising and conversion tracking',
          'Paytm — Payment processing and fraud prevention',
          'Cloudinary — Media delivery optimization',
        ]} />
      </Section>

      <Section num="4" title="Managing Cookies">
        <Sub>You can control cookies through your browser settings. Most browsers allow you to refuse cookies, delete existing cookies, or be notified when cookies are set. Please note that disabling certain cookies may affect platform functionality. Browser-specific instructions are available at your browser's help documentation.</Sub>
        <InfoBox>Disabling essential cookies will prevent you from logging in, adding items to cart, or completing purchases on our platform.</InfoBox>
      </Section>

      <Section num="5" title="Cookie Retention Periods">
        <List items={[
          'Session cookies: Deleted when browser is closed',
          'Authentication cookies: 7 days',
          'Preference cookies: 1 year',
          'Analytics cookies: Up to 2 years',
          'Marketing cookies: Up to 90 days',
        ]} />
      </Section>
    </LegalPage>
  );
}
