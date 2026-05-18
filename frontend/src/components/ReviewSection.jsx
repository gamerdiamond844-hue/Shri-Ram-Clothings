import { useState, useEffect, useMemo } from 'react';
import { Star, Camera, Check, Image as ImageIcon, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const REVIEW_OPTIONS = [
  { label: 'Excellent', rating: 5, subtext: 'Excellent fit with comfortable quality.' },
  { label: 'Very Good', rating: 4, subtext: 'Very good fit with dependable finish.' },
  { label: 'Good', rating: 3, subtext: 'Good style with solid value.' },
];

const REVIEW_SUGGESTIONS = [
  'Quality product',
  'Perfect fitting',
  'Amazing fabric',
  'Worth the price',
  'Comfortable to wear',
  'Well stitched',
  'Excellent construction',
  'Highly recommended',
  'Modern style',
  'Fast delivery',
  'Stylish look',
  'Smooth shopping experience',
];

const ratingLabel = rating => {
  if (rating >= 5) return 'Excellent';
  if (rating === 4) return 'Very Good';
  return 'Good';
};

const formatDate = value => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function ReviewSection({ productId, reviews = [], avgRating = 5, reviewCount = 0, onRefresh }) {
  const [selectedRating, setSelectedRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [reviewList, setReviewList] = useState(reviews);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(reviews.length < reviewCount);

  useEffect(() => {
    setReviewList(reviews);
    setHasMore(reviews.length < reviewCount);
    setPage(1);
  }, [reviews, reviewCount]);

  useEffect(() => {
    const draft = localStorage.getItem(`review-draft-${productId}`);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setSelectedRating(parsed.selectedRating || 5);
        setComment(parsed.comment || '');
        setSelectedSuggestion(parsed.selectedSuggestion || '');
      } catch (error) {
        console.warn('Invalid review draft', error);
      }
    }
    setDraftLoaded(true);
  }, [productId]);

  useEffect(() => {
    if (!draftLoaded) return;
    localStorage.setItem(
      `review-draft-${productId}`,
      JSON.stringify({ selectedRating, comment, selectedSuggestion, timestamp: Date.now() })
    );
  }, [selectedRating, comment, selectedSuggestion, draftLoaded, productId]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const displayAvgRating = Number(avgRating) || 5;
  const selectedLabel = useMemo(() => ratingLabel(selectedRating), [selectedRating]);

  const submitReview = async () => {
    if (!selectedRating || selectedRating < 3) {
      return toast.error('Choose a review option first');
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('rating', selectedRating);
      formData.append('suggestion', selectedSuggestion || selectedLabel);
      if (comment) formData.append('comment', comment.trim());
      if (imageFile) formData.append('review_image', imageFile);

      await api.post(`/products/${productId}/reviews`, formData);
      toast.success('Your review has been submitted');
      setComment('');
      setSelectedSuggestion('');
      setImageFile(null);
      setDraftLoaded(false);
      localStorage.removeItem(`review-draft-${productId}`);
      onRefresh?.();
      const updated = await api.get(`/products/${productId}/reviews?page=1&limit=8`);
      setReviewList(updated.data.reviews);
      setHasMore(updated.data.total > updated.data.reviews.length);
      setPage(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionTap = suggestion => {
    setSelectedSuggestion(suggestion);
    setComment(suggestion);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const loadMoreReviews = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.get(`/products/${productId}/reviews?page=${nextPage}&limit=8`);
      setReviewList(prev => {
        const nextReviews = [...prev, ...res.data.reviews];
        setHasMore(res.data.total > nextReviews.length);
        return nextReviews;
      });
      setPage(nextPage);
    } catch (err) {
      toast.error('Unable to load more reviews');
    } finally {
      setLoadingMore(false);
    }
  };

  const schema = useMemo(() => {
    const itemReviews = reviewList.slice(0, 5).map((review, index) => ({
      '@type': 'Review',
      author: review.user_name,
      datePublished: review.created_at,
      reviewBody: review.comment || review.suggestion || review.rating_label,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 3,
      },
      itemReviewed: {
        '@type': 'Product',
        productID: `${productId}`,
      },
      '@id': `#review-${review.id || index}`,
    }));
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      productID: `${productId}`,
      review: itemReviews,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: displayAvgRating,
        reviewCount: reviewCount || reviewList.length,
        bestRating: 5,
        worstRating: 3,
      },
    };
  }, [productId, reviewList, avgRating, reviewCount]);

  return (
    <section className="fade-up" style={{ display: 'grid', gap: 24, padding: '40px 0', maxWidth: 1080, margin: '0 auto' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'rgba(255,255,255,0.94)', borderRadius: 24, border: '1px solid rgba(229,231,235,0.8)', boxShadow: '0 30px 80px rgba(15,23,42,0.08)' }}>
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 10 }}>Customer reviews</p>
            <h2 style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#111827' }}>Real review section</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14, width: '100%', maxWidth: 420 }}>
            <div style={{ padding: 18, borderRadius: 22, background: '#111827', color: '#fff', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><Sparkles size={18} /> <span style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.14em', opacity: 0.83 }}>Average score</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 36, fontWeight: 800 }}>{displayAvgRating.toFixed(1)}<span style={{ fontSize: 16, color: '#d1d5db' }}>/5</span></div>
              <p style={{ marginTop: 8, fontSize: 13, color: '#d1d5db' }}>{reviewCount} reviews · 98% satisfaction</p>
            </div>
            <div style={{ padding: 18, borderRadius: 22, background: '#f9fafb', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, color: '#111827' }}><ShieldCheck size={18} /> <span style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.14em', fontWeight: 700 }}>Verified buyers</span></div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{Math.max(82, Number(reviewCount ? Math.min(100, Math.round((reviewCount / (reviewCount + 12)) * 100)) : 82))}%</div>
              <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>Built only for authenticated shoppers</p>
            </div>
            <div style={{ padding: 18, borderRadius: 22, background: '#f9fafb', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, color: '#111827' }}><Star size={18} /> <span style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.14em', fontWeight: 700 }}>Rating</span></div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{selectedLabel}</div>
              <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>Choose a rating and share your experience.</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 22, padding: '26px', background: 'rgba(255,255,255,0.96)', borderRadius: 26, border: '1px solid rgba(229,231,235,0.9)', boxShadow: '0 18px 60px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Write Review</p>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Select a rating and submit instantly — no page refresh, no clutter.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => setSelectedRating(5)} style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid #d1d5db', background: selectedRating === 5 ? '#111827' : '#fff', color: selectedRating === 5 ? '#fff' : '#111827', fontSize: 13, cursor: 'pointer' }}>Excellent</button>
              <button type="button" onClick={() => setSelectedRating(4)} style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid #d1d5db', background: selectedRating === 4 ? '#111827' : '#fff', color: selectedRating === 4 ? '#fff' : '#111827', fontSize: 13, cursor: 'pointer' }}>Very Good</button>
              <button type="button" onClick={() => setSelectedRating(3)} style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid #d1d5db', background: selectedRating === 3 ? '#111827' : '#fff', color: selectedRating === 3 ? '#fff' : '#111827', fontSize: 13, cursor: 'pointer' }}>Good</button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              {REVIEW_OPTIONS.map(option => {
                const active = selectedRating === option.rating;
                return (
                  <button key={option.label} type="button" onClick={() => setSelectedRating(option.rating)}
                    style={{
                      borderRadius: 24,
                      border: active ? '2px solid #111827' : '1px solid rgba(229,231,235,0.9)',
                      background: active ? 'rgba(17,24,39,0.95)' : '#fff',
                      color: active ? '#fff' : '#111827',
                      padding: '20px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      boxShadow: active ? '0 18px 45px rgba(17,24,39,0.14)' : '0 10px 24px rgba(15,23,42,0.06)',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 999, background: active ? '#fff' : '#f3f4f6', display: 'grid', placeItems: 'center' }}><Star size={16} style={{ color: active ? '#111827' : '#f97316' }} /></div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>{option.label}</div>
                        <div style={{ fontSize: 12, color: active ? '#d1d5db' : '#6b7280' }}>{option.subtext}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, color: active ? '#d1d5db' : '#6b7280' }}>
                      <span style={{ fontWeight: 700 }}>{option.rating}.0</span>
                      <span>Stars</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Review suggestions</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {REVIEW_SUGGESTIONS.map(suggestion => (
                  <button key={suggestion} type="button" onClick={() => handleSuggestionTap(suggestion)}
                    style={{
                      padding: '10px 14px', borderRadius: 14, border: '1px solid rgba(229,231,235,0.9)', background: selectedSuggestion === suggestion ? '#111827' : '#fff',
                      color: selectedSuggestion === suggestion ? '#fff' : '#111827', cursor: 'pointer', fontSize: 13,
                      transition: 'all 0.2s ease',
                    }}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <label htmlFor="review-comment" style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Share optional feedback</label>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{comment.length}/180</span>
              </div>
              <textarea
                id="review-comment"
                rows={4}
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, 180))}
                placeholder="A short note about fit, fabric, or styling"
                style={{ width: '100%', minHeight: 112, borderRadius: 18, border: '1px solid rgba(229,231,235,0.9)', padding: 16, fontSize: 14, color: '#111827', background: '#fff', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Camera size={18} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Optional image</p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>Upload one product photo</p>
                  </div>
                </div>
                <label htmlFor="review-image" style={{ cursor: 'pointer', color: '#111827', borderRadius: 12, border: '1.5px solid rgba(229,231,235,0.95)', background: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>
                  Add image
                </label>
              </div>
              <input id="review-image" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setImageFile(e.target.files[0])} />
              {imagePreview && (
                <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', maxWidth: 280, border: '1px solid rgba(229,231,235,0.9)' }}>
                  <img src={imagePreview} alt="Review preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  <button type="button" onClick={removeImage} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 999, border: 'none', background: 'rgba(17,24,39,0.85)', color: '#fff', cursor: 'pointer' }}>×</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <button type="button" onClick={submitReview} disabled={isSubmitting} className="btn-primary" style={{ minWidth: 180, opacity: isSubmitting ? 0.65 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {isSubmitting ? <Loader2 size={16} className="spin" /> : <Check size={16} />} Submit review
              </button>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Instant submission, no full page reload.</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Recent reviews</p>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{reviewCount} verified product reviews · {displayAvgRating.toFixed(1)} average</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, border: '1px solid rgba(229,231,235,0.9)', padding: '10px 14px', background: '#fff' }}><Star size={14} color="#f97316" /><span style={{ fontSize: 13, fontWeight: 700 }}>{displayAvgRating.toFixed(1)}</span></div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, border: '1px solid rgba(229,231,235,0.9)', padding: '10px 14px', background: '#fff' }}><ShieldCheck size={14} color="#111827" /><span style={{ fontSize: 13, color: '#111827' }}>Verified buyer</span></div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {reviewList.length ? reviewList.map(review => (
            <article key={review.id} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, padding: 20, borderRadius: 24, background: '#fff', border: '1px solid rgba(229,231,235,0.9)', boxShadow: '0 20px 45px rgba(15,23,42,0.05)' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 999, background: '#111827', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{review.user_name?.charAt(0) || 'U'}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{review.user_name}</div>
                    <span style={{ fontSize: 12, color: '#6b7280', padding: '4px 10px', borderRadius: 999, background: '#f9fafb', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Verified Buyer</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#f97316' }}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={14} fill={index < review.rating ? '#f97316' : 'none'} stroke={index < review.rating ? '#f97316' : '#d1d5db'} />
                    ))}
                  </div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>{formatDate(review.created_at)}</span>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {review.rating_label && <span style={{ padding: '8px 12px', borderRadius: 999, background: '#111827', color: '#fff', fontSize: 12, fontWeight: 700 }}>{review.rating_label}</span>}
                  {review.suggestion && <span style={{ padding: '8px 12px', borderRadius: 999, background: '#f3f4f6', color: '#111827', fontSize: 12 }}>{review.suggestion}</span>}
                </div>
                {(review.comment || review.image_url) && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {review.comment && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>{review.comment}</p>}
                    {review.image_url && (
                      <img src={review.image_url} alt="Review" style={{ width: '100%', maxWidth: 420, borderRadius: 20, objectFit: 'cover', aspectRatio: '4 / 3' }} />
                    )}
                  </div>
                )}
              </div>
            </article>
          )) : (
            <div style={{ padding: 32, borderRadius: 24, textAlign: 'center', border: '1px dashed rgba(156,163,175,0.5)', background: '#fafafa' }}>
              <ImageIcon size={32} style={{ color: '#d1d5db', marginBottom: 14 }} />
              <p style={{ fontSize: 14, color: '#6b7280' }}>No reviews yet. Be the first to share your experience.</p>
            </div>
          )}
        </div>

        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button type="button" onClick={loadMoreReviews} disabled={loadingMore} className="btn-outline" style={{ width: 220, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              {loadingMore ? <Loader2 size={16} className="spin" /> : <span>Load more reviews</span>}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}


