import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Heart, X, Radio } from 'lucide-react';

export default function Discover({ token }: { token: string }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchAlert, setMatchAlert] = useState<any>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/discover', {
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

  const handleSwipe = async (direction: 'left' | 'right', targetUserId: number) => {
    // Remove the swiped user from the local state
    setMatches((prev) => prev.filter((m) => m.id !== targetUserId));

    try {
      const res = await fetch('/api/discover/swipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId, direction })
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black text-white relative overflow-hidden">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center z-10 flex flex-col items-center gap-8"
        >
          <h2 className="text-8xl font-black tracking-tighter uppercase text-cyan-400">IT'S A MATCH!</h2>
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
    <div className="flex-1 p-8 md:p-12 overflow-hidden flex flex-col">
      <div className="max-w-md w-full mx-auto flex flex-col gap-6 h-full relative">
        <div className="flex justify-between items-end border-b-4 border-black pb-4 shrink-0">
          <h2 className="text-5xl font-black tracking-tighter">DISCOVER</h2>
          <span className="text-[10px] font-bold tracking-widest text-grey-mid uppercase">{matches.length} SIGNALS</span>
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
                    onSwipe={(dir) => handleSwipe(dir, match.id)}
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

function SwipeableCard({ match, isTop, onSwipe }: { key?: React.Key, match: any, isTop: boolean, onSwipe: (dir: 'left' | 'right') => void }) {
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
      className={`absolute w-full h-[600px] bg-white brutalist-border flex flex-col overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,1)]`}
      style={{ x, rotate, opacity: isTop ? opacity : 1, scale: isTop ? 1 : 0.95, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, y: 20 }}
      animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 20 }}
      exit={{ x: x.get() > 0 ? 500 : -500, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="h-1/2 bg-grey-dark relative overflow-hidden shrink-0">
        <img 
          src={match.profile_picture || `https://api.dicebear.com/9.x/shapes/svg?seed=${match.username}`}
          className="w-full h-full object-cover pointer-events-none"
          alt={match.username}
        />
        <div className="absolute top-4 right-4 bg-black text-white px-3 py-1 font-bold text-sm tracking-tighter shadow-[4px_4px_0_0_rgba(255,255,255,1)] border border-white border-opacity-20">
          {match.matchScore}% MATCH
        </div>
      </div>

      <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
        <div>
          <h3 className="text-4xl font-black tracking-tighter uppercase">{match.username}</h3>
          <p className="text-sm font-bold tracking-widest text-grey-mid uppercase line-clamp-2 mt-1">
            {match.liner_notes || 'STELLAR SILENCE.'}
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold tracking-[0.2em] text-grey-mid uppercase">SHARED FREQUENCIES</span>
          <div className="flex flex-wrap gap-1">
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
      
      {/* Controls */}
      {isTop && (
        <div className="flex items-center justify-center gap-8 p-6 bg-grey-silver border-t-4 border-black shrink-0">
          <button 
            onClick={() => onSwipe('left')}
            className="w-16 h-16 rounded-full bg-white border-4 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <X size={32} strokeWidth={3} />
          </button>
          <button 
            onClick={() => onSwipe('right')}
            className="w-16 h-16 rounded-full bg-white border-4 border-black flex items-center justify-center hover:bg-green-400 hover:text-black transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Heart size={32} strokeWidth={3} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
