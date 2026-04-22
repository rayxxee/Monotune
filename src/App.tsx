import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Discover from './components/Discover';
import ForumFeed from './components/ForumFeed';
import ThreadDetail from './components/ThreadDetail';
import Profile from './components/Profile';
import AdminDash from './components/AdminDash';
import ChatHub from './components/ChatHub';
import Settings from './components/Settings';
import { LogOut, Radio, User, Shield, MessageSquare, Newspaper, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<'AUTH' | 'ONBOARDING' | 'FEED'>('AUTH');
  const [activeTab, setActiveTab] = useState<'DISCOVER' | 'COMMUNITY' | 'CHATS' | 'PROFILE' | 'ADMIN' | 'SETTINGS'>('DISCOVER');
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('monutune_token');
    const savedUser = localStorage.getItem('monutune_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setStep('FEED');
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
  };

  const logout = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (step === 'AUTH') {
    return <Auth onAuth={handleAuth} />;
  }

  if (step === 'ONBOARDING') {
    return <Onboarding user={user} token={token!} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-grey-silver flex flex-col h-screen overflow-hidden">
      {/* MONOTUNE HEADER */}
      <header className="bg-white border-b-4 border-black px-8 py-4 flex justify-between items-center z-50">
        <h1 className="text-4xl font-black tracking-tighter uppercase whitespace-nowrap cursor-pointer" onClick={() => setActiveTab('DISCOVER')}>MONUTUNE</h1>
        <div className="flex items-center gap-8 font-bold text-xs tracking-widest uppercase">
          <button 
            onClick={() => { setActiveTab('DISCOVER'); setSelectedPostId(null); }}
            className={`flex items-center gap-2 hover:underline ${activeTab === 'DISCOVER' ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <Radio size={16} /> DISCOVER
          </button>
          <button 
            onClick={() => { setActiveTab('COMMUNITY'); setSelectedPostId(null); }}
            className={`flex items-center gap-2 hover:underline ${activeTab === 'COMMUNITY' ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <Newspaper size={16} /> FEED
          </button>
          <button 
            onClick={() => { setActiveTab('CHATS'); setSelectedPostId(null); }}
            className={`flex items-center gap-2 hover:underline ${activeTab === 'CHATS' ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <MessageSquare size={16} /> COMMS
          </button>
          <button 
            onClick={() => { setActiveTab('PROFILE'); setSelectedPostId(null); }}
            className={`flex items-center gap-2 hover:underline ${activeTab === 'PROFILE' ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <User size={16} /> PROFILE
          </button>
          {user?.is_admin && (
            <button 
              onClick={() => { setActiveTab('ADMIN'); setSelectedPostId(null); }}
              className={`flex items-center gap-2 hover:underline ${activeTab === 'ADMIN' ? 'underline decoration-4 underline-offset-8 text-black' : 'text-grey-mid'}`}
            >
              <Shield size={16} /> ADMIN
            </button>
          )}
          <button 
            onClick={() => { setActiveTab('SETTINGS'); setSelectedPostId(null); }}
            className={`flex items-center gap-2 hover:underline ml-4 ${activeTab === 'SETTINGS' ? 'underline decoration-4 underline-offset-8' : ''}`}
            title="SETTINGS"
          >
            <SettingsIcon size={18} />
          </button>
          <button onClick={logout} title="LOGOUT" className="hover:text-red-600 transition-all ml-4">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* DYNAMIC CONTENT */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'DISCOVER' && <Discover token={token!} />}
        {activeTab === 'COMMUNITY' && (
          selectedPostId ? (
            <ThreadDetail 
              postId={selectedPostId} 
              user={user} 
              token={token!} 
              onBack={() => setSelectedPostId(null)} 
            />
          ) : (
            <ForumFeed 
              user={user} 
              token={token!} 
              onSelectThread={(id) => setSelectedPostId(id)} 
            />
          )
        )}
        {activeTab === 'CHATS' && <ChatHub user={user} token={token!} />}
        {activeTab === 'PROFILE' && <Profile currentUser={user} userId={user.id} token={token!} />}
        {activeTab === 'ADMIN' && <AdminDash user={user} token={token!} />}
        {activeTab === 'SETTINGS' && <Settings user={user} token={token!} onLogout={logout} />}
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
