/**
 * InvoicePrint.jsx — Reusable print-ready invoice renderer
 * Props:
 *   layout    : '58mm' | '80mm' | 'A4' (default 'A4')
 *   sale      : sale object from src_erp_sales
 *   items     : array of src_erp_sale_items rows
 *   business  : { name, gst_number, address, phone, email, settings: { logo_url, upi_id } }
 *   cashierName : string
 */
export default function InvoicePrint({ layout = 'A4', sale, items = [], business = {}, cashierName }) {
  const settings = business?.settings || {};
  const isThermal = layout === '58mm' || layout === '80mm';
  const width = layout === '58mm' ? '58mm' : layout === '80mm' ? '80mm' : '210mm';

  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '';

  // Payment methods display
  const paymentMethods = () => {
    if (sale?.split_payment && Array.isArray(sale.split_payment) && sale.split_payment.length > 1) {
      return sale.split_payment.map(p => `${p.method?.toUpperCase()}: ₹${fmt(p.amount)}`).join(' + ');
    }
    return (sale?.payment_method || 'cash').toUpperCase();
  };

  return (
    <>
      {/* Print styles injected at component level */}
      <style>{`
        @media print {
          body > *:not(#invoice-print-root) { display: none !important; }
          #invoice-print-root { display: block !important; }
          @page {
            size: ${isThermal ? width + ' auto' : 'A4'};
            margin: ${isThermal ? '3mm' : '10mm'};
          }
        }
        #invoice-print-root {
          font-family: ${isThermal ? 'monospace' : 'Arial, sans-serif'};
          font-size: ${isThermal ? '9pt' : '10pt'};
          color: #111;
          width: ${width};
          max-width: 100%;
          margin: 0 auto;
          padding: ${isThermal ? '4px' : '16px'};
          box-sizing: border-box;
        }
        #invoice-print-root .inv-header { text-align: center; margin-bottom: 8px; }
        #invoice-print-root .inv-logo { max-width: 60px; max-height: 40px; margin-bottom: 4px; }
        #invoice-print-root .inv-biz-name { font-size: ${isThermal ? '11pt' : '14pt'}; font-weight: bold; }
        #invoice-print-root .inv-biz-sub  { font-size: ${isThermal ? '8pt' : '9pt'}; color: #444; }
        #invoice-print-root .inv-divider  { border: none; border-top: 1px dashed #333; margin: 6px 0; }
        #invoice-print-root .inv-meta     { font-size: ${isThermal ? '8pt' : '9pt'}; margin-bottom: 6px; }
        #invoice-print-root .inv-meta-row { display: flex; justify-content: space-between; padding: 1px 0; }
        #invoice-print-root table  { width: 100%; border-collapse: collapse; margin: 6px 0; }
        #invoice-print-root thead tr { border-bottom: 1px solid #333; }
        #invoice-print-root th { text-align: left; font-size: ${isThermal ? '8pt' : '9pt'}; padding: 2px 4px; font-weight: bold; }
        #invoice-print-root td { padding: 2px 4px; font-size: ${isThermal ? '8pt' : '9pt'}; vertical-align: top; }
        #invoice-print-root .amt { text-align: right; }
        #invoice-print-root .inv-totals { font-size: ${isThermal ? '9pt' : '10pt'}; }
        #invoice-print-root .inv-totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
        #invoice-print-root .inv-totals .grand { font-weight: bold; font-size: ${isThermal ? '11pt' : '13pt'}; border-top: 1px solid #333; padding-top: 4px; margin-top: 2px; }
        #invoice-print-root .inv-footer { text-align: center; font-size: 8pt; color: #555; margin-top: 10px; }
      `}</style>

      <div id="invoice-print-root">
        {/* Header */}
        <div className="inv-header">
          {settings.logo_url && <img src={settings.logo_url} alt="logo" className="inv-logo" />}
          <div className="inv-biz-name">{business?.name || 'Shri Ram Clothings'}</div>
          {business?.address && <div className="inv-biz-sub">{business.address}</div>}
          {business?.phone   && <div className="inv-biz-sub">📞 {business.phone}</div>}
          {business?.gst_number && <div className="inv-biz-sub">GSTIN: {business.gst_number}</div>}
        </div>

        <hr className="inv-divider" />

        {/* Bill meta */}
        <div className="inv-meta">
          <div className="inv-meta-row"><span><b>Bill No:</b> {sale?.bill_no}</span><span>{fmtDate(sale?.created_at)}</span></div>
          {cashierName && <div className="inv-meta-row"><span><b>Cashier:</b> {cashierName}</span></div>}
          {sale?.customer_name && <div className="inv-meta-row"><span><b>Customer:</b> {sale.customer_name}</span></div>}
        </div>

        <hr className="inv-divider" />

        {/* Items table */}
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th className="amt">Qty</th>
              <th className="amt">Rate</th>
              {!isThermal && <th className="amt">GST</th>}
              <th className="amt">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>
                  <div>{item.title}</div>
                  {item.sku && <div style={{ fontSize: '7pt', color: '#666' }}>{item.sku}</div>}
                </td>
                <td className="amt">{item.quantity}</td>
                <td className="amt">₹{fmt(item.unit_price)}</td>
                {!isThermal && <td className="amt">₹{fmt(item.tax_amount)}</td>}
                <td className="amt">₹{fmt(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="inv-divider" />

        {/* Totals */}
        <div className="inv-totals">
          {sale?.discount_amount > 0 && (
            <div className="row"><span>Discount</span><span>- ₹{fmt(sale.discount_amount)}</span></div>
          )}
          {sale?.tax_amount > 0 && (
            <div className="row"><span>Tax (GST)</span><span>₹{fmt(sale.tax_amount)}</span></div>
          )}
          {sale?.round_off !== 0 && sale?.round_off != null && (
            <div className="row"><span>Round Off</span><span>₹{fmt(sale.round_off)}</span></div>
          )}
          <div className="row grand"><span>TOTAL</span><span>₹{fmt(sale?.total)}</span></div>
          <div className="row"><span>Payment</span><span>{paymentMethods()}</span></div>
        </div>

        {/* UPI QR placeholder */}
        {settings.upi_id && (
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <div style={{ fontSize: '8pt', color: '#444', marginBottom: 3 }}>UPI: {settings.upi_id}</div>
            {/* Simple SVG QR placeholder */}
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect width="60" height="60" fill="none" stroke="#333" strokeWidth="2" />
              <rect x="5" y="5" width="20" height="20" fill="none" stroke="#333" strokeWidth="2" />
              <rect x="9" y="9" width="12" height="12" fill="#333" />
              <rect x="35" y="5" width="20" height="20" fill="none" stroke="#333" strokeWidth="2" />
              <rect x="39" y="9" width="12" height="12" fill="#333" />
              <rect x="5" y="35" width="20" height="20" fill="none" stroke="#333" strokeWidth="2" />
              <rect x="9" y="39" width="12" height="12" fill="#333" />
              <text x="30" y="53" textAnchor="middle" fontSize="5" fill="#333">SCAN &amp; PAY</text>
            </svg>
          </div>
        )}

        <hr className="inv-divider" />

        <div className="inv-footer">
          {settings.footer_text || 'Thank you for shopping with us!'}
          {settings.thank_you_message && <div>{settings.thank_you_message}</div>}
        </div>
      </div>
    </>
  );
}
