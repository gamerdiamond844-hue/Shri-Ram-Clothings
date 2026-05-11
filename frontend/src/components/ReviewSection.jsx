import { useState, useEffect } from 'react';
import { Star, CheckCircle, Camera, X, ChevronRight, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ── Star display ──────────────────────────────────────────────────────────────
function Stars({ rating, size = 14, interactive = false, onRate }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= (interactive ? (hover || rating) : rating);
        return (
          <Star key={i} size={size}
            onClick={() => interactive && onRate?.(i)}
            onMouseEnter={() => interactive && setHover(i)}
            onMouseLeave={() => interactive && setHover(0)}
            style={{
              color: filled ? '#f59e0b' : '#e5e7eb',
              fill: filled ? '#f59e0b' : '#e5e7eb',
              cursor: interactive ? 'pointer' : 'default',
              transition: 'all 0.1s',
              transform: interactive && hover === i ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        );
      })}
    </div>
  );
}

// ── Rating bar ────────────────────────────────────────────────────────────────
function RatingBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
      <span style={{ color: '#6b7280', width: 8, textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#f59e0b', borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ color: '#9ca3af', width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
    </div>
  );
}

// ── Quick rating options ──────────────────────────────────────────────────────
const RATING_OPTIONS = [
  { label: 'Good',      stars: 3, desc: 'Satisfied with the product' },
  { label: 'Very Good', stars: 4, desc: 'Really happy with the quality' },
  { label: 'Excellent', stars: 5, desc: 'Absolutely love this product' },
];

const SUGGESTIONS = [
  'Premium quality product',
  'Perfect fitting',
  'Fast delivery',
  'Amazing fabric quality',
  'Worth the price',
  'Comfortable to wear',
  'Luxury feel',
  'Highly recommended',
  'Excellent stitching',
  'Modern trendy style',
];

