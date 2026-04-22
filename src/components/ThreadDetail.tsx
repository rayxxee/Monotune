import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, Send } from 'lucide-react';

export default function ThreadDetail({ postId, user, token, onBack }: { postId: number, user: any, token: string, onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchThread();
  }, [postId]);

  const fetchThread = async () => {
    const res = await fetch(`/api/posts/${postId}`);
    const resData = await res.json();
    setData(resData);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: comment,
          userId: user.id
        })
      });
      const resData = await res.json();
      if (!res.ok) {
        if (resData.is_toxic) setError('COMMENT REJECTED: TOXICITY DETECTED.');
        else throw new Error(resData.error);
        return;
      }
      setComment('');
      fetchThread();
    } catch (err) {
      setError('FAILED TO TRANSMIT COMMENT.');
    } finally {
      setLoading(false);
    }
  };

  if (!data) return null;

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white flex flex-col items-center">
      <div className="max-w-3xl w-full flex flex-col gap-12">
        <button onClick={onBack} className="self-start font-bold text-xs tracking-widest hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> BACK TO GRID
        </button>

        {/* OP POST */}
        <div className="brutalist-border-thick p-12 flex flex-col gap-8 bg-grey-silver">
          <div className="flex items-center gap-4 border-b-4 border-black pb-4">
             <h4 className="font-bold text-xl tracking-tighter uppercase">{data.post.username}</h4>
             <span className="text-xs font-bold text-grey-mid uppercase">ORIGINAL SIGNAL</span>
          </div>
          <p className="text-5xl font-black tracking-tighter leading-none uppercase italic">
            "{data.post.content}"
          </p>
        </div>

        {/* COMMENTS SECTION */}
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-end border-b-2 border-black pb-2">
            <h3 className="text-xl font-bold">REPLIES</h3>
            <span className="text-[10px] font-bold opacity-30">{data.comments.length} CHANNELS ACTIVE</span>
          </div>

          <div className="flex flex-col gap-4">
            {data.comments.map((c: any) => (
              <div key={c.id} className="brutalist-border p-6 bg-white flex flex-col gap-2">
                 <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase opacity-40">
                    <span>{c.username}</span>
                    <span>{new Date(c.created_at).toLocaleTimeString()}</span>
                 </div>
                 <p className="font-bold text-lg uppercase">{c.content}</p>
              </div>
            ))}
          </div>

          {/* COMMENT COMPOSER */}
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex gap-4">
               <input 
                  className="flex-1 brutalist-border p-4 font-bold uppercase"
                  placeholder="ADD TO THE SIGNAL..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment(e as any)}
               />
               <button 
                  onClick={handleComment}
                  disabled={loading}
                  className="brutalist-button px-8"
               >
                  <Send size={24} />
               </button>
            </div>
            
            {error && (
              <div className="bg-white border-2 border-black p-4 flex items-center gap-3 text-black">
                <AlertCircle size={20} className="text-black" />
                <span className="font-black tracking-tighter text-xs uppercase">{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
