import { useEffect } from 'react';

export const BRAND    = 'Shri Ram Clothings';
export const OPERATOR = 'Dinesh Global Enterprise Private Limited';
export const COMPANY  = OPERATOR; // alias for backward compat
export const EMAIL    = 'shriramclothings.com';
export const SUPPORT  = 'shriramclothings.com';
export const ADDRESS  = 'Silver Square Link, Near Sravan Choukdi, Bharuch, Gujarat – 392001, India';
export const PHONE    = '+91 7984626447';
export const WEBSITE  = 'https://shriramclothings.in';
export const GRIEVANCE_OFFICER = 'Mayur Rawal';
export const GRIEVANCE_EMAIL   = 'shriramclothings.com';

// Legal identity line used across all policy pages
export const LEGAL_IDENTITY = `${BRAND} is an independent men's fashion and ecommerce brand. The ecommerce platform, infrastructure, technical operations, and platform management services are operated and supported by ${OPERATOR}. ${OPERATOR} acts solely as the managing, operational, technology, and support partner for ${BRAND}. The brand identity, business operations, and associated intellectual assets of ${BRAND} remain independently associated with ${BRAND}.`;

export default function LegalPage({ title, lastUpdated, children }) {
  useEffect(() => {
    document.title = `${title} — ${BRAND}`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [title]);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: 80 }}>

      {/* Hero Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderBottom: '1px solid rgba(249,115,22,0.2)', padding: '56px 0 40px' }}>
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(249,115,22,0.12)', color: '#fb923c', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 100, marginBottom: 16 }}>
             Legal Document
          </div>
          <h1 className="font-display" style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.15 }}>{title}</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            <strong style={{ color: '#94a3b8' }}>{BRAND}</strong>
            {' '}&nbsp;·&nbsp; Platform managed & operated by{' '}
            <strong style={{ color: '#94a3b8' }}>{OPERATOR}</strong>
            {lastUpdated && <> &nbsp;·&nbsp; Last Updated: <strong style={{ color: '#fb923c' }}>{lastUpdated}</strong></>}
          </p>
        </div>
      </div>

      {/* Document Body */}
      <div className="wrap" style={{ maxWidth: 900, paddingTop: 40 }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: 'clamp(24px, 5vw, 52px)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', lineHeight: 1.8, color: '#374151', fontSize: 14 }}>
          {children}
        </div>

        {/* Contact block */}
        <div style={{ marginTop: 28, background: '#fff7ed', borderRadius: 12, border: '1px solid #fed7aa', padding: '16px 20px', fontSize: 13, color: '#92400e' }}>
          <strong>Questions about this policy?</strong> Contact our Legal & Compliance team at{' '}
          <a href={`mailto:${EMAIL}`} style={{ color: '#f97316', fontWeight: 600 }}>{EMAIL}</a>
          {' '}or write to: <strong>{ADDRESS}</strong>
        </div>
      </div>
    </div>
  );
}

export function Section({ num, title, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
        {num && <span style={{ minWidth: 26, height: 26, background: '#f97316', color: '#fff', borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{num}</span>}
        {title}
      </h2>
      <div style={{ paddingLeft: num ? 36 : 0 }}>{children}</div>
    </section>
  );
}

export function Sub({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {title && <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>}
      <div style={{ color: '#4b5563', lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

export function List({ items }) {
  return (
    <ul style={{ paddingLeft: 18, margin: '6px 0 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map((item, i) => <li key={i} style={{ color: '#4b5563', lineHeight: 1.7 }}>{item}</li>)}
    </ul>
  );
}

export function Alert({ children }) {
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', margin: '12px 0', fontSize: 13, color: '#991b1b', fontWeight: 500 }}>
       {children}
    </div>
  );
}

export function InfoBox({ children }) {
  return (
    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', margin: '12px 0', fontSize: 13, color: '#1e40af' }}>
      ℹ {children}
    </div>
  );
}
