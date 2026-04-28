import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, CheckCircle, Upload, X, ChevronDown, ChevronUp, Copy, Search } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const SUBJECTS = ['Order Issue', 'Product Query', 'Refund Request', 'Complaint', 'Shipping Issue', 'Payment Issue', 'Other'];

const FAQS = [
  { q: 'How long does delivery take?', a: 'Standard delivery takes 3–7 business days. Express delivery is available at checkout for 1–2 business days.' },
  { q: 'What is your return policy?', a: 'We offer a 7-day return policy. Items must be unused, unwashed, and in original packaging with tags attached.' },
  { q: 'How do I track my order?', a: 'Once your order is shipped, you will receive a tracking link via email. You can also check order status in My Orders section.' },
  { q: 'Can I change or cancel my order?', a: 'Orders can be cancelled within 2 hours of placement. After that, please contact us and we will do our best to help.' },
  { q: 'Do you offer Cash on Delivery?', a: 'Currently we accept online payments via Razorpay (UPI, Cards, Net Banking). COD is not available at this time.' },
];

const inp = { width: '100%', padding: '11px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff', transition: 'border-color 0.15s, box-shadow 0.15s' };

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '', priority: 'medium' });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null); // ticket_id
  const [openFaq, setOpenFaq] = useState(null);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error('File must be under 5MB');
    setFile(f);
    setFilePreview(f.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Please enter your name');
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error('Please enter a valid email');
    if (!form.subject) return toast.error('Please select a subject');
    if (!form.message.trim() || form.message.length < 10) return toast.error('Message must be at least 10 characters');

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (file) fd.append('attachment', file);
      const res = await api.post('/contact', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSubmitted(res.data.ticket_id);
      toast.success('Query submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>

      {/* Hero */}
      <div style={{ background: '#111827', padding: '48px 0 40px' }}>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(249,115,22,0.12)', color: '#fb923c', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 100, marginBottom: 16 }}>
            💬 Support
          </div>
          <h1 className="font-display" style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, color: '#fff', marginBottom: 12 }}>
            How can we help you?
          </h1>
          <p style={{ fontSize: 15, color: '#9ca3af', maxWidth: 480, margin: '0 auto' }}>
            Our support team typically responds within 24–48 hours. We're here to help!
          </p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 64 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }} className="product-grid">

          {/* ── Contact Form ── */}
          <div>
            {submitted ? (
              /* Success state */
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '48px 32px', textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={36} color="#22c55e" />
                </div>
                <h2 className="font-display" style={{ fontSize: 24, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Query Submitted!</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
                  We've received your message and sent a confirmation to your email.
                </p>

                {/* Ticket ID box */}
                <div style={{ background: '#f9fafb', borderRadius: 12, padding: '16px 24px', display: 'inline-block', marginBottom: 8, border: '1px solid #f3f4f6' }}>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Ticket ID</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#f97316', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{submitted}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(submitted); toast.success('Ticket ID copied!'); }}
                      title="Copy Ticket ID"
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}>
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>Expected response: <strong style={{ color: '#374151' }}>24–48 hours</strong></p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                  <Link to={`/track-query?id=${submitted}`} className="btn-primary"
                    style={{ padding: '11px 24px', borderRadius: 12, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Search size={15} /> Track My Query
                  </Link>
                  <button onClick={() => { setSubmitted(null); setForm({ name: '', email: '', phone: '', subject: '', message: '', priority: 'medium' }); setFile(null); setFilePreview(''); }}
                    className="btn-outline" style={{ padding: '11px 24px', borderRadius: 12, fontSize: 14 }}>
                    Submit Another
                  </button>
                </div>
              </div>
            ) : (
              /* Form */
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '28px 24px' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Send us a message</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>Fill in the form below and we'll get back to you shortly.</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-grid-2">
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Full Name *</label>
                      <input value={form.name} onChange={set('name')} placeholder="Your full name" style={inp}
                        onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Address *</label>
                      <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" style={inp}
                        onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Phone <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                      <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" style={inp}
                        onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Subject *</label>
                      <select value={form.subject} onChange={set('subject')} style={{ ...inp, cursor: 'pointer' }}
                        onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}>
                        <option value="">Select a subject</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Message *</label>
                    <textarea value={form.message} onChange={set('message')} placeholder="Describe your issue or query in detail..." rows={5}
                      style={{ ...inp, resize: 'vertical', minHeight: 120 }}
                      onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }} />
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{form.message.length} characters (min 10)</p>
                  </div>

                  {/* Attachment */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Attachment <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional, max 5MB)</span>
                    </label>
                    {filePreview ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 14px' }}>
                        <Upload size={16} color="#f97316" />
                        <span style={{ fontSize: 13, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filePreview}</span>
                        <button type="button" onClick={() => { setFile(null); setFilePreview(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={15} /></button>
                      </div>
                    ) : (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, border: '2px dashed #e5e7eb', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}>
                        <Upload size={18} color="#9ca3af" />
                        <span style={{ fontSize: 13, color: '#9ca3af' }}>Click to upload image or PDF</span>
                        <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
                      </label>
                    )}
                  </div>

                  <button type="submit" disabled={loading} className="btn-orange"
                    style={{ padding: '13px', borderRadius: 12, fontSize: 15, width: '100%', marginTop: 4 }}>
                    {loading ? 'Submitting...' : 'Submit Query'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* ── Right: Info + FAQs ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Contact info */}
            <div style={{ background: '#111827', borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Contact Information</h3>
              {[
                { icon: Mail,  label: 'Email', value: 'support@shriramclothings.com', href: 'mailto:support@shriramclothings.com' },
                { icon: Phone, label: 'Phone', value: '+91 98765 43210', href: 'tel:+919876543210' },
                { icon: MapPin,label: 'Address', value: 'Mumbai, Maharashtra, India', href: null },
                { icon: Clock, label: 'Working Hours', value: 'Mon–Sat, 10am–7pm IST', href: null },
              ].map(({ icon: Icon, label, value, href }) => (
                <div key={label} style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 38, height: 38, background: 'rgba(249,115,22,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color="#f97316" />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</p>
                    {href
                      ? <a href={href} style={{ fontSize: 13, color: '#d1d5db', textDecoration: 'none' }}>{value}</a>
                      : <p style={{ fontSize: 13, color: '#d1d5db' }}>{value}</p>
                    }
                  </div>
                </div>
              ))}

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,0.1)', borderRadius: 10, padding: '10px 14px' }}>
                  <Clock size={14} color="#fb923c" />
                  <p style={{ fontSize: 12, color: '#fb923c', fontWeight: 600 }}>Expected response: 24–48 hours</p>
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Frequently Asked Questions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {FAQS.map((faq, i) => (
                  <div key={i} style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: openFaq === i ? '#fff7ed' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 10, transition: 'background 0.15s' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>{faq.q}</span>
                      {openFaq === i ? <ChevronUp size={15} color="#f97316" style={{ flexShrink: 0 }} /> : <ChevronDown size={15} color="#9ca3af" style={{ flexShrink: 0 }} />}
                    </button>
                    {openFaq === i && (
                      <div style={{ padding: '0 14px 14px', background: '#fff7ed' }}>
                        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
