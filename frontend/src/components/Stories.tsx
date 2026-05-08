import React, { useState, useEffect } from 'react';
import { Plus, X, Music, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Stories({ user, token, onNavigateToChat, onNavigateToProfile }: { user: any, token: string, onNavigateToChat?: (userId: number) => void, onNavigateToProfile?: (userId: string) => void }) {
  const [stories, setStories] = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<any | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [newColor, setNewColor] = useState('#000000');
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [showSongSearch, setShowSongSearch] = useState(false);
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState<any[]>([]);
  const [songSearching, setSongSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStories(data);
    } catch (e) {}
  };

  const handlePostStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrack && !newImage) return;
    setLoading(true);
    try {
      let uploadedImageUrl = null;
      if (newImage) {
        const formData = new FormData();
        formData.append('image', newImage);
        const imgRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const imgData = await imgRes.json();
        uploadedImageUrl = imgData.imageUrl;
      }

      await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          trackName: selectedTrack?.name, 
          artistName: selectedTrack?.artist, 
          backgroundColor: newColor,
          spotifyTrackId: selectedTrack?.id,
          imageUrl: uploadedImageUrl
        })
      });
      setShowComposer(false);
      setSelectedTrack(null);
      setNewImage(null);
      fetchStories();
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const handleSongSearch = async () => {
    if (!songQuery.trim()) return;
    setSongSearching(true);
    try {
      const res = await fetch(`/api/music/tracks?q=${encodeURIComponent(songQuery)}`);
      const data = await res.json();
      setSongResults(data);
    } catch (err) {
      console.error('Song search failed');
    } finally {
      setSongSearching(false);
    }
  };

  const handleSelectTrack = (track: any) => {
    setSelectedTrack(track);
    setShowSongSearch(false);
    setSongQuery('');
    setSongResults([]);
  };

  // Auto-advance active story
  useEffect(() => {
    if (!activeStory) return;
    const timer = setTimeout(() => {
      const idx = stories.findIndex(s => s.id === activeStory.id);
      if (idx !== -1 && idx < stories.length - 1) {
        setActiveStory(stories[idx + 1]);
      } else {
        setActiveStory(null);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeStory, stories]);

  // Group stories by user (deduplicate, only show their most recent active story)
  // Our backend query already sorts by created_at DESC so we can just grab the first per user.
  const uniqueUserStories = stories.reduce((acc, story) => {
    if (!acc.find((s: any) => s.user_id === story.user_id)) {
      acc.push(story);
    }
    return acc;
  }, []);

  const hasMyStory = uniqueUserStories.some((s: any) => s.user_id === user.id);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-8 pt-4 md:pt-8 border-b-4 border-black bg-white items-center no-scrollbar">
        {!hasMyStory && (
          <div className="flex flex-col gap-2 items-center min-w-[80px]">
            <button 
              onClick={() => setShowComposer(true)}
              className="w-16 h-16 rounded-full brutalist-border flex items-center justify-center bg-grey-silver hover:bg-black hover:text-white transition-colors"
            >
              <Plus size={24} />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-center truncate w-20">ADD STORY</span>
          </div>
        )}
        
        {uniqueUserStories.map((story: any) => (
          <div key={story.id} className="flex flex-col gap-2 items-center min-w-[80px]">
            <div 
              className={`w-16 h-16 rounded-full border-4 cursor-pointer overflow-hidden story-ring ${story.user_id === user.id ? 'border-black' : 'border-cyan-400'}`}
              onClick={() => setActiveStory(story)}
            >
              <img src={story.profile_picture || `https://api.dicebear.com/9.x/shapes/svg?seed=${story.username}`} className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-center truncate w-20">
              {story.user_id === user.id ? 'YOU' : story.username}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeStory && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          >
            <div 
              className="w-full max-w-md aspect-[9/16] relative brutalist-border-thick flex flex-col justify-between p-4 md:p-8 shadow-[16px_16px_0_0_rgba(255,255,255,0.2)]"
              style={{ background: `linear-gradient(to bottom, ${activeStory.background_color}, #000000)` }}
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
              
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
                    <img src={activeStory.profile_picture || `https://api.dicebear.com/9.x/shapes/svg?seed=${activeStory.username}`} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 
                      className="text-white font-bold tracking-tighter uppercase cursor-pointer hover:underline"
                      onClick={() => { setActiveStory(null); onNavigateToProfile?.(activeStory.user_id); }}
                    >{activeStory.username}</h4>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                      {new Date(activeStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <button onClick={() => setActiveStory(null)} className="text-white hover:text-red-500">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center flex-1 relative z-10 gap-6 w-full h-full">
                {activeStory.image_url && (
                  <div className="absolute inset-0 flex items-center justify-center -z-10 p-4 md:p-8">
                     <img src={activeStory.image_url} className="w-full h-full object-contain drop-shadow-2xl opacity-90" />
                  </div>
                )}
                
                {activeStory.spotify_track_id ? (
                  <iframe 
                    src={`https://open.spotify.com/embed/track/${activeStory.spotify_track_id}?utm_source=generator&theme=0&autoplay=1`}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    style={{ borderRadius: 0, display: 'block', marginTop: 'auto' }}
                  ></iframe>
                ) : activeStory.track_name ? (
                  <div className="mt-auto pb-8">
                    <Music size={64} className="text-white animate-bounce mx-auto" />
                    <div className="text-center mt-4">
                      <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2 break-words">
                        {activeStory.track_name}
                      </h2>
                      <h3 className="text-xl font-bold text-white/70 uppercase tracking-widest break-words">
                        {activeStory.artist_name}
                      </h3>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Progress bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className="h-full bg-white"
                  key={activeStory.id} // reset animation when story changes
                />
              </div>

              {activeStory.user_id !== user.id && onNavigateToChat && (
                <button 
                  onClick={() => {
                    setActiveStory(null);
                    onNavigateToChat(activeStory.user_id);
                  }}
                  className="relative z-10 w-full bg-white text-black p-4 font-black uppercase flex justify-center items-center gap-2 hover:bg-cyan-400 transition-colors"
                >
                  <MessageCircle size={20} /> REPLY TO SIGNAL
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComposer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="w-full max-w-md bg-white brutalist-border-thick p-6 md:p-8">
              <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-6">
                <h3 className="text-3xl font-black tracking-tighter uppercase">NEW STORY</h3>
                <button onClick={() => setShowComposer(false)} className="hover:text-red-500">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handlePostStory} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest">TRACK</label>
                  {selectedTrack ? (
                    <div className="flex items-center justify-between brutalist-border p-4 bg-black text-white">
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-black uppercase truncate">{selectedTrack.name}</span>
                        <span className="text-[10px] text-grey-mid truncate">{selectedTrack.artist}</span>
                      </div>
                      <button type="button" onClick={() => setSelectedTrack(null)} className="text-red-400 hover:text-red-600">
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setShowSongSearch(true)}
                      className="brutalist-border p-4 font-bold uppercase text-lg text-left hover:bg-black hover:text-white transition-colors"
                    >
                      SEARCH SPOTIFY...
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest">VIBE COLOR</label>
                  <input 
                    type="color"
                    className="w-full h-12 brutalist-border cursor-pointer"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-widest">PHOTO / VISUALS</label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setNewImage(e.target.files[0]);
                      }
                    }}
                    className="brutalist-border p-2 text-xs font-bold"
                  />
                  {newImage && <span className="text-xs text-green-600 font-bold">IMAGE READY</span>}
                </div>
                <button type="submit" disabled={loading} className="brutalist-button py-4 mt-4">
                  {loading ? 'BROADCASTING...' : 'PUBLISH SIGNAL'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Song Search Modal */}
      {showSongSearch && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white brutalist-border-thick p-6 md:p-8 flex flex-col gap-6 max-h-[80vh]">
            <div className="flex justify-between items-center border-b-4 border-black pb-4">
              <h3 className="text-2xl font-black tracking-tighter uppercase">SELECT TRACK</h3>
              <button onClick={() => { setShowSongSearch(false); setSongQuery(''); setSongResults([]); }} className="hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex gap-2">
              <input 
                type="text"
                value={songQuery}
                onChange={e => setSongQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSongSearch(); } }}
                placeholder="SEARCH A SONG..."
                className="flex-1 brutalist-input p-3 font-bold uppercase"
                autoFocus
              />
              <button 
                type="button"
                onClick={handleSongSearch}
                disabled={songSearching}
                className="brutalist-button px-4 py-2 flex items-center justify-center"
              >
                <Music size={16} />
              </button>
            </div>

            {songSearching && (
              <div className="text-center text-xs font-bold tracking-widest uppercase animate-pulse py-4">
                SCANNING SPOTIFY...
              </div>
            )}

            <div className="flex flex-col gap-1 overflow-y-auto max-h-[50vh]">
              {songResults.map((track, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectTrack(track)}
                  className="text-left font-bold text-sm hover:bg-black hover:text-white p-3 uppercase flex items-center gap-3 transition-colors brutalist-border bg-white"
                >
                  {track.image && (
                    <img src={track.image} className="w-12 h-12 object-cover border border-black shrink-0" alt="" />
                  )}
                  <div className="flex flex-col overflow-hidden flex-1">
                    <span className="truncate font-black">{track.name}</span>
                    <span className="text-[10px] text-grey-mid truncate">{track.artist} · {track.album}</span>
                  </div>
                  <Music size={14} className="shrink-0 opacity-40" />
                </button>
              ))}
              {songResults.length === 0 && !songSearching && songQuery && (
                <p className="text-center text-xs font-bold tracking-widest text-grey-mid uppercase py-8">
                  TYPE A SONG NAME AND HIT SEARCH
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
