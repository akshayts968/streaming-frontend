'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import '@/styles/Watch.css';

export default function WatchPage({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise);
  const { movieId } = params;
  const [movieData, setMovieData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState('');
  const [user, setUser] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [remainingTime, setRemainingTime] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchRemainingTime = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setUser(u);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/watch-time`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            if (data.isAdmin) {
               setIsAdmin(true);
            } else {
               setRemainingTime(Math.max(0, 300 - data.consumed));
            }
          }
        } catch(err) {}
      } else {
        const consumed = parseInt(localStorage.getItem('guest_watch_time') || '0', 10);
        setRemainingTime(Math.max(0, 120 - consumed));
      }
    };
    fetchRemainingTime();
  }, []);

  const handleWatchTime = async (seconds) => {
    if (isBlocked) return;
    
    // Admin bypass
    if (user && user.role === 'admin') return;

    if (user) {
      if (user) {
        setRemainingTime(prev => Math.max(0, prev - seconds));
      }

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/track-time`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ secondsWatched: seconds })
        });
        const data = await res.json();
        if (data.allowed === false) {
          setIsBlocked(true);
          setPaywallMessage('You have reached your 5-minute free viewing limit.');
        }
      } catch (err) {
        console.error('Time tracking error', err);
      }
    } else {
      let currentGuestTime = parseInt(localStorage.getItem('guest_watch_time') || '0', 10);
      currentGuestTime += seconds;
      localStorage.setItem('guest_watch_time', currentGuestTime);
      
      setRemainingTime(Math.max(0, 120 - currentGuestTime));

      const GUEST_LIMIT = 120; // 2 minutes
      if (currentGuestTime >= GUEST_LIMIT) {
        setIsBlocked(true);
        setPaywallMessage('You have reached your 2-minute guest viewing limit.');
      }
    }
  };

  const handleMockPayment = () => {
    if (!user) {
      alert('Please login to subscribe');
      return;
    }
    setShowPaymentModal(true);
  };

  const confirmDummyPayment = () => {
    setIsPaying(true);
    // Simulate payment processing delay
    setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/reset-time`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        localStorage.setItem('guest_watch_time', '0');
        setIsPaying(false);
        setShowPaymentModal(false);
        alert('Payment Successful! Your subscription is now fully active.');
        setIsBlocked(false);
        setPaywallMessage('');
      } catch (err) {
        console.error('Payment error', err);
        alert('Payment failed');
        setIsPaying(false);
      }
    }, 2000);
  };

  const [nextEpisodeId, setNextEpisodeId] = useState(null);
  const [prevEpisodeId, setPrevEpisodeId] = useState(null);
  const [nextEpisodeSlug, setNextEpisodeSlug] = useState(null);
  const [prevEpisodeSlug, setPrevEpisodeSlug] = useState(null);

  const handleNext = () => {
    const target = nextEpisodeSlug || nextEpisodeId;
    if (target) {
      router.push(`/watch/${target}`);
    }
  };

  const handlePrev = () => {
    const target = prevEpisodeSlug || prevEpisodeId;
    if (target) {
      router.push(`/watch/${target}`);
    }
  };

  useEffect(() => {
    // Fetch movie metadata from our DB
    const fetchMovieDetails = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/${movieId}`);
        const data = await res.json();
        if (data.success) {
          setMovieData(data.data);
          setNextEpisodeId(data.data.nextEpisodeId);
          setPrevEpisodeId(data.data.prevEpisodeId);
          setNextEpisodeSlug(data.data.nextEpisodeSlug);
          setPrevEpisodeSlug(data.data.prevEpisodeSlug);
        }
      } catch (err) {
        console.error('Failed to fetch movie details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [movieId]);

  if (loading) return <div className="watch-loading glass">Loading cinematic experience...</div>;
  if (!movieData) return <div className="watch-error glass">Video not found</div>;

  return (
    <div className="watch-page">
      <div className="player-section" style={{ position: 'relative' }}>
        <VideoPlayer 
          driveFileId={movieData.drive_file_id} 
          src={movieData.videoUrl} 
          poster={movieData.thumbnailUrl} 
          useIframe={movieData.useIframe}
          onWatchTime={handleWatchTime}
          isBlocked={isBlocked}
          remainingTime={remainingTime}
          isAdmin={isAdmin}
          onNext={nextEpisodeId ? handleNext : null}
          onPrev={prevEpisodeId ? handlePrev : null}
        />

        {isBlocked && (
          <div className="paywall-overlay" style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'white', zIndex: 10, borderRadius: '12px'
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: '700' }}>Time's Up!</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#ccc' }}>{paywallMessage}</p>
            
            {!user ? (
              <button 
                onClick={() => window.location.href = '/auth/register'}
                style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                Register for 5 Free Minutes
              </button>
            ) : (
              <button 
                onClick={handleMockPayment}
                style={{ padding: '12px 24px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                Subscribe Now
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="details-section">
        <div className="meta-header">
          <div className="title-row">
            <h1 className="movie-title">{movieData.title}</h1>
            <button className="btn-watchlist glass">
              <span className="plus">+</span> My List
            </button>
          </div>
          <div className="meta-info">
            <span className="year">{new Date(movieData.createdAt).getFullYear()}</span>
            <span className="category-tag">{Array.isArray(movieData.category) ? movieData.category.join(', ') : movieData.category}</span>
            <span className="views-count">{movieData.views} views</span>
          </div>
        </div>

        <p className="description">{movieData.description}</p>
        
        <div className="creator-info">
          <div className="avatar">{movieData.creator?.username?.charAt(0).toUpperCase()}</div>
          <div className="creator-name">Published by <span>{movieData.creator?.username}</span></div>
        </div>
      </div>
      {/* Dummy Payment Modal */}
      {showPaymentModal && (
        <div className="payment-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(15px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div className="payment-card glass" style={{
            width: '100%', maxWidth: '400px', padding: '2rem', borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Select Payment Method</h2>
            <p style={{ color: '#aaa', marginBottom: '2rem', fontSize: '0.9rem' }}>Choose a dummy method to continue</p>
            
            <div className="payment-options" style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              {['Credit / Debit Card', 'UPI (Google Pay, PhonePe)', 'PayPal', 'Net Banking'].map(method => (
                <button 
                  key={method}
                  onClick={confirmDummyPayment}
                  disabled={isPaying}
                  style={{
                    padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: 'white', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  {method}
                  <span style={{ color: 'var(--primary)' }}>→</span>
                </button>
              ))}
            </div>

            {isPaying ? (
              <div className="paying-loader">
                <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                <p>Processing dummy payment...</p>
              </div>
            ) : (
              <button 
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </div>
          <style jsx>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
    </div>
  );
}
