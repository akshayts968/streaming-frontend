'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import '@/styles/Auth.css'; // Reusing Auth.css for the centered card layout

export default function SubscribePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to subscribe!');
      router.push('/auth/login');
    } else {
      setIsLoggedIn(true);
    }
  }, [router]);

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setPaymentStep(2);
  };

  const activateSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/reset-time`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Also update local storage so immediate UI checks pass if needed
      localStorage.setItem('guest_watch_time', '0');
    } catch (err) {
      console.error('Failed to activate subscription', err);
    }
  };

  const handleDummySubmit = (e) => {
    e.preventDefault();
    setIsPaying(true);
    // Simulate processing
    setTimeout(async () => {
      await activateSubscription();
      setIsPaying(false);
      setPaymentStep(3); // Success step
      
      // Auto redirect after showing success
      setTimeout(() => {
        router.push('/');
      }, 3000);
    }, 1500);
  };

  if (!isLoggedIn) return null; // Prevent flicker before redirect

  return (
    <div className="auth-page">
      <div className="auth-card glass" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
        {paymentStep === 1 && (
          <>
            <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Premium Subscription</h2>
            <p style={{ color: '#aaa', marginBottom: '2rem', fontSize: '0.9rem', textAlign: 'center' }}>Demo Mode: Choose a payment method</p>
            <div className="payment-options" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {['Credit / Debit Card', 'UPI (Google Pay, PhonePe)', 'PayPal', 'Net Banking'].map(method => (
                <button 
                  key={method}
                  onClick={() => handleMethodSelect(method)}
                  style={{
                    padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: 'white', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  {method} <span style={{ color: 'var(--primary)' }}>→</span>
                </button>
              ))}
            </div>
          </>
        )}

        {paymentStep === 2 && (
          <>
            <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Enter Details</h2>
            <p style={{ color: '#aaa', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>{selectedMethod} (Dummy Data)</p>
            <form onSubmit={handleDummySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              
              {selectedMethod === 'PayPal' ? (
                <div style={{ marginTop: '1rem', minHeight: '150px' }}>
                  <PayPalScriptProvider options={{ clientId: "test", currency: "USD", intent: "capture" }}>
                    <PayPalButtons 
                      style={{ layout: "vertical", shape: "rect" }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [
                            {
                              amount: {
                                currency_code: "USD",
                                value: "9.99",
                              },
                            },
                          ],
                        });
                      }}
                      onApprove={(data, actions) => {
                        return actions.order.capture().then(async (details) => {
                          // Trigger our dummy success
                          setIsPaying(true);
                          await activateSubscription();
                          setTimeout(() => {
                            setIsPaying(false);
                            setPaymentStep(3); // Success step
                            
                            // Auto redirect after showing success
                            setTimeout(() => {
                              router.push('/');
                            }, 3000);
                          }, 500);
                        });
                      }}
                    />
                  </PayPalScriptProvider>
                </div>
              ) : selectedMethod.includes('Card') ? (
                <>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '4px', display: 'block' }}>Card Number</label>
                    <input type="text" placeholder="xxxx xxxx xxxx xxxx" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '4px', display: 'block' }}>Expiry</label>
                      <input type="text" placeholder="MM/YY" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '4px', display: 'block' }}>CVV</label>
                      <input type="password" placeholder="•••" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white' }} />
                    </div>
                  </div>
                </>
              ) : selectedMethod.includes('UPI') ? (
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '4px', display: 'block' }}>UPI ID</label>
                  <input type="text" placeholder="username@bank" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white' }} />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '4px', display: 'block' }}>Account Email / ID</label>
                  <input type="text" placeholder="account@example.com" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white' }} />
                </div>
              )}

              {selectedMethod !== 'PayPal' && (
                isPaying ? (
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <div style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
                    <p>Processing...</p>
                  </div>
                ) : (
                  <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer' }}>
                    Pay Now (Dummy)
                  </button>
                )
              )}
              
              {!isPaying && (
                <button type="button" onClick={() => setPaymentStep(1)} style={{ background: 'transparent', color: '#aaa', border: 'none', marginTop: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  ← Back to Options
                </button>
              )}
            </form>
          </>
        )}

        {paymentStep === 3 && (
          <div style={{ padding: '2rem 0', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style={{ color: '#22c55e', marginBottom: '1rem' }}>Payment Successful!</h2>
            <p style={{ color: '#ccc', fontSize: '1rem', lineHeight: '1.5' }}>Welcome to Antigravity Premium.<br/><span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Your account is now fully active!</span></p>
            <p style={{ color: '#888', marginTop: '2rem', fontSize: '0.85rem' }}>Redirecting to home...</p>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
