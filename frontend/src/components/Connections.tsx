import React, { useState, useEffect } from 'react';
import { ShieldAlert, UserMinus, Check, X, Search, User } from 'lucide-react';

export default function Connections({ user, token, onNavigateToProfile }: { user: any, token: string, onNavigateToProfile: (id: number) => void }) {
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'unfriend' | 'block', id: number } | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [fRes, pRes, bRes] = await Promise.all([
        fetch(`/api/users/${user.id}/friends`, { headers }),
        fetch(`/api/users/${user.id}/pending`, { headers }),
        fetch('/api/blocks', { headers })
      ]);
      
      const fData = fRes.ok ? await fRes.json() : [];
      const pData = pRes.ok ? await pRes.json() : [];
      const bData = bRes.ok ? await bRes.json() : [];
      
      setFriends(Array.isArray(fData) ? fData : []);
      setPending(Array.isArray(pData) ? pData : []);
      setBlocked(Array.isArray(bData) ? bData : []);
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (friendshipId: number, status: 'accepted' | 'rejected') => {
    try {
      await fetch('/api/friendships/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ friendshipId, status })
      });
      fetchConnections();
    } catch (err) {}
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'unfriend') {
        await fetch('/api/friendships/unfriend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ userId1: user.id, userId2: confirmAction.id })
        });
      } else if (confirmAction.type === 'block') {
        await fetch(`/api/users/${confirmAction.id}/block`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setConfirmAction(null);
      fetchConnections();
    } catch (e) {}
  };

  const handleUnfriend = (friendId: number) => setConfirmAction({ type: 'unfriend', id: friendId });
  const handleBlock = (blockedId: number) => setConfirmAction({ type: 'block', id: blockedId });

  const handleUnblock = async (blockedId: number) => {
    try {
      await fetch(`/api/users/${blockedId}/unblock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchConnections();
    } catch (e) {}
  };

  const filteredFriends = friends.filter(f => f.friend_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-12 font-bold uppercase tracking-widest text-xl">SYNCING NETWORK...</div>;

  return (
    <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto bg-white flex flex-col gap-8 md:gap-12 relative">
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 md:p-8 max-w-md w-full brutalist-border flex flex-col gap-6 animate-in fade-in zoom-in-95">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-red-600">
              {confirmAction.type === 'unfriend' ? 'SEVER CONNECTION?' : 'INITIATE BLOCK PROTOCOL?'}
            </h3>
            <p className="text-sm font-bold uppercase tracking-widest text-grey-dark">
              {confirmAction.type === 'unfriend' 
                ? 'ARE YOU SURE YOU WANT TO UNFRIEND THIS USER?' 
                : 'THIS USER WILL BE PURGED FROM YOUR NETWORK. PROCEED?'}
            </p>
            <div className="flex gap-4 mt-4">
              <button onClick={executeAction} className="flex-1 brutalist-button bg-red-600 text-white hover:bg-black hover:text-red-600 py-3 font-black text-lg tracking-widest">
                CONFIRM
              </button>
              <button onClick={() => setConfirmAction(null)} className="flex-1 border-4 border-black bg-white text-black hover:bg-grey-silver py-3 font-black text-lg tracking-widest">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-12">
        <div className="border-b-4 border-black pb-4">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">NETWORK HUB</h2>
          <span className="text-xs font-bold tracking-widest text-grey-mid uppercase">MANAGE SIGNALS AND CONNECTIONS</span>
        </div>

        {/* INCOMING SIGNALS */}
        {pending.length > 0 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-2xl font-black uppercase underline decoration-4 underline-offset-8">INCOMING SIGNALS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pending.map(req => (
                <div key={req.id} className="brutalist-border p-6 bg-black text-white flex justify-between items-center">
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => onNavigateToProfile(req.user_id_1)}>
                    <div className="w-12 h-12 brutalist-border overflow-hidden bg-white">
                      <img src={req.requester_pic || `https://api.dicebear.com/9.x/shapes/svg?seed=${req.requester_name}`} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="font-bold uppercase text-lg hover:underline">{req.requester_name}</span>
                      <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">{req.similarity_score}% MATCH</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => handleRespond(req.id, 'accepted')} className="p-3 bg-white text-black brutalist-border hover:bg-cyan-400 hover:text-black transition-colors" title="ACCEPT">
                        <Check size={20} strokeWidth={3} />
                     </button>
                     <button onClick={() => handleRespond(req.id, 'rejected')} className="p-3 border-2 border-white hover:bg-red-500 hover:border-red-500 transition-colors" title="REJECT">
                        <X size={20} strokeWidth={3} />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVE CONNECTIONS */}
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-end border-b-2 border-black pb-2">
            <h3 className="text-2xl font-black uppercase underline decoration-4 underline-offset-8">ACTIVE CONNECTIONS</h3>
            <div className="flex items-center gap-2 border border-black px-2 py-1">
               <Search size={14} />
               <input 
                 type="text" 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="outline-none text-xs font-bold uppercase placeholder:opacity-40" 
                 placeholder="FILTER NETWORK..."
               />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFriends.map(f => {
              const friendId = f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1;
              return (
                <div key={f.id} className="brutalist-border p-6 bg-grey-silver flex flex-col gap-4">
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => onNavigateToProfile(friendId)}>
                    <div className="w-16 h-16 border-2 border-black overflow-hidden bg-white hover:grayscale-0 grayscale transition-all">
                      <img src={f.friend_pic || `https://api.dicebear.com/9.x/shapes/svg?seed=${f.friend_name}`} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl uppercase tracking-tighter hover:underline">{f.friend_name}</h4>
                      <p className="text-xs text-grey-mid font-bold uppercase tracking-widest">{f.similarity_score}% MATCH</p>
                    </div>
                  </div>
                  <div className="flex justify-between pt-4 border-t-2 border-black">
                     <button onClick={() => handleUnfriend(friendId)} className="text-[10px] font-bold text-grey-dark uppercase tracking-widest hover:text-red-600 flex items-center gap-1">
                       <UserMinus size={14} /> UNFRIEND
                     </button>
                     <button onClick={() => handleBlock(friendId)} className="text-[10px] font-bold text-grey-dark uppercase tracking-widest hover:text-red-600 flex items-center gap-1">
                       <ShieldAlert size={14} /> BLOCK
                     </button>
                  </div>
                </div>
              );
            })}
            {filteredFriends.length === 0 && (
              <div className="col-span-full py-12 text-center text-grey-mid font-bold tracking-[0.3em] uppercase text-sm">
                NO ACTIVE CONNECTIONS.
              </div>
            )}
          </div>
        </div>

        {/* BLOCKED USERS */}
        {blocked.length > 0 && (
          <div className="flex flex-col gap-6 opacity-60 hover:opacity-100 transition-opacity">
            <h3 className="text-xl font-black uppercase underline decoration-2 underline-offset-4 text-red-600">BLOCKED ENTITIES</h3>
            <div className="flex flex-wrap gap-4">
              {blocked.map(b => (
                <div key={b.id} className="brutalist-border px-4 py-2 bg-white flex items-center gap-4">
                  <span className="font-bold uppercase text-sm">{b.blocked_name}</span>
                  <button onClick={() => handleUnblock(b.blocked_id)} className="text-[10px] font-bold tracking-widest uppercase hover:text-green-500">
                    UNBLOCK
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
