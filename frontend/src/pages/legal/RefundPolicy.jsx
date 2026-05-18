import LegalPage, { Section, Sub, List, Alert, InfoBox, BRAND, COMPANY, EMAIL, SUPPORT } from './LegalPage';

export default function RefundPolicy() {
  return (
    <LegalPage title="Refund & Return Policy" lastUpdated="January 1, 2026">

      <InfoBox>
        {BRAND}, operated by {COMPANY}, is committed to ensuring customer satisfaction while maintaining fair and transparent return and refund practices. This policy is designed in compliance with the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020.
      </InfoBox>

      <Section num="1" title="Return Eligibility">
        <Sub title="1.1 Eligible Return Conditions">
          A return request will be accepted only if the following conditions are met:
          <List items={[
            'The return request is raised within 7 days of delivery',
            'The product is unused, unwashed, and in its original condition',
            'All original tags, labels, and packaging are intact and attached',
            'The product is free from perfume, deodorant, stains, or any signs of use',
            'The product is accompanied by the original invoice or order confirmation',
            'The return is for a valid reason as specified in Section 1.2',
          ]} />
        </Sub>
        <Sub title="1.2 Valid Return Reasons">
          <List items={[
            'Product received is significantly different from the description or images on the platform',
            'Product received is defective, damaged, or has manufacturing defects',
            'Wrong product, size, or color delivered',
            'Product is incomplete (missing components or accessories as described)',
          ]} />
        </Sub>
        <Alert>Size dissatisfaction, change of mind, or personal preference are NOT valid return reasons unless the product is demonstrably defective or incorrectly described.</Alert>
      </Section>

      <Section num="2" title="Non-Returnable Items">
        <Sub>The following items are strictly non-returnable under any circumstances:</Sub>
        <List items={[
          'Innerwear, undergarments, and intimate apparel (for hygiene reasons)',
          'Products that have been worn, washed, altered, or dry-cleaned',
          'Products with removed or tampered tags and labels',
          'Products damaged due to customer misuse, negligence, or improper care',
          'Products purchased during final sale, clearance, or non-returnable promotional events',
          'Gift cards and digital vouchers',
          'Customized or personalized products',
          'Products returned after the 7-day return window',
        ]} />
      </Section>

      <Section num="3" title="Return Process">
        <Sub title="3.1 How to Initiate a Return">
          <List items={[
            'Step 1: Log in to your account and navigate to "My Orders"',
            'Step 2: Select the order and click "Request Return"',
            'Step 3: Select the item(s) and provide the return reason',
            'Step 4: Upload clear photographs of the product showing the defect or issue',
            'Step 5: Submit the request — our team will review within 48 business hours',
            'Step 6: Upon approval, a pickup will be scheduled or return shipping instructions provided',
          ]} />
        </Sub>
        <Sub title="3.2 Unboxing Video Recommendation">
          We strongly recommend recording an unboxing video when receiving your order. This serves as evidence in case of damage claims and significantly expedites the return approval process. Claims for damaged products without photographic or video evidence may be subject to additional verification.
        </Sub>
        <Sub title="3.3 Return Shipping">
          For approved returns due to our error (wrong/defective product), we will arrange a free pickup. For other eligible returns, the customer may be required to ship the product back at their own cost using a trackable courier service.
        </Sub>
      </Section>

      <Section num="4" title="Refund Policy">
        <Sub title="4.1 Refund Eligibility">
          Refunds are processed only after the returned product has been received, inspected, and approved by our quality control team. Refunds will be issued to the original payment method used for the purchase.
        </Sub>
        <Sub title="4.2 Refund Timelines">
          <List items={[
            'Paytm / Credit Card / Debit Card: 5–7 business days after approval',
            'UPI / Net Banking: 3–5 business days after approval',
            'Digital Wallets: 2–3 business days after approval',
            'Store Credit / Coupon: Issued within 24 hours of approval',
            'Cash on Delivery orders: Refunded via bank transfer within 7–10 business days',
          ]} />
        </Sub>
        <Sub title="4.3 Partial Refunds">
          In cases where only part of an order is returned, or where the returned product shows signs of use or damage not present at delivery, we reserve the right to issue a partial refund reflecting the diminished value of the returned item.
        </Sub>
        <Alert>Refunds will NOT be processed for returns that fail quality inspection, are received outside the return window, or are suspected to be fraudulent.</Alert>
      </Section>

      <Section num="5" title="Exchange Policy">
        <Sub>
          We offer exchanges for size or color variants subject to availability. Exchange requests must be raised within 7 days of delivery. The product must meet all return eligibility criteria. Exchanges are processed after the original product is received and inspected. If the requested exchange variant is unavailable, a refund will be issued.
        </Sub>
      </Section>

      <Section num="6" title="Damaged or Defective Products">
        <Sub>
          If you receive a damaged or defective product, you must report it within 48 hours of delivery by contacting {SUPPORT} with your order ID, photographs of the damage, and a brief description. Failure to report within this window may result in the claim being rejected. Upon verification, we will offer a replacement, exchange, or full refund at our discretion.
        </Sub>
      </Section>

      <Section num="7" title="Fraud Prevention in Returns">
        <Sub>
          We employ advanced fraud detection systems to identify return abuse, including but not limited to: returning used or different products, filing false damage claims, exploiting return policies for free products, and coordinated return fraud. Accounts found engaging in return fraud will be permanently suspended, and legal action may be pursued for recovery of losses.
        </Sub>
        <Alert>Returning a product different from what was delivered, or returning a used/damaged product while claiming it was received in that condition, constitutes fraud and will be prosecuted under applicable law.</Alert>
      </Section>

      <Section num="8" title="Chargeback & Payment Disputes">
        <Sub>
          Before initiating a chargeback with your bank or payment provider, we request that you contact our support team at {SUPPORT} to resolve the issue. Unauthorized chargebacks will be contested with full transaction evidence. Accounts with fraudulent chargebacks will be permanently banned and may face legal proceedings for recovery of disputed amounts plus associated costs.
        </Sub>
      </Section>

    </LegalPage>
  );
}
