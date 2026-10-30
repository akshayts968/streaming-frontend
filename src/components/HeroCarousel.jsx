'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HeroCarousel() {
  const [slides, setSlides] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  useEffect(() => {
    let isMounted = true;
    const fetchFeatured = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/videos/featured`);
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSlides(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch featured movies for Hero Carousel:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFeatured();
    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  // Auto-rotate through active featured movies every 7 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [slides.length]);

  if (loading && slides.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '75vh',
        minHeight: '480px',
        maxHeight: '750px',
        background: '#0d0d11',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading featured stories...</div>
      </div>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  const currentSlide = slides[activeSlide] || slides[0];

  return (
    <section style={{
      position: 'relative',
      width: '100%',
      height: '78vh',
      minHeight: '520px',
      maxHeight: '800px',
      overflow: 'hidden',
      background: '#0a0a0c'
    }}>
      {/* Background Images with smooth transitions */}
      {slides.map((slide, index) => {
        const isActive = index === activeSlide;
        return (
          <div
            key={slide.videoId || index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url('${slide.bannerUrl}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'scale(1)' : 'scale(1.04)',
              transition: 'opacity 1s ease-in-out, transform 7s ease-out',
              zIndex: 1
            }}
          />
        );
      })}

      {/* Dark gradient overlays */}
      {/* Vignette & Bottom fade */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, #0a0a0c 0%, rgba(10,10,12,0.8) 25%, rgba(10,10,12,0.3) 60%, rgba(10,10,12,0.7) 100%)',
        zIndex: 2,
        pointerEvents: 'none'
      }} />
      {/* Left reading overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to right, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.7) 40%, rgba(10,10,12,0.1) 80%, transparent 100%)',
        zIndex: 3,
        pointerEvents: 'none'
      }} />

      {/* Foreground Content */}
      <div style={{
        position: 'relative',
        zIndex: 4,
        maxWidth: '1280px',
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 2.5rem',
        paddingBottom: '2.5rem'
      }}>
        <div style={{ maxWidth: '640px' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
            backdropFilter: 'blur(8px)'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
            FEATURED MOVIE
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
            fontWeight: '800',
            lineHeight: 1.15,
            color: '#ffffff',
            margin: '0 0 1rem 0',
            textShadow: '0 4px 20px rgba(0,0,0,0.8)'
          }}>
            {currentSlide.title}
          </h1>

          {/* Description */}
          {currentSlide.description && (
            <p style={{
              fontSize: '1rem',
              lineHeight: 1.6,
              color: '#d1d5db',
              margin: '0 0 1.75rem 0',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {currentSlide.description}
            </p>
          )}

          {/* CTA Watch Now button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              href={currentSlide.ctaLink || `/watch/${currentSlide.videoId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #e50914 0%, #b81d24 100%)',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '1rem',
                padding: '0.85rem 2rem',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(229, 9, 20, 0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
            >
              <span>▶</span> {currentSlide.ctaText || 'Watch Now'}
            </Link>
          </div>
        </div>
      </div>

      {/* Slide indicator dots & mini controls */}
      {slides.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          right: '2.5rem',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '8px 14px',
          borderRadius: '24px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {slides.map((slide, idx) => {
            const isActive = idx === activeSlide;
            return (
              <button
                key={`dot-${slide.videoId || idx}`}
                onClick={() => setActiveSlide(idx)}
                title={slide.title}
                style={{
                  width: isActive ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: isActive ? '#e50914' : 'rgba(255, 255, 255, 0.35)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
