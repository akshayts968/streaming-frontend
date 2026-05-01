'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '@/styles/Navbar.css';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = require('next/navigation').useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('username');
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    if (token) {
      setIsLoggedIn(true);
      setUsername(storedUser || 'Creator');
      if (userObj.role === 'admin') {
        setIsAdmin(true);
      }
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/search?q=${searchQuery}`);
          const data = await res.json();
          if (data.success) setSearchResults(data.data);
        } catch (err) { console.error('Search failed:', err); }
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const handleSubscribeClick = () => {
    router.push('/subscribe');
  };

  return (
    <nav className="navbar">
      <div className="navContainer">
        <Link href="/" className="logo">
          <img src="/logo.jpg" alt="ANTIGRAVITY STREAM" className="nav-logo-img" style={{ height: '32px', width: 'auto', borderRadius: '4px' }} />
        </Link>
        
        <div className="searchBarContainer">
          <div className="searchBar">
            <input 
              type="text" 
              placeholder="Search masterpieces..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="searchResults glass">
              {searchResults.map(item => (
                <Link 
                  key={item._id} 
                  href={item.resultType === 'series' ? `/series/${item.slug || item._id}` : `/watch/${item.slug || item._id}`} 
                  className="searchItem" 
                  onClick={() => setSearchQuery('')}
                >
                  <img src={item.thumbnailUrl} alt="" className="searchThumb" />
                  <div className="searchInfo">
                    <span className="searchTitle">{item.title}</span>
                    <span className="searchMeta">
                      {item.resultType === 'series' ? 'TV Series' : 'Movie'} • {Array.isArray(item.category) ? item.category.join(', ') : item.category}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        
        <div className="navLinks">
          <Link href="/browse">Browse</Link>
          <Link href="/watchlist">My List</Link>
          <button className="btn-subscribe-nav" onClick={handleSubscribeClick}>
            Subscribe
          </button>
          
          {isLoggedIn ? (
            <div className="user-section">
              <Link href="/upload" className="btn-upload-circle" title="Upload Video">+</Link>
              <div className="profile-group">
                <div className="avatar-circle">{username.charAt(0).toUpperCase()}</div>
                <div className="dropdown glass">
                  <div className="dropdown-user">
                    <span className="user-name">{username}</span>
                    <span className="user-role">{isAdmin ? 'Administrator' : 'Creator'}</span>
                  </div>
                  <hr />
                  {isAdmin && <Link href="/admin" className="dropdown-item" style={{ color: 'var(--primary)' }}>Admin Dashboard</Link>}
                  <Link href="/profile" className="dropdown-item">My Profile</Link>
                  <Link href="/settings" className="dropdown-item">Settings</Link>
                  <button onClick={handleLogout} className="dropdown-item logout">Logout</button>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/auth/login" className="btnLogin">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
