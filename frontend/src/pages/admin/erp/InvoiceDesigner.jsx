import { useState, useEffect } from 'react';
import { Save, Printer, LayoutTemplate, Eye, RefreshCw, Image } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import InvoicePrint from './InvoicePrint';

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

const LAYOUTS = [
  { key: '58mm',  label: '58mm Thermal' },
  { key: '80mm',  label: '80mm Thermal' },
  { key: 'A4',    label: 'A4 Portrait' },
];

const SAMPLE_SALE = {
  bill_no: 'BILL-2025-001',
  created_at: new Date().toISOString(),
  customer_name: 'Rahul Sharma',
  payment_method: 'upi',
  total: 1299,
  discount_amount: 100,
  tax_amount: 65,
  round_off: -0.5,
  split_payment: [],
};

const SAMPLE_ITEMS = [
  { title: 'Cotton T-Shirt (L)', sku: 'SRC-2025-001', quantity: 2, unit_price: 499, tax_amount: 18, line_total: 998 },
  { title: 'Denim Jeans (32)', sku: 'SRC-2025-002', quantity: 1, unit_price: 599, tax_amount: 47, line_total: 599 },
];

const DEFAULT_LAYOUT = {
  template: 'A4',
  show_logo: true,
  show_gst: true,
  show_address: true,
  show_phone: true,
  show_upi_qr: true,
  show_barcode: false,
  show_description: true,
  show_qty: true,
  show_rate: true,
  show_tax_col: true,
  show_total_col: true,
  footer_text: 'Thank you for shopping with us!',
  thank_you_message: 'Visit us again!',
  tagline: '',
};

export default function InvoiceDesigner() {
  const [layout, setLayout]       = useState(DEFAULT_LAYOUT);
  const [business, setBusiness]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const set = (k, v) => setLayout(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/erp/settings');
        const bp = res.data.business_profile || {};
        const bs = res.data.business_settings || {};
        setBusiness({
          name: bp.name || 'Shri Ram Clothings',
          gst_number: bp.gst_number || '',
          address: bp.address || '',
          phone: bp.phone || '',
          email: bp.email || '',
          settings: bs,
        });
        if (bs.invoice_layout) {
          setLayout(prev => ({ ...prev, ...bs.invoice_layout }));
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/erp/settings', { business_settings: { invoice_layout: layout } });
      toast.success('Invoice layout saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintTest = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 300);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 40, borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  const sampleBusiness = {
    ...(business || {}),
    settings: {
      ...(business?.settings || {}),
      logo_url: business?.settings?.logo_url,
      upi_id: layout.show_upi_qr ? (business?.settings?.upi_ids?.[0] || '') : '',
      footer_text: layout.footer_text,
      thank_you_message: layout.thank_you_message,
    },
  };

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* Hidden print area — renders when showPreview is true */}
      {showPreview && (
        <div id="invoice-designer-preview" style={{ display: 'none' }}>
          <style>{`
            @media print {
              body > *:not(#invoice-designer-preview) { display: none !important; }
              #invoice-designer-preview { display: block !important; }
            }
          `}</style>
          <InvoicePrint
            layout={layout.template}
            sale={SAMPLE_SALE}
            items={SAMPLE_ITEMS}
            business={sampleBusiness}
            cashierName="Demo Cashier"
          />
        </div>
      )}

      {/* Left: Controls */}
      <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutTemplate size={18} color="#f97316" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Invoice Designer</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Customize your bill layout and branding</div>
            </div>
          </div>

          {/* Template selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Paper Template</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {LAYOUTS.map(l => (
                <button key={l.key} type="button" onClick={() => set('template', l.key)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                    borderColor: layout.template === l.key ? '#f97316' : '#e5e7eb',
                    background: layout.template === l.key ? '#fff7ed' : '#fff',
                    color: layout.template === l.key ? '#f97316' : '#6b7280',
                  }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility toggles */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...lbl, marginBottom: 8 }}>Show / Hide Elements</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['show_logo',        'Business Logo'],
                ['show_gst',         'GST Number'],
                ['show_address',     'Address'],
                ['show_phone',       'Phone / Email'],
                ['show_upi_qr',      'UPI QR Code'],
                ['show_barcode',     'Barcode on Receipt'],
                ['show_description', 'Item Description'],
                ['show_qty',         'Qty Column'],
                ['show_rate',        'Rate Column'],
                ['show_tax_col',     'Tax Column'],
                ['show_total_col',   'Total Column'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 8px', borderRadius: 8, border: `1.5px solid ${layout[key] ? '#fed7aa' : '#f3f4f6'}`, background: layout[key] ? '#fff7ed' : '#fafafa', fontSize: 12, fontWeight: 500 }}>
                  <input type="checkbox" checked={!!layout[key]} onChange={e => set(key, e.target.checked)}
                    style={{ accentColor: '#f97316', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ color: layout[key] ? '#c2410c' : '#374151' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Text fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={lbl}>Tagline</label>
              <input value={layout.tagline || ''} onChange={e => set('tagline', e.target.value)} style={inp} placeholder="e.g. Premium Men's Fashion" />
            </div>
            <div>
              <label style={lbl}>Footer Text</label>
              <input value={layout.footer_text || ''} onChange={e => set('footer_text', e.target.value)} style={inp} placeholder="Thank you for shopping with us!" />
            </div>
            <div>
              <label style={lbl}>Thank You Message</label>
              <input value={layout.thank_you_message || ''} onChange={e => set('thank_you_message', e.target.value)} style={inp} placeholder="Visit us again!" />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Layout'}
          </button>
          <button onClick={handlePrintTest}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Printer size={14} /> Print Test Invoice
          </button>
        </div>

        {business?.settings?.logo_url && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={business.settings.logo_url} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              <div style={{ fontWeight: 600, color: '#374151' }}>Logo loaded from settings</div>
              <div>Update it in the Settings → Business Profile tab</div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Live preview */}
      <div style={{ width: 360, flexShrink: 0 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 13, fontWeight: 700, color: '#111827' }}>
            <Eye size={14} color="#f97316" /> Live Preview — {LAYOUTS.find(l => l.key === layout.template)?.label || layout.template}
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, background: '#fafafa', maxHeight: 640, overflowY: 'auto' }}>
            <div style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: '118%' }}>
              <InvoicePrint
                layout={layout.template}
                sale={SAMPLE_SALE}
                items={SAMPLE_ITEMS}
                business={sampleBusiness}
                cashierName="Demo Cashier"
              />
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
            Preview uses sample data. Print to see actual layout at scale.
          </div>
        </div>
      </div>
    </div>
  );
}
