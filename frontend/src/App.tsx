import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Discover from './components/Discover';
import ForumFeed from './components/ForumFeed';
import ThreadDetail from './components/ThreadDetail';
import Profile from './components/Profile';
import AdminDash from './components/AdminDash';
import ChatHub from './components/ChatHub';
import Settings from './components/Settings';
import Connections from './components/Connections';
import ErrorBoundary from './components/ErrorBoundary';
import { LogOut, Radio, User, Shield, MessageSquare, Newspaper, Settings as SettingsIcon, Users, Menu, X, AlertTriangle } from 'lucide-react';

// --- Route wrapper components ---

function ThreadDetailRoute({ user, token }: { user: any; token: string }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  return (
    <ErrorBoundary>
      <ThreadDetail
        postId={Number(postId)}
        user={user}
        token={token}
        onBack={() => navigate('/feed')}
        onNavigateToProfile={(id: string) => navigate(`/profile/${id}`)}
      />
    </ErrorBoundary>
  );
}

function ProfileRoute({ user, token }: { user: any; token: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <ErrorBoundary>
      <Profile
        currentUser={user}
        userId={id || user.id}
        token={token}
        onBack={() => navigate(-1)}
        onNavigateToChat={(chatId: string) => navigate(`/chats/${chatId}`)}
        onSelectThread={(threadId: number) => navigate(`/feed/${threadId}`)}
      />
    </ErrorBoundary>
  );
}

function ChatRoute({ user, token }: { user: any; token: string }) {
  const { friendId } = useParams();
  const navigate = useNavigate();
  return (
    <ErrorBoundary>
      <ChatHub
        user={user}
        token={token}
        onNavigateToProfile={(id: string) => navigate(`/profile/${id}`)}
        initialChatId={friendId || null}
        onBack={() => navigate(-1)}
      />
    </ErrorBoundary>
  );
}