// ── Write Review Form ─────────────────────────────────────────────────────────
function WriteReview({ productId, onSuccess }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1=select rating, 2=write comment
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSuggestion = (s) => {
    setComment(prev => prev ? `${prev}. ${s}` : s);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post(`/products/${productId}/reviews`, {
        rating: selected.stars,
        comment: comment.trim() || selected.desc,
      });
      setDone(true);
      setTimeout(() => { onSuccess?.(); setDone(false); setStep(1); setSelected(null); setComment(''); }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit review');
    } finally { setSubmitting(false); }
  };

  if (!user) return (
    <div style={{ background: '#f9fafb', borderRadius: 16, padding: '28px 24px', textAlign: 'center', border: '1.5px dashed #e5e7eb' }}>
      <div style={{ width: 48, height: 48, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <User size={20} color="#9ca3af" />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Sign in to write a review</p>
      <p style={{ fontSize: 12, color: '#9ca3af' }}>Share your experience with other customers</p>
    </div>
  );

  if (done) return (
    <div style={{ background: '#f0fdf4', borderRadius: 16, padding: '32px 24px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
      <div style={{ width: 52, height: 52, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <CheckCircle size={24} color="#16a34a" />
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 4 }}>Review Submitted</p>
      <p style={{ fontSize: 13, color: '#4ade80' }}>Thank you for your feedback</p>
    </div>
  );

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Write a Review</p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Step {step} of 2</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ width: 24, height: 4, borderRadius: 2, background: step >= s ? '#111827' : '#e5e7eb', transition: 'background 0.3s' }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {step === 1 && (
          <div>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>How would you rate this product?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {RATING_OPTIONS.map(opt => (
                <button key={opt.label} type="button" onClick={() => { setSelected(opt); setStep(2); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${selected?.label === opt.label ? '#111827' : '#f3f4f6'}`,
                    background: selected?.label === opt.label ? '#111827' : '#f9fafb',
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (selected?.label !== opt.label) { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#f3f4f6'; } }}
                  onMouseLeave={e => { if (selected?.label !== opt.label) { e.currentTarget.style.borderColor = '#f3f4f6'; e.currentTarget.style.background = '#f9fafb'; } }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: selected?.label === opt.label ? '#fff' : '#111827', marginBottom: 3 }}>{opt.label}</p>
                    <Stars rating={opt.stars} size={13} />
                  </div>
                  <ChevronRight size={16} color={selected?.label === opt.label ? '#fff' : '#9ca3af'} />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selected && (
          <div>
            {/* Selected rating summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f9fafb', borderRadius: 10, marginBottom: 16 }}>
              <Stars rating={selected.stars} size={14} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selected.label}</span>
              <button onClick={() => setStep(1)} style={{ marginLeft: 'auto', fontSize: 11, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change</button>
            </div>

            {/* Quick suggestions */}
            <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Select</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} type="button" onClick={() => handleSuggestion(s)}
                  style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500, border: '1.5px solid #e5e7eb', background: comment.includes(s) ? '#111827' : '#fff', color: comment.includes(s) ? '#fff' : '#374151', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!comment.includes(s)) { e.currentTarget.style.borderColor = '#111827'; } }}
                  onMouseLeave={e => { if (!comment.includes(s)) { e.currentTarget.style.borderColor = '#e5e7eb'; } }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Text area */}
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Add your thoughts (optional)..."
              rows={3}
              style={{ width: '100%', padding: '11px 14px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', resize: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = '#111827'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting}
              style={{ marginTop: 12, width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#1f2937'; }}
              onMouseLeave={e => e.currentTarget.style.background = '#111827'}>
              {submitting ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Submitting...</>
              ) : (
                <><CheckCircle size={16} />Submit Review</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Review Card ───────────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const initials = review.user_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const colors = ['#111827', '#1e40af', '#166534', '#7c3aed', '#b45309'];
  const color = colors[review.user_name?.charCodeAt(0) % colors.length] || '#111827';

  return (
    <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 14, padding: '18px 20px', transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{review.user_name}</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '2px 7px', borderRadius: 100, border: '1px solid #bbf7d0' }}>
              <CheckCircle size={9} /> Verified Buyer
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Stars rating={review.rating} size={12} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
      {review.comment && (
        <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7, paddingLeft: 50 }}>{review.comment}</p>
      )}
    </div>
  );
}

// ── Main ReviewSection ────────────────────────────────────────────────────────
export default function ReviewSection({ productId, reviews = [], avgRating = 0, reviewCount = 0, onRefresh }) {
  // Build rating distribution
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));

  return (
    <div style={{ marginTop: 64, paddingTop: 40, borderTop: '1px solid #f3f4f6' }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 900, color: '#111827', marginBottom: 4 }}>
            Customer Reviews
          </h2>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>{reviewCount} verified review{reviewCount !== 1 ? 's' : ''}</p>
        </div>
        {avgRating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f9fafb', padding: '10px 16px', borderRadius: 12, border: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{avgRating}</span>
            <div>
              <Stars rating={Math.round(avgRating)} size={16} />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>out of 5</p>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }} className="product-grid">

        {/* Left: Stats + Write Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Rating distribution */}
          {reviewCount > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '20px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Rating Breakdown</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dist.map(({ star, count }) => (
                  <RatingBar key={star} label={star} count={count} total={reviewCount} />
                ))}
              </div>
            </div>
          )}

          {/* Write review */}
          <WriteReview productId={productId} onSuccess={onRefresh} />
        </div>

        {/* Right: Reviews list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.length > 0 ? (
            reviews.map(r => <ReviewCard key={r.id} review={r} />)
          ) : (
            <div style={{ textAlign: 'center', padding: '56px 24px', border: '1.5px dashed #e5e7eb', borderRadius: 16, background: '#fafafa' }}>
              <div style={{ width: 52, height: 52, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Star size={22} color="#d1d5db" fill="#d1d5db" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No reviews yet</p>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>Be the first to share your experience</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
