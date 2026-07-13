const cardStyle = {
  background: '#fff',
  borderRadius: 18,
  border: '1px solid #e5e7eb',
  padding: 20,
};

const pillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: '#fff7ed',
  color: '#c2410c',
  border: '1px solid #fdba74',
};

export default function AdminModuleWorkspace({ module, user }) {
  const permissions = module?.permissions || [];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ ...cardStyle, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={pillStyle}>Integrated inside Admin Dashboard</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>{module?.label || 'Module'}</h2>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: '#6b7280', maxWidth: 780 }}>
                {module?.description || 'This ERP module is mounted directly inside the existing admin application and shares the same authentication, routing, and UI system.'}
              </p>
            </div>
          </div>

          <div style={{ minWidth: 220, display: 'grid', gap: 10 }}>
            <div style={{ ...cardStyle, background: '#f8fafc', padding: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current role</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{String(user?.role || 'unknown').replace(/_/g, ' ')}</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Route mode</div>
          <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: '#111827' }}>Client-side integrated</div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>Runs under the same admin route tree with no redirect, iframe, or second app.</div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Security</div>
          <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: '#111827' }}>Shared authentication</div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>Uses the existing session and role context already available inside the admin dashboard.</div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Permission guard</div>
          <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: '#111827' }}>{permissions.length ? permissions.join(', ') : 'Role-scoped module'}</div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>The sidebar and route access are filtered before the module renders.</div>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Foundation ready</div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280' }}>
            This workspace is now mounted as a first-class ERP module inside the existing admin shell. The next step for this module is to attach its dedicated tables, forms, APIs, background jobs, and audit trails.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            'Shared layout and top navigation',
            'Role-aware sidebar visibility',
            'Permission-aware route access',
            'Ready for tenant-aware APIs',
            'Ready for reporting and exports',
            'Ready for realtime and background jobs',
          ].map((item) => (
            <div key={item} style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', fontWeight: 600 }}>
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
