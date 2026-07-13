import { useState, useEffect } from 'react';
import { Save, Building2, Star, Smartphone, Printer as PrinterIcon, RefreshCw } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

const TABS = [
  { key: 'profile',  label: 'Business Profile',  icon: Building2 },
  { key: 'loyalty',  label: 'Loyalty Settings',  icon: Star },
  { key: 'upi',      label: 'UPI IDs',            icon: Smartphone },
  { key: 'printers', label: 'Printer Profiles',   icon: PrinterIcon },
];

export default function AdminSettings() {
  const [tab, setTab]       = useState('profile');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // Form states
  const [profile, setProfile]   = useState({ name: '', gst_number: '', phone: '', email: '', address: '', currency: 'INR', timezone: 'Asia/Kolkata' });
  const [loyalty, setLoyalty]   = useState({ points_per_rupee: 1, min_redemption: 100 });
  const [upiIds, setUpiIds]     = useState('');
  const [printers, setPrinters] = useState({ default_printer: 'a4' });

  useEffect(() => {
    setLoading(true);
    api.get('/erp/settings').then(res => {
      const d = res.data;
      const bp = d.business_profile || {};
      const bs = d.business_settings || {};
      setProfile({
        name: bp.name || '', gst_number: bp.gst_number || '',
        phone: bp.phone || '', email: bp.email || '',
        address: bp.address || '', currency: bp.currency || 'INR',
        timezone: bp.timezone || 'Asia/Kolkata',
      });
      setLoyalty({
        points_per_rupee: bs.loyalty_rate || 1,
        min_redemption: bs.min_redemption || 100,
      });
      setUpiIds((bs.upi_ids || []).join('\n'));
      setPrinters({ default_printer: bs.default_printer || 'a4' });
      setSettings(d);
    }).catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/erp/settings/business', { business_profile: profile });
      toast.success('Business profile saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const saveLoyalty = async () => {
    setSaving(true);
    try {
      await api.put('/erp/settings/business', { loyalty_rate: Number(loyalty.points_per_rupee), min_redemption: Number(loyalty.min_redemption) });
      toast.success('Loyalty settings saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const saveUpi = async () => {
    setSaving(true);
    try {
      const ids = upiIds.split('\n').map(s => s.trim()).filter(Boolean);
      await api.put('/erp/settings/business', { upi_ids: ids });
      toast.success('UPI IDs saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const savePrinters = async () => {
    setSaving(true);
    try {
      await api.put('/erp/settings/business', { default_printer: printers.default_printer });
      toast.success('Printer settings saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Loading settings…</div>;

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* Sidebar tabs */}
      <div style={{ width: 200, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #f3f4f6' }}>ERP Settings</div>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', cursor: 'pointer', background: active ? '#fff7ed' : 'transparent', borderLeft: active ? '3px solid #f97316' : '3px solid transparent', textAlign: 'left', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <Icon size={14} color={active ? '#f97316' : '#9ca3af'} />
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#f97316' : '#374151' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 22 }}>

        {/* Business Profile */}
        {tab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Business Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['name','Business Name'], ['gst_number','GST Number'], ['phone','Phone'], ['email','Email'], ['currency','Currency'], ['timezone','Timezone']].map(([k, label]) => (
                <div key={k}>
                  <label style={lbl}>{label}</label>
                  <input value={profile[k]} onChange={e => setProfile(p => ({ ...p, [k]: e.target.value }))} placeholder={label} style={inp} />
                </div>
              ))}
            </div>
            <div>
              <label style={lbl}>Address</label>
              <textarea value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} />
            </div>
            <button onClick={saveProfile} disabled={saving} className="btn-orange" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, width: 'fit-content', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        )}

        {/* Loyalty Settings */}
        {tab === 'loyalty' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Loyalty Points</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Points per ₹1 Spent</label>
                <input type="number" min="0" step="0.1" value={loyalty.points_per_rupee} onChange={e => setLoyalty(p => ({ ...p, points_per_rupee: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>Minimum Redemption (points)</label>
                <input type="number" min="0" value={loyalty.min_redemption} onChange={e => setLoyalty(p => ({ ...p, min_redemption: e.target.value }))} style={inp} />
              </div>
            </div>
            <button onClick={saveLoyalty} disabled={saving} className="btn-orange" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, width: 'fit-content', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Loyalty Settings'}
            </button>
          </div>
        )}

        {/* UPI IDs */}
        {tab === 'upi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>UPI Payment IDs</h3>
            <div style={{ fontSize: 12, color: '#6b7280', background: '#eff6ff', borderRadius: 8, padding: '8px 12px' }}>
              Enter one UPI ID per line. These are used to generate QR codes at POS checkout.
            </div>
            <div>
              <label style={lbl}>UPI IDs (one per line)</label>
              <textarea value={upiIds} onChange={e => setUpiIds(e.target.value)} rows={6} placeholder="example@upi&#10;merchant@paytm&#10;shop@gpay" style={{ ...inp, resize: 'vertical', fontFamily: 'monospace' }} />
            </div>
            <button onClick={saveUpi} disabled={saving} className="btn-orange" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, width: 'fit-content', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save UPI IDs'}
            </button>
          </div>
        )}

        {/* Printer Profiles */}
        {tab === 'printers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Printer Profiles</h3>
            <div>
              <label style={lbl}>Default Printer</label>
              <select value={printers.default_printer} onChange={e => setPrinters(p => ({ ...p, default_printer: e.target.value }))} style={{ ...inp, maxWidth: 240 }}>
                <option value="thermal">Thermal 58mm</option>
                <option value="thermal-80">Thermal 80mm</option>
                <option value="a4">A4 Invoice</option>
                <option value="barcode">Barcode Label 50×25mm</option>
              </select>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14, fontSize: 13, color: '#374151' }}>
              <strong>Configured Profiles:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 18 }}>
                {(settings?.printer_profiles || []).map(p => (
                  <li key={p.key} style={{ marginBottom: 4 }}>{p.label} {p.key === printers.default_printer && <span style={{ color: '#f97316', fontWeight: 600 }}>(default)</span>}</li>
                ))}
              </ul>
            </div>
            <button onClick={savePrinters} disabled={saving} className="btn-orange" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, width: 'fit-content', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Printer Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
