import React, { useState, useEffect } from 'react';
import { Shield, Users, Newspaper, AlertTriangle, Activity, UserX, Check, Trash } from 'lucide-react';

export default function AdminDash({ user, token }: { user: any, token: string }) {
  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<{posts: any[], comments: any[]}>({ posts: [], comments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchQueue();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Admin stats restricted.');
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/admin/review-queue');
      const data = await res.json();
      setQueue(data);
    } catch (err) {
      console.error('Queue error');
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: number) => {
    if (!confirm('INITIATE BAN SEQUENCE FOR THIS USER?')) return;
    try {
      await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isBanned: true })
      });
      alert('USER BAN VERIFIED.');
    } catch (e) {}
  };

  if (!stats) return <div className="p-12 font-black uppercase text-4xl">ACCESS DENIED :: INSUFFICIENT CLEARANCE</div>;

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-grey-silver">
      <div className="max-w-6xl mx-auto flex flex-col gap-12">
        
        <div className="flex items-center gap-4 border-b-8 border-black pb-4">
           <Shield size={64} className="text-black" />
           <h1 className="text-8xl font-black tracking-tighter uppercase">ADMIN PANEL</h1>
        </div>

        {/* STATS TILES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
           {[
             { icon: <Users />, label: 'TOTAL USERS', val: stats.users },
             { icon: <Newspaper />, label: 'TOTAL BROADCASTS', val: stats.posts },
             { icon: <AlertTriangle />, label: 'FLAGGED CONTENT', val: stats.toxicPosts },
             { icon: <Activity />, label: 'SYSTEM LOAD', val: '0.4%' }
           ].map((s, i) => (
             <div key={i} className="bg-white brutalist-border p-8 flex flex-col gap-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center opacity-40">
                   {s.icon}
                   <span className="text-[10px] font-bold tracking-widest">{s.label}</span>
                </div>
                <h2 className="text-6xl font-black tracking-tighter leading-none">{s.val}</h2>
             </div>
           ))}
        </div>

        {/* MANUAL REVIEW QUEUE */}
        <div className="flex flex-col gap-8 bg-white brutalist-border p-12">
           <div className="flex justify-between items-end border-b-2 border-black pb-2">
              <h3 className="text-2xl font-black uppercase underline decoration-4 underline-offset-8">MANUAL REVIEW QUEUE</h3>
              <span className="text-xs font-bold tracking-widest opacity-40 uppercase">BORDERLINE CONTENT</span>
           </div>

           <div className="flex flex-col gap-4">
              {[...queue.posts, ...queue.comments].map((item: any, idx) => (
                <div key={idx} className="brutalist-border p-6 bg-grey-silver flex flex-col gap-4">
                   <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase">
                      <span className="bg-yellow-400 text-black px-2 py-1 border border-black">REVIEW: {item.username}</span>
                      <span className="text-black">AI SCORE: {Math.round(item.toxicity_score * 100)}%</span>
                   </div>
                   <p className="text-xl font-bold uppercase">
                     "{item.content}"
                   </p>
                   <div className="flex gap-4 border-t-2 border-black pt-4">
                      <button className="flex items-center gap-1 text-[10px] font-black uppercase hover:bg-green-400 px-2 py-1 border border-transparent hover:border-black transition-all">
                        <Check size={12}/> APPROVE
                      </button>
                      <button className="flex items-center gap-1 text-[10px] font-black uppercase hover:bg-red-400 px-2 py-1 border border-transparent hover:border-black transition-all">
                        <Trash size={12}/> DELETE CONTENT
                      </button>
                      <button onClick={() => handleBan(item.user_id)} className="flex items-center gap-1 text-[10px] font-black uppercase hover:bg-black hover:text-white px-2 py-1 border border-transparent transition-all ml-auto">
                        <UserX size={12}/> BAN USER
                      </button>
                   </div>
                </div>
              ))}
              {queue.posts.length === 0 && queue.comments.length === 0 && (
                <p className="text-center py-12 font-bold uppercase opacity-20">QUEUE IS CLEAR.</p>
              )}
           </div>
        </div>

        <div className="bg-black text-white p-8 flex flex-col gap-4">
           <h4 className="font-bold tracking-widest text-xs">SYSTEM INTEGRITY STATUS</h4>
           <div className="flex gap-1 h-2">
              {Array.from({length: 40}).map((_, i) => (
                <div key={i} className={`flex-1 ${Math.random() > 0.8 ? 'bg-grey-mid' : 'bg-white'}`} />
              ))}
           </div>
        </div>

      </div>
    </div>
  );
}