// --- Verification page ---
function VerifyPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); setMessage('No verification token.'); return; }
    fetch(`/api/auth/verify/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setMessage('EMAIL VERIFIED SUCCESSFULLY.');
          // Update stored user
          const savedUser = localStorage.getItem('monutune_user');
          if (savedUser) {
            const u = JSON.parse(savedUser);
            u.is_verified = true;
            localStorage.setItem('monutune_user', JSON.stringify(u));
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed.');
        }
      })
      .catch(() => { setStatus('error'); setMessage('VERIFICATION REQUEST FAILED.'); });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <div className="max-w-md w-full brutalist-border-thick p-12 text-center flex flex-col gap-6 shadow-[12px_12px_0_0_rgba(0,0,0,1)]">
        {status === 'loading' && <p className="text-xl font-black uppercase tracking-widest animate-pulse">VERIFYING...</p>}
        {status === 'success' && (
          <>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-green-600">VERIFIED</h2>
            <p className="text-sm font-bold uppercase tracking-widest">{message}</p>
            <a href="/discover" className="brutalist-button py-4 text-center">ENTER GRID</a>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-red-600">FAILED</h2>
            <p className="text-sm font-bold uppercase tracking-widest">{message}</p>
            <a href="/" className="brutalist-button py-4 text-center">BACK</a>
          </>
        )}
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<'AUTH' | 'ONBOARDING' | 'FEED'>('AUTH');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({ messages: 0, connections: 0 });

  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);

  // Ban check interceptor
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 403) {
        const data = await response.clone().json().catch(() => ({}));
        if (data.error === 'Account banned.') {
          alert('YOUR ACCOUNT HAS BEEN BANNED BY A MODERATOR.');
          localStorage.clear();
          window.location.reload();
        }
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  // Notification polling
  useEffect(() => {
    if (step !== 'FEED' || !token) return;
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/notifications/counts', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setNotificationCounts(data);
        }
      } catch (err) {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 5000);
    return () => clearInterval(interval);
  }, [step, token]);

  // Restore session
  useEffect(() => {
    const savedToken = localStorage.getItem('monutune_token');
    const savedUser = localStorage.getItem('monutune_user');
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsedUser);
      if (parsedUser.hasOnboarded) {
        setStep('FEED');
      } else {
        setStep('ONBOARDING');
      }
    }
  }, []);

  const handleAuth = (u: any, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem('monutune_token', t);
    localStorage.setItem('monutune_user', JSON.stringify(u));
    if (u.hasOnboarded) {
      setStep('FEED');
    } else {
      setStep('ONBOARDING');
    }
  };

  const handleOnboardingComplete = () => {
    setStep('FEED');
    navigate('/discover');
  };

  const logout = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Verification page is accessible without auth
  if (location.pathname === '/verify') {
    return <VerifyPage />;
  }

  if (step === 'AUTH') {
    return <Auth onAuth={handleAuth} />;
  }

  if (step === 'ONBOARDING') {
    return <Onboarding user={user} token={token!} onComplete={handleOnboardingComplete} />;
  }

  const isActive = (prefix: string) => location.pathname.startsWith(prefix);

  return (
    <div className="min-h-screen bg-grey-silver flex flex-col h-screen overflow-hidden relative">
      {/* MONOTUNE HEADER */}
      <header className="bg-white border-b-4 border-black px-4 md:px-8 py-4 flex justify-between items-center z-50">
        <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase whitespace-nowrap cursor-pointer" onClick={() => navigate('/discover')}>MONOTUNE</h1>
        
        {/* DESKTOP NAV */}
        <div className="hidden lg:flex items-center gap-8 font-bold text-xs tracking-widest uppercase">
          <button 
            onClick={() => navigate('/discover')}
            className={`flex items-center gap-2 hover:underline ${isActive('/discover') ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <Radio size={16} /> DISCOVER
          </button>
          <button 
            onClick={() => navigate('/feed')}
            className={`flex items-center gap-2 hover:underline ${isActive('/feed') ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <Newspaper size={16} /> FEED
          </button>
          <button 
            onClick={() => navigate('/chats')}
            className={`flex items-center gap-2 hover:underline relative ${isActive('/chats') ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <MessageSquare size={16} /> COMMS
            {notificationCounts.messages > 0 && (
              <span className="absolute -top-3 -right-3 bg-black text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">{notificationCounts.messages}</span>
            )}
          </button>
          <button 
            onClick={() => navigate('/connections')}
            className={`flex items-center gap-2 hover:underline relative ${isActive('/connections') ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <Users size={16} /> CONNECT
            {notificationCounts.connections > 0 && (
              <span className="absolute -top-3 -right-3 bg-black text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">{notificationCounts.connections}</span>
            )}
          </button>
          <button 
            onClick={() => navigate(`/profile/${user?.id}`)}
            className={`flex items-center gap-2 hover:underline ${location.pathname === `/profile/${user?.id}` ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <User size={16} /> PROFILE
          </button>
          {user?.is_admin && (
            <button 
              onClick={() => navigate('/admin')}
              className={`flex items-center gap-2 hover:underline ${isActive('/admin') ? 'underline decoration-4 underline-offset-8 text-black' : 'text-grey-mid'}`}
            >
              <Shield size={16} /> ADMIN
            </button>
          )}
          <button 
            onClick={() => navigate('/settings')}
            className={`flex items-center gap-2 hover:underline ml-4 ${isActive('/settings') ? 'underline decoration-4 underline-offset-8' : ''}`}
            title="SETTINGS"
          >
            <SettingsIcon size={18} />
          </button>
          <button onClick={logout} title="LOGOUT" className="hover:text-red-600 transition-all ml-4">
            <LogOut size={18} />
          </button>
        </div>

        {/* MOBILE NAV BUTTON */}
        <button 
          className="lg:hidden p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-[72px] md:top-[76px] left-0 right-0 bottom-0 bg-white z-40 flex flex-col items-center justify-start py-8 gap-8 font-black text-2xl uppercase tracking-widest overflow-y-auto brutalist-border-thick">
          <button onClick={() => navigate('/discover')} className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${isActive('/discover') ? 'text-cyan-500' : ''}`}>
            <Radio size={24} /> DISCOVER
          </button>
          <button onClick={() => navigate('/feed')} className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${isActive('/feed') ? 'text-cyan-500' : ''}`}>
            <Newspaper size={24} /> FEED
          </button>
          <button onClick={() => navigate('/chats')} className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center relative ${isActive('/chats') ? 'text-cyan-500' : ''}`}>
            <MessageSquare size={24} /> COMMS
            {notificationCounts.messages > 0 && (
              <span className="bg-white text-black text-xs px-2 py-1 ml-2 font-bold">{notificationCounts.messages}</span>
            )}
          </button>
          <button onClick={() => navigate('/connections')} className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center relative ${isActive('/connections') ? 'text-cyan-500' : ''}`}>
            <Users size={24} /> CONNECT
            {notificationCounts.connections > 0 && (
              <span className="bg-white text-black text-xs px-2 py-1 ml-2 font-bold">{notificationCounts.connections}</span>
            )}
          </button>
          <button onClick={() => navigate(`/profile/${user?.id}`)} className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${location.pathname === `/profile/${user?.id}` ? 'text-cyan-500' : ''}`}>
            <User size={24} /> PROFILE
          </button>
          {user?.is_admin && (
            <button onClick={() => navigate('/admin')} className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${isActive('/admin') ? 'text-cyan-500' : ''}`}>
              <Shield size={24} /> ADMIN
            </button>
          )}
          <button onClick={() => navigate('/settings')} className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${isActive('/settings') ? 'text-cyan-500' : ''}`}>
            <SettingsIcon size={24} /> SETTINGS
          </button>
          <button onClick={logout} className="flex items-center gap-4 text-red-600 hover:text-black w-full justify-center mt-8 border-t-4 border-black pt-8">
            <LogOut size={24} /> LOGOUT
          </button>
        </div>
      )}

      {/* DYNAMIC CONTENT — ROUTES */}
      <main className="flex-1 flex overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={
            <ErrorBoundary><Discover token={token!} onNavigateToProfile={(id: string) => navigate(`/profile/${id}`)} /></ErrorBoundary>
          } />
          <Route path="/feed" element={
            <ErrorBoundary><ForumFeed user={user} token={token!} onSelectThread={(id: number) => navigate(`/feed/${id}`)} onNavigateToProfile={(id: string) => navigate(`/profile/${id}`)} /></ErrorBoundary>
          } />
          <Route path="/feed/:postId" element={<ThreadDetailRoute user={user} token={token!} />} />
          <Route path="/chats" element={<ChatRoute user={user} token={token!} />} />
          <Route path="/chats/:friendId" element={<ChatRoute user={user} token={token!} />} />
          <Route path="/profile/:id" element={<ProfileRoute user={user} token={token!} />} />
          <Route path="/connections" element={
            <ErrorBoundary><Connections user={user} token={token!} onNavigateToProfile={(id: string) => navigate(`/profile/${id}`)} /></ErrorBoundary>
          } />
          <Route path="/settings" element={
            <ErrorBoundary><Settings user={user} token={token!} onLogout={logout} /></ErrorBoundary>
          } />
          <Route path="/admin" element={
            <ErrorBoundary><AdminDash user={user} token={token!} /></ErrorBoundary>
          } />
          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </main>

      {/* FOOTER TICKER */}
      <footer className="bg-black text-white py-2 px-8 overflow-hidden whitespace-nowrap">
        <div className="animate-pulse inline-block text-[10px] font-bold tracking-[1em] uppercase">
          LIVE GRID ACTIVE • SIGNAL STRENGTH: OPTIMAL • {user?.username.toUpperCase()} CONNECTED • COMPATIBILITY ENGINE CALIBRATED • MODERATION SYSTEM ARMED • {user?.is_admin ? 'ADMIN CLEARANCE VERIFIED' : 'CITIZEN CLEARANCE'} • 
        </div>
      </footer>
    </div>
  );
}
