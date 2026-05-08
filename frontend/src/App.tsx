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
import Connections from './components/Connections';
import { LogOut, Radio, User, Shield, MessageSquare, Newspaper, Settings as SettingsIcon, Users, Menu, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<'AUTH' | 'ONBOARDING' | 'FEED'>('AUTH');
  const [activeTab, setActiveTab] = useState<'DISCOVER' | 'COMMUNITY' | 'CHATS' | 'PROFILE' | 'ADMIN' | 'SETTINGS' | 'CONNECTIONS'>('DISCOVER');
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  
  // Navigation History and View Profile
  const [navHistory, setNavHistory] = useState<{tab: typeof activeTab, postId?: number, profileId?: number}[]>([]);
  const [viewProfileId, setViewProfileId] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigateTo = (tab: typeof activeTab, postId: number | null = null, profileId: number | null = null) => {
    setNavHistory(prev => [...prev, { tab: activeTab, postId: selectedPostId || undefined, profileId: viewProfileId || undefined }]);
    setActiveTab(tab);
    setSelectedPostId(postId);
    setViewProfileId(profileId);
    setIsMobileMenuOpen(false);
  };

  const navigateBack = () => {
    if (navHistory.length === 0) return;
    const prev = navHistory[navHistory.length - 1];
    setNavHistory(h => h.slice(0, -1));
    setActiveTab(prev.tab);
    setSelectedPostId(prev.postId || null);
    setViewProfileId(prev.profileId || null);
  };

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
    <div className="min-h-screen bg-grey-silver flex flex-col h-screen overflow-hidden relative">
      {/* MONOTUNE HEADER */}
      <header className="bg-white border-b-4 border-black px-4 md:px-8 py-4 flex justify-between items-center z-50">
        <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase whitespace-nowrap cursor-pointer" onClick={() => navigateTo('DISCOVER')}>MONUTUNE</h1>
        
        {/* DESKTOP NAV */}
        <div className="hidden lg:flex items-center gap-8 font-bold text-xs tracking-widest uppercase">
          <button 
            onClick={() => navigateTo('DISCOVER')}
            className={`flex items-center gap-2 hover:underline ${activeTab === 'DISCOVER' ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <Radio size={16} /> DISCOVER
          </button>
          <button 
            onClick={() => navigateTo('COMMUNITY')}
            className={`flex items-center gap-2 hover:underline ${activeTab === 'COMMUNITY' ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <Newspaper size={16} /> FEED
          </button>
          <button 
            onClick={() => navigateTo('CHATS')}
            className={`flex items-center gap-2 hover:underline ${activeTab === 'CHATS' ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <MessageSquare size={16} /> COMMS
          </button>
          <button 
            onClick={() => navigateTo('CONNECTIONS')}
            className={`flex items-center gap-2 hover:underline ${activeTab === 'CONNECTIONS' ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <Users size={16} /> CONNECT
          </button>
          <button 
            onClick={() => navigateTo('PROFILE', null, user?.id)}
            className={`flex items-center gap-2 hover:underline ${activeTab === 'PROFILE' && viewProfileId === user?.id ? 'underline decoration-4 underline-offset-8' : ''}`}
          >
            <User size={16} /> PROFILE
          </button>
          {user?.is_admin && (
            <button 
              onClick={() => navigateTo('ADMIN')}
              className={`flex items-center gap-2 hover:underline ${activeTab === 'ADMIN' ? 'underline decoration-4 underline-offset-8 text-black' : 'text-grey-mid'}`}
            >
              <Shield size={16} /> ADMIN
            </button>
          )}
          <button 
            onClick={() => navigateTo('SETTINGS')}
            className={`flex items-center gap-2 hover:underline ml-4 ${activeTab === 'SETTINGS' ? 'underline decoration-4 underline-offset-8' : ''}`}
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
          <button 
            onClick={() => navigateTo('DISCOVER')}
            className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${activeTab === 'DISCOVER' ? 'text-cyan-500' : ''}`}
          >
            <Radio size={24} /> DISCOVER
          </button>
          <button 
            onClick={() => navigateTo('COMMUNITY')}
            className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${activeTab === 'COMMUNITY' ? 'text-cyan-500' : ''}`}
          >
            <Newspaper size={24} /> FEED
          </button>
          <button 
            onClick={() => navigateTo('CHATS')}
            className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${activeTab === 'CHATS' ? 'text-cyan-500' : ''}`}
          >
            <MessageSquare size={24} /> COMMS
          </button>
          <button 
            onClick={() => navigateTo('CONNECTIONS')}
            className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${activeTab === 'CONNECTIONS' ? 'text-cyan-500' : ''}`}
          >
            <Users size={24} /> CONNECT
          </button>
          <button 
            onClick={() => navigateTo('PROFILE', null, user?.id)}
            className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${activeTab === 'PROFILE' && viewProfileId === user?.id ? 'text-cyan-500' : ''}`}
          >
            <User size={24} /> PROFILE
          </button>
          {user?.is_admin && (
            <button 
              onClick={() => navigateTo('ADMIN')}
              className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${activeTab === 'ADMIN' ? 'text-cyan-500' : ''}`}
            >
              <Shield size={24} /> ADMIN
            </button>
          )}
          <button 
            onClick={() => navigateTo('SETTINGS')}
            className={`flex items-center gap-4 hover:text-cyan-500 w-full justify-center ${activeTab === 'SETTINGS' ? 'text-cyan-500' : ''}`}
          >
            <SettingsIcon size={24} /> SETTINGS
          </button>
          <button 
            onClick={logout} 
            className="flex items-center gap-4 text-red-600 hover:text-black w-full justify-center mt-8 border-t-4 border-black pt-8"
          >
            <LogOut size={24} /> LOGOUT
          </button>
        </div>
      )}

      {/* DYNAMIC CONTENT */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'DISCOVER' && <Discover token={token!} onNavigateToProfile={(id) => navigateTo('PROFILE', null, id)} />}
        {activeTab === 'COMMUNITY' && (
          selectedPostId ? (
            <ThreadDetail 
              postId={selectedPostId} 
              user={user} 
              token={token!} 
              onBack={navigateBack}
              onNavigateToProfile={(id) => navigateTo('PROFILE', null, id)}
            />
          ) : (
            <ForumFeed 
              user={user} 
              token={token!} 
              onSelectThread={(id) => navigateTo('COMMUNITY', id)}
              onNavigateToProfile={(id) => navigateTo('PROFILE', null, id)}
            />
          )
        )}
        {activeTab === 'CHATS' && <ChatHub user={user} token={token!} onNavigateToProfile={(id) => navigateTo('PROFILE', null, id)} initialChatId={viewProfileId} onBack={navHistory.length > 0 ? navigateBack : undefined} />}
        {activeTab === 'CONNECTIONS' && <Connections user={user} token={token!} onNavigateToProfile={(id) => navigateTo('PROFILE', null, id)} />}
        {activeTab === 'PROFILE' && <Profile currentUser={user} userId={viewProfileId || user.id} token={token!} onBack={navHistory.length > 0 ? navigateBack : undefined} onNavigateToChat={(id) => navigateTo('CHATS', null, id)} onSelectThread={(id) => navigateTo('COMMUNITY', id)} />}
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
