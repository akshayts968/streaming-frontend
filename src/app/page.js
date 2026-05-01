'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ContentRow from '@/components/ContentRow';
import '@/styles/Home.css';

const HERO_SLIDES = [
  {
    id: 1,
    title: "With Love",
    badge: "NEW RELEASE",
    subBadge: "Romantic Comedy",
    meta: "Romance • 2h 10m • 2026",
    description: "A heartwarming tale of two strangers whose lives<br/>intertwine in unexpected ways. Discover the magic<br/>of falling in love against all odds.",
    bgImage: "https://i.ytimg.com/vi/gNrYsSN0V9A/maxresdefault.jpg",
    thumbImage: "https://i.ytimg.com/vi/gNrYsSN0V9A/maxresdefault.jpg",
    videoId: "69efd86038f6110e0a6ed114"
  },
  {
    id: 2,
    title: "CSK vs MI<br/>El Clasico Returns",
    badge: "LIVE NOW",
    subBadge: "Match 24",
    meta: "TATA IPL 2026 • Live • Cricket",
    description: "The biggest rivalry in IPL history is back.<br/>MS Dhoni's CSK takes on Rohit Sharma's MI<br/>in a blockbuster clash at Wankhede.",
    bgImage: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1600",
    thumbImage: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: 3,
    title: "Premier League<br/>Arsenal vs City",
    badge: "UPCOMING",
    subBadge: "Title Decider",
    meta: "EPL • Tomorrow 8 PM • Football",
    description: "A crucial top-of-the-table clash that could<br/>decide the destiny of the Premier League title.<br/>Don't miss the action.",
    bgImage: "https://images.unsplash.com/photo-1593341646782-e0b495cff86d?auto=format&fit=crop&q=80&w=1600",
    thumbImage: "https://images.unsplash.com/photo-1593341646782-e0b495cff86d?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: 4,
    title: "F1 Monaco Grand Prix<br/>Qualifying",
    badge: "REPLAY",
    subBadge: "Verstappen on Pole",
    meta: "Formula 1 • 2h • Motorsport",
    description: "Watch the thrilling qualifying session from the<br/>streets of Monte Carlo as drivers push to the<br/>absolute limit.",
    bgImage: "https://images.unsplash.com/photo-1624526267942-ab0f0b580098?auto=format&fit=crop&q=80&w=1600",
    thumbImage: "https://images.unsplash.com/photo-1624526267942-ab0f0b580098?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: 5,
    title: "NBA Finals Game 7<br/>Lakers vs Celtics",
    badge: "HIGHLIGHTS",
    subBadge: "Lakers clinch title",
    meta: "NBA • 15m • Basketball",
    description: "LeBron James leads the Lakers to their 18th<br/>championship in a dramatic Game 7 victory<br/>over the Celtics.",
    bgImage: "https://images.unsplash.com/photo-1587280501635-a19f20108db3?auto=format&fit=crop&q=80&w=1600",
    thumbImage: "https://images.unsplash.com/photo-1587280501635-a19f20108db3?auto=format&fit=crop&q=80&w=200",
    videoId: "f5"
  }
];

const FALLBACK_VIDEOS = [
  {
    _id: 'f1',
    title: 'Lucifer',
    category: 'Action',
    views: '12M',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800',
    creator: { username: 'Aashirvad Cinemas' }
  },
  {
    _id: 'f2',
    title: 'Premam',
    category: 'Drama',
    views: '25M',
    thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800',
    creator: { username: 'Anwar Rasheed' }
  },
  {
    _id: 'f3',
    title: 'Kumbalangi Nights',
    category: 'Drama',
    views: '8M',
    thumbnailUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=800',
    creator: { username: 'Fahadh Faasil' }
  },
  {
    _id: 'f4',
    title: 'Minnal Murali',
    category: 'Sci-Fi',
    views: '15M',
    thumbnailUrl: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=800',
    creator: { username: 'Weekend Blockbusters' }
  },
  {
    _id: 'f5',
    title: 'Kurup',
    category: 'Thriller',
    views: '10M',
    thumbnailUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=800',
    creator: { username: 'Wayfarer Films' }
  }
];

