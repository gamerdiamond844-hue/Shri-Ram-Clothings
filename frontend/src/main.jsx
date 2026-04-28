import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends Component {
  state = { crashed: false, error: null };
  static getDerivedStateFromError(error) { return { crashed: true, error }; }
  componentDidCatch(error, info) { console.error('App crashed:', error, info); }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: 24, textAlign: 'center' }}>
          <img src="/logo.jpg" alt="Shri Ram Clothings" style={{ height: 64, borderRadius: 12, marginBottom: 20 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Please refresh the page to continue shopping.</p>
          <button onClick={() => window.location.reload()}
            style={{ padding: '12px 28px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
