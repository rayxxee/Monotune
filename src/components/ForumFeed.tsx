import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Music, Upload, AlertCircle, Share2, Heart } from 'lucide-react';

export default function ForumFeed({ user, token, onSelectThread }: { user: any, token: string, onSelectThread: (id: number) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
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
      setNewPost('');
      fetchPosts();
    } catch (err: any) {
      setError('FAILED TO BROADCAST SIGNAL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-grey-silver">
      <div className="max-w-3xl mx-auto flex flex-col gap-12">
        <div className="border-b-4 border-black pb-4">
          <h2 className="text-6xl font-bold tracking-tighter">COMMUNITY FEED</h2>
        </div>

        {/* POST COMPOSER */}
        <div className="bg-white brutalist-border p-8 flex flex-col gap-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <textarea 
            className="w-full min-h-[120px] text-2xl font-bold uppercase border-none focus:ring-0 placeholder:opacity-20 resize-none"
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

              <p className="text-3xl font-bold tracking-tighter leading-none uppercase">
                "{post.content}"
              </p>

              <div className="flex gap-8 items-center pt-4 border-t-2 border-black">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <MessageSquare size={16} /> 24 COMMENTS
                </div>
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Heart size={16} /> {post.likes_count}
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