export default function Home() {
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [actionVideos, setActionVideos] = useState([]);
  const [dramaVideos, setDramaVideos] = useState([]);
  const [thrillerVideos, setThrillerVideos] = useState([]);
  const [comedyVideos, setComedyVideos] = useState([]);
  const [documentaryVideos, setDocumentaryVideos] = useState([]);
  const [regionalVideos, setRegionalVideos] = useState([]);
  const [tvSeries, setTvSeries] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState(HERO_SLIDES);
  const [isAdmin, setIsAdmin] = useState(false);

  const formatDurationAsHHMM = (durationStr) => {
    if (!durationStr) return '00:00';
    const parts = durationStr.split(':');
    if (parts.length === 3) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    } else if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    }
    return durationStr;
  };

  // Auto-slide hero banner
  useEffect(() => {
    if (heroSlides.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const nextSlide = () => {
    if (heroSlides.length > 0) {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }
  };

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const [res, heroRes, seriesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos?isHero=true`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/series`)
        ]);
        
        const data = await res.json();
        const heroData = await heroRes.json();
        const seriesData = await seriesRes.json();
        
        if (heroData.success && heroData.data.length > 0) {
          const formattedHero = heroData.data.map((v, i) => ({
            id: i + 1,
            title: v.title,
            badge: v.category || 'FEATURED',
            subBadge: `${v.views || 0} views`,
            meta: `${v.category || 'Video'} • ${formatDurationAsHHMM(v.duration)}`,
            description: v.description || 'Watch now on our streaming platform.',
            bgImage: v.thumbnailUrl,
            thumbImage: v.thumbnailUrl,
            videoId: v._id,
            slug: v.slug
          }));
          setHeroSlides(formattedHero);
        }

        if (seriesData.success) {
          // Map series to video-like objects for ContentRow
          const formattedSeries = seriesData.data.map(s => ({
            ...s,
            isSeries: true,
            views: 'New Series'
          }));
          setTvSeries(formattedSeries);
        }

        if (data.success && data.data.length > 0) {
          setTrendingVideos(data.data.slice(0, 8));
          
          // Helper to filter by category (handles both single string and array)
          const filterByCat = (videos, cat) => videos.filter(v => 
            Array.isArray(v.category) ? v.category.includes(cat) : v.category === cat
          );

          setActionVideos(filterByCat(data.data, 'Action'));
          setDramaVideos(filterByCat(data.data, 'Drama'));
          setThrillerVideos(filterByCat(data.data, 'Thriller'));
          setComedyVideos(filterByCat(data.data, 'Comedy'));
          setDocumentaryVideos(filterByCat(data.data, 'Documentary'));
          setRegionalVideos(filterByCat(data.data, 'Regional'));
        } else {
          // Fallback placeholders
          setTrendingVideos(FALLBACK_VIDEOS);
          setActionVideos(FALLBACK_VIDEOS.filter(v => v.category === 'Action'));
          setDramaVideos(FALLBACK_VIDEOS.filter(v => v.category === 'Drama'));
        }
      } catch (err) {
        console.error('Failed to fetch videos, using placeholders:', err);
        setTrendingVideos(FALLBACK_VIDEOS);
        setActionVideos([]);
        setDramaVideos([]);
        setTvSeries([]);
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      {heroSlides.length > 0 && (
        <section className="hero">
          {heroSlides.map((slide, index) => (
            <div 
              key={`bg-${slide.id}`}
              className={`hero-bg ${index === activeSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url('${slide.bgImage}')` }}
            />
          ))}
          
          <div className="hero-overlay"></div>
          
          <div className="hero-content-wrapper">
            {heroSlides.map((slide, index) => (
              <div 
                key={`content-${slide.id}`} 
                className={`hero-content ${index === activeSlide ? 'active' : ''}`}
              >
                <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: slide.title }}></h1>
                
                <div className="hero-highlight-container">
                  <span className="hero-highlight-badge">{slide.badge}</span>
                  <span className="hero-highlight-sub">{slide.subBadge}</span>
                </div>

                <p className="hero-meta" dangerouslySetInnerHTML={{ __html: slide.meta }}></p>
                
                <p className="hero-description" dangerouslySetInnerHTML={{ __html: slide.description }}></p>
                
                <div className="hero-actions">
                  <Link href={`/watch/${slide.slug || slide.videoId || 'f1'}`}>
                    <button className="btn-watch-now">
                      <span className="play-icon">▶</span> Watch Now
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Mini Carousel */}
          {heroSlides.length > 1 && (
            <div className="hero-mini-carousel">
              {heroSlides.map((slide, index) => (
                <div 
                  key={slide.id} 
                  className={`mini-carousel-item ${index === activeSlide ? 'active' : ''}`}
                  onClick={() => setActiveSlide(index)}
                >
                  <img src={slide.thumbImage} alt={`Thumbnail ${slide.id}`} />
                </div>
              ))}
              <button className="mini-carousel-nav-btn glass" onClick={nextSlide}>›</button>
            </div>
          )}
        </section>
      )}

      {/* Video Rows */}
      <div className="content-container">
        {tvSeries.length > 0 && <ContentRow title="Must-Watch TV Series" videos={tvSeries} />}
        <ContentRow title="Trending Malayalam Hits" videos={trendingVideos} />
        <ContentRow title="Action Packed" videos={actionVideos.length > 0 ? actionVideos : FALLBACK_VIDEOS.slice(0, 3)} />
        <ContentRow title="Soulful Dramas" videos={dramaVideos.length > 0 ? dramaVideos : FALLBACK_VIDEOS.slice(1, 4)} />
        {thrillerVideos.length > 0 && <ContentRow title="Edge of Seat Thrillers" videos={thrillerVideos} />}
        {comedyVideos.length > 0 && <ContentRow title="Laugh Out Loud" videos={comedyVideos} />}
        {documentaryVideos.length > 0 && <ContentRow title="Real Stories" videos={documentaryVideos} />}
        {regionalVideos.length > 0 && <ContentRow title="Regional Gems" videos={regionalVideos} />}
      </div>
    </div>
  );
}
