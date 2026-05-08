import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Heart, X, Radio, Star, Filter, Music } from 'lucide-react';

export default function Discover({ token, onNavigateToProfile }: { token: string, onNavigateToProfile?: (id: string) => void }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchAlert, setMatchAlert] = useState<any>(null);
  const [encores, setEncores] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [genreFilter, setGenreFilter] = useState('');

  useEffect(() => {
    fetchMatches();
    fetchEncores();
  }, [genreFilter]);

  const fetchEncores = async () => {
    try {
      const res = await fetch('/api/discover/encores/remaining', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setEncores(data.remaining || 0);
    } catch (e) {}
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/discover${genreFilter ? `?genre=${encodeURIComponent(genreFilter)}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch discovery grid.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right', targetUserId: number, isEncore: boolean = false) => {
    // Remove the swiped user from the local state
    setMatches((prev) => prev.filter((m) => m.id !== targetUserId));
    
    if (isEncore) {
      setEncores(prev => Math.max(0, prev - 1));
    }

    try {
      const res = await fetch('/api/discover/swipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId, direction, isEncore })
      });
      const data = await res.json();
      if (data.isMatch) {
        // Show Match Alert
        const matchedUser = matches.find(m => m.id === targetUserId);
        setMatchAlert(matchedUser);
      }
    } catch (err) {
      console.error('Failed to register swipe signal.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Radio size={48} className="text-black" />
        </motion.div>
        <span className="text-xs font-bold tracking-[0.5em] uppercase">SCANNING FREQUENCIES...</span>
      </div>
    );
  }

  // If match alert is active
  if (matchAlert) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-black text-white relative overflow-hidden">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center z-10 flex flex-col items-center gap-8"
        >
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase text-cyan-400">IT'S A MATCH!</h2>
          <p className="text-xl font-bold tracking-widest uppercase">You and {matchAlert.username} share the same frequency.</p>
          
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => setMatchAlert(null)}
              className="brutalist-button px-8 py-4 bg-white text-black hover:bg-cyan-400 hover:text-black uppercase font-bold text-xl transition-all"
            >
              KEEP SWIPING
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-hidden flex flex-col">
      <div className="max-w-md w-full mx-auto flex flex-col gap-6 h-full relative">
        <div className="flex flex-col gap-4 shrink-0">
          <div className="flex justify-between items-end border-b-4 border-black pb-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">DISCOVER</h2>
            <div className="flex gap-4 items-center">
               <span className="text-[10px] font-bold tracking-widest text-grey-mid uppercase">{matches.length} SIGNALS</span>
               <button onClick={() => setShowFilters(!showFilters)} className={`p-2 border-2 border-black ${showFilters ? 'bg-black text-white' : 'bg-white text-black'}`}>
                 <Filter size={16} />
               </button>
            </div>
          </div>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="brutalist-border p-4 bg-grey-silver flex flex-col gap-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest border-b-2 border-black pb-2">DEALBREAKERS & FILTERS</h3>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest">MUST MATCH GENRE:</label>
                    <select 
                      value={genreFilter}
                      onChange={e => setGenreFilter(e.target.value)}
                      className="brutalist-border p-2 font-bold uppercase text-xs"
                    >
                      <option value="">ALL GENRES</option>
                      <option value="pop">POP</option>
                      <option value="hiphop">HIP HOP</option>
                      <option value="rock">ROCK</option>
                      <option value="metal">METAL</option>
                      <option value="indie">INDIE</option>
                      <option value="electronic">ELECTRONIC</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 relative w-full flex items-center justify-center">
          <AnimatePresence>
            {matches.length > 0 ? (
              matches.slice(0, 2).reverse().map((match, idx) => {
                const isTop = idx === matches.slice(0, 2).length - 1;
                return (
                  <SwipeableCard 
                    key={match.id}
                    match={match}
                    isTop={isTop}
                    onSwipe={(dir, isEncore) => handleSwipe(dir, match.id, isEncore)}
                    encoresRemaining={encores}
                    onNavigateToProfile={onNavigateToProfile}
                  />
                );
              })
            ) : (
              <div className="text-center flex flex-col items-center gap-4 text-grey-mid">
                <Radio size={48} className="opacity-20" />
                <p className="text-sm font-bold tracking-widest uppercase">NO MORE SIGNALS DETECTED.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SwipeableCard({ match, isTop, onSwipe, encoresRemaining, onNavigateToProfile }: { key?: React.Key, match: any, isTop: boolean, onSwipe: (dir: 'left' | 'right', isEncore?: boolean) => void, encoresRemaining: number, onNavigateToProfile?: (id: string) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  return (
    <motion.div
      className={`absolute w-full h-[500px] bg-white brutalist-border flex flex-col overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,1)]`}
      style={{ x, rotate, opacity: isTop ? opacity : 1, scale: isTop ? 1 : 0.95, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, y: 20 }}
      animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 20 }}
      exit={{ x: x.get() > 0 ? 500 : -500, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="h-[35%] bg-grey-dark relative overflow-hidden shrink-0">
        <img 
          src={match.profile_picture || `https://api.dicebear.com/9.x/shapes/svg?seed=${match.username}`}
          className="w-full h-full object-cover pointer-events-none"
          alt={match.username}
        />
        <div className="absolute top-4 right-4 bg-black text-white px-3 py-1 font-bold text-sm tracking-tighter shadow-[4px_4px_0_0_rgba(255,255,255,1)] border border-white border-opacity-20 flex flex-col items-center">
          <span>{match.matchScore}% MATCH</span>
        </div>
        {match.favorite_genre && (
          <div className="absolute bottom-4 left-4 bg-white text-black px-3 py-1 font-bold text-[10px] tracking-widest uppercase border border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
            {match.favorite_genre}
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
        <div>
          <h3 
            className="text-4xl font-black tracking-tighter uppercase cursor-pointer hover:underline"
            onClick={(e) => { e.stopPropagation(); onNavigateToProfile?.(match.id); }}
          >{match.username}</h3>
          <p className="text-sm font-bold tracking-widest text-grey-mid uppercase line-clamp-2 mt-1">
            {match.liner_notes || 'STELLAR SILENCE.'}
          </p>
        </div>
        
        {match.anthem_track_id && (
          <div className="flex items-center gap-2 bg-black text-white p-2 border border-black">
             <Music size={16} className="text-cyan-400" />
             <div className="flex-1 overflow-hidden">
               <span className="text-[10px] font-bold tracking-widest uppercase block text-grey-mid">SONIC ANTHEM</span>
               <span className="font-bold text-xs uppercase truncate block">{match.anthem_name || match.anthem_track_id}</span>
             </div>
             <button className="bg-white text-black px-2 py-1 text-[10px] font-black uppercase hover:bg-cyan-400">PLAY</button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-grey-mid uppercase">COMPATIBILITY BREAKDOWN</span>
            <div className="flex flex-col gap-2 mt-2">
               <div className="w-full bg-grey-silver h-2">
                 <div className="bg-black h-full" style={{ width: `${match.matchScore}%` }} />
               </div>
               <div className="flex justify-between text-[10px] font-bold uppercase">
                 <span>VIBE OVERLAP</span>
                 <span>{match.matchScore}%</span>
               </div>
            </div>
          </div>
          
          <div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-grey-mid uppercase">SHARED FREQUENCIES</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {match.sharedArtists && match.sharedArtists.length > 0 ? (
                match.sharedArtists.map((artist: string, i: number) => (
                  <span key={i} className="bg-grey-silver text-[10px] font-bold px-2 py-1 border border-black uppercase">
                    {artist}
                  </span>
                ))
              ) : (
                <span className="text-[10px] italic opacity-40">NO DIRECT OVERLAP</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      {isTop && (
        <div className="flex items-center justify-center gap-6 p-6 bg-grey-silver border-t-4 border-black shrink-0">
          <button 
            onClick={() => onSwipe('left')}
            className="w-14 h-14 rounded-full bg-white border-4 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <X size={24} strokeWidth={3} />
          </button>
          <div className="flex flex-col items-center">
            <button 
              onClick={() => onSwipe('right', true)}
              disabled={encoresRemaining <= 0}
              className="w-12 h-12 rounded-full bg-yellow-400 border-4 border-black flex items-center justify-center hover:bg-white transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed encore-glow"
            >
              <Star size={20} strokeWidth={3} className={encoresRemaining > 0 ? 'text-black fill-black' : 'text-black'} />
            </button>
            <span className="text-[8px] font-black tracking-widest uppercase mt-2">{encoresRemaining} LEFT</span>
          </div>
          <button 
            onClick={() => onSwipe('right')}
            className="w-14 h-14 rounded-full bg-white border-4 border-black flex items-center justify-center hover:bg-green-400 hover:text-black transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Heart size={24} strokeWidth={3} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
