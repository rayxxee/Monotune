import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Music, Upload, AlertCircle, Share2, ArrowUp, ArrowDown } from 'lucide-react';

export default function ForumFeed({ user, token, onSelectThread }: { user: any, token: string, onSelectThread: (id: number) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPost, setNewPost] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const res = await fetch('/api/posts');
    const data = await res.json();
    setPosts(data);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newPost,
          userId: user.id
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
      fetchPosts();
    } catch (err: any) {
      setError('FAILED TO BROADCAST SIGNAL.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (postId: number, type: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return { ...p, [type === 'up' ? 'upvotes' : 'downvotes']: p[type === 'up' ? 'upvotes' : 'downvotes'] + 1 };
        }
        return p;
      }));
    } catch (err) {}
  };

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-grey-silver">
      <div className="max-w-3xl mx-auto flex flex-col gap-12">
        <div className="border-b-4 border-black pb-4">
          <h2 className="text-6xl font-bold tracking-tighter">COMMUNITY FEED</h2>
        </div>

        {/* POST COMPOSER */}
        <div className="bg-white brutalist-border p-8 flex flex-col gap-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
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

          <div className="flex justify-between items-center pt-4 border-t-2 border-black">
            <div className="flex gap-4 opacity-30">
              <Music size={20} />
              <Upload size={20} />
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
              className="bg-white brutalist-border p-8 flex flex-col gap-6 cursor-pointer hover:translate-x-1 hover:-translate-y-1 transition-transform"
              onClick={() => onSelectThread(post.id)}
            >
              <div className="flex items-center gap-4 border-b-2 border-black pb-4 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 brutalist-border overflow-hidden">
                    <img src={post.profile_picture || `https://api.dicebear.com/9.x/shapes/svg?seed=${post.username}`} className="grayscale" />
                  </div>
                  <h4 className="font-bold text-lg tracking-tighter">{post.username.toUpperCase()}</h4>
                </div>
                <span className="text-[10px] font-bold text-grey-mid uppercase">
                  {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div>
                <h3 className="text-4xl font-black tracking-tighter leading-none uppercase mb-2">
                  {post.title || "UNTITLED"}
                </h3>
                <p className="text-xl font-bold tracking-tight uppercase opacity-60">
                  {post.content}
                </p>
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
      </div>
    </div>
  );
}
