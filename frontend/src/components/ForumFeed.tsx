import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Music, Upload, AlertCircle, Share2, ArrowUp, ArrowDown, Image as ImageIcon, X } from 'lucide-react';
import Stories from './Stories';

export default function ForumFeed({ user, token, onSelectThread, onNavigateToProfile }: { user: any, token: string, onSelectThread: (id: number) => void, onNavigateToProfile?: (id: string) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPost, setNewPost] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [showSongSearch, setShowSongSearch] = useState(false);
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState<any[]>([]);
  const [songSearching, setSongSearching] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchPosts(1, true);
  }, []);

  const fetchPosts = async (page = 1, reset = false) => {
    if (page > 1) setLoadingMore(true);
    try {
      const res = await fetch(`/api/posts?page=${page}&limit=20`);
      const data = await res.json();
      if (reset) {
        setPosts(data.data || []);
      } else {
        setPosts(prev => [...prev, ...(data.data || [])]);
      }
      setCurrentPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {} finally {
      setLoadingMore(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setLoading(true);
    setError('');

    let uploadedImageUrl = undefined;

    try {
      if (newImageFile) {
        const formData = new FormData();
        formData.append('image', newImageFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Image upload failed');
        const uploadData = await uploadRes.json();
        uploadedImageUrl = uploadData.imageUrl;
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newPost,
          userId: user.id,
          imageUrl: uploadedImageUrl,
          spotifyTrackId: selectedTrack ? selectedTrack.id : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.is_toxic) setError('POST REJECTED: TOXICITY DETECTED.');
        else throw new Error(data.error);
        return;
      }
      setNewTitle('');
      setNewPost('');
      setNewImageFile(null);
      setSelectedTrack(null);
      setShowExtras(false);
      fetchPosts(1, true);
    } catch (err: any) {
      setError('FAILED TO BROADCAST SIGNAL.');
    } finally {
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

  const handleVote = async (postId: number, type: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map(p => {
          if (p.id === postId) {
            return { ...p, upvotes: data.upvotes, downvotes: data.downvotes };
          }
          return p;
        }));
      }
    } catch (err) { }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-grey-silver">
      <Stories user={user} token={token} onNavigateToProfile={onNavigateToProfile} />
      <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto flex flex-col gap-12">
          <div className="border-b-4 border-black pb-4">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">COMMUNITY FEED</h2>
          </div>

          {/* POST COMPOSER */}
          <div className="bg-white brutalist-border p-6 md:p-8 flex flex-col gap-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <input
              type="text"
              className="w-full text-4xl font-black uppercase border-b-2 border-black pb-2 focus:outline-none placeholder:text-grey-mid"
              placeholder="BROADCAST TITLE"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              className="w-full min-h-[100px] text-xl font-bold uppercase border-none focus:ring-0 placeholder:opacity-20 resize-none mt-2"
              placeholder="WHAT'S THE SIGNAL?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />

            {error && (
              <div className="bg-white border-2 border-black p-4 flex items-center gap-3 text-black animate-pulse">
                <AlertCircle size={24} className="text-black" />
                <span className="font-black tracking-tighter text-sm uppercase">{error}</span>
              </div>
            )}

            {showExtras && (
              <div className="flex flex-col gap-4 mt-2 p-4 bg-grey-silver brutalist-border">
                <div className="flex items-center gap-4">
                  <ImageIcon size={20} className="shrink-0" />
                  <input
                    type="file"
                    accept="image/*"
                    className="flex-1 bg-transparent border-b-2 border-black pb-1 font-bold text-xs uppercase focus:outline-none"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewImageFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Music size={20} className="shrink-0" />
                  {selectedTrack ? (
                    <div className="flex-1 flex justify-between items-center bg-black text-white p-2">
                      <span className="font-bold text-xs uppercase truncate">{selectedTrack.name} - {selectedTrack.artist}</span>
                      <button onClick={() => setSelectedTrack(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setShowSongSearch(true)}
                      className="flex-1 text-left bg-white border-2 border-black p-2 font-bold text-xs uppercase hover:bg-black hover:text-white transition-colors"
                    >
                      SEARCH SPOTIFY FOR A TRACK...
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t-2 border-black">
              <div className="flex gap-4 cursor-pointer" onClick={() => setShowExtras(!showExtras)}>
                <Music size={20} className={showExtras ? "text-black" : "opacity-30"} />
                <Upload size={20} className={showExtras ? "text-black" : "opacity-30"} />
              </div>
              <button
                onClick={handlePost}
                disabled={loading}
                className="brutalist-button px-8 py-3"
              >
                {loading ? 'BROADCASTING...' : 'BROADCAST'}
              </button>
            </div>
          </div>

          {/* FEED STREAM */}
          <div className="flex flex-col gap-8">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white brutalist-border p-6 md:p-8 flex flex-col gap-6 cursor-pointer hover:translate-x-1 hover:-translate-y-1 transition-transform"
                onClick={() => onSelectThread(post.id)}
              >
                <div className="flex items-center gap-4 border-b-2 border-black pb-4 justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 brutalist-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-cyan-400 transition-all"
                      onClick={(e) => { e.stopPropagation(); onNavigateToProfile?.(post.user_id); }}
                    >
                      <img src={post.profile_picture || `https://api.dicebear.com/9.x/shapes/svg?seed=${post.username}`} className="grayscale" />
                    </div>
                    <h4 
                      className="font-bold text-lg tracking-tighter cursor-pointer hover:underline"
                      onClick={(e) => { e.stopPropagation(); onNavigateToProfile?.(post.user_id); }}
                    >{post.username.toUpperCase()}</h4>
                  </div>
                  <span className="text-[10px] font-bold text-grey-mid uppercase">
                    {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div>
                  <h3 className="text-4xl font-black tracking-tighter leading-none uppercase mb-2">
                    {post.title || "UNTITLED"}
                  </h3>
                  <p className="text-xl font-bold tracking-tight uppercase opacity-60 mb-4">
                    {post.content}
                  </p>

                  {post.image_url && (
                    <div className="w-full h-64 border-2 border-black overflow-hidden mb-4 bg-black group relative">
                      <img src={post.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" />
                    </div>
                  )}

                  {post.spotify_track_id && (
                    <div className="w-full mb-4 brutalist-border">
                      <iframe 
                        src={`https://open.spotify.com/embed/track/${post.spotify_track_id}?utm_source=generator&theme=0`}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        style={{ borderRadius: 0, display: 'block' }}
                      ></iframe>
                    </div>
                  )}
                </div>

                <div className="flex gap-8 items-center pt-4 border-t-2 border-black">
                  <div className="flex items-center gap-4">
                    <button onClick={(e) => handleVote(post.id, 'up', e)} className="flex items-center gap-1 font-bold text-xs hover:text-green-500">
                      <ArrowUp size={16} /> {post.upvotes || 0}
                    </button>
                    <button onClick={(e) => handleVote(post.id, 'down', e)} className="flex items-center gap-1 font-bold text-xs hover:text-red-500">
                      <ArrowDown size={16} /> {post.downvotes || 0}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <MessageSquare size={16} /> REPLIES
                  </div>
                  <div className="ml-auto">
                    <Share2 size={16} className="opacity-20" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* LOAD MORE */}
          {currentPage < totalPages && (
            <button
              onClick={() => fetchPosts(currentPage + 1)}
              disabled={loadingMore}
              className="brutalist-button py-4 w-full text-center"
            >
              {loadingMore ? 'LOADING...' : 'LOAD MORE SIGNALS'}
            </button>
          )}
        </div>
      </div>

      {showSongSearch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white brutalist-border-thick p-6 md:p-8 flex flex-col gap-6 max-h-[80vh]">
            <div className="flex justify-between items-center border-b-4 border-black pb-4">
              <h3 className="text-2xl font-black tracking-tighter uppercase">ATTACH TRACK</h3>
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
    </div>
  );
}
