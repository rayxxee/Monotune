import React, { useState, useEffect } from 'react';
import { User, Music, Users, ShieldCheck, Check, X, UserMinus } from 'lucide-react';

export default function Profile({ currentUser, userId, token }: { currentUser: any, userId: number, token: string }) {
  const isOwnProfile = currentUser.id === userId;
  const [profile, setProfile] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [profileRes, friendsRes, pendingRes] = await Promise.all([
        fetch(`/api/users/${userId}?viewerId=${currentUser.id}`),
        fetch(`/api/users/${userId}/friends`),
        fetch(`/api/users/${userId}/pending`)
      ]);
      
      const [profileData, friendsData, pendingData] = await Promise.all([
        profileRes.json(),
        friendsRes.json(),
        pendingRes.json()
      ]);

      setProfile(profileData);
      setFriends(friendsData);
      setPending(pendingData);
    } catch (err) {
      console.error('Error fetching profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (friendshipId: number, status: 'accepted' | 'rejected') => {
    try {
      const res = await fetch('/api/friendships/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, status })
      });
      if (res.ok) fetchProfileData();
    } catch (err) {
      console.error('Failed to respond to request');
    }
  };

  const handleUnfriend = async () => {
    if (!confirm('SEVER CONNECTION?')) return;
    try {
      await fetch('/api/friendships/unfriend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId1: currentUser.id, userId2: userId })
      });
      alert('CONNECTION SEVERED.');
      fetchProfileData();
    } catch (e) {}
  };

  const handleRequestFriend = async () => {
    try {
      const res = await fetch('/api/friendships/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId1: currentUser.id, userId2: userId })
      });
      if (res.ok) fetchProfileData();
    } catch (err) {
      console.error('Failed to send request');
    }
  };

  const handleSpotify = async () => {
    try {
      const res = await fetch('/api/auth/spotify');
      const data = await res.json();
      alert(`OAUTH REDIRECT TO: ${data.url} (MOCK)`);
    } catch (e) {}
  };

  if (loading) return null;

  const artists = [profile.top_artist_1, profile.top_artist_2, profile.top_artist_3, profile.top_artist_4, profile.top_artist_5].filter(Boolean);

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto flex flex-col gap-12">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row gap-12 items-start brutalist-border-thick p-12 bg-grey-silver">
          <div className="w-48 h-48 brutalist-border-thick overflow-hidden relative group">
            <img 
              src={profile.profile_picture || `https://api.dicebear.com/9.x/shapes/svg?seed=${profile.username}`} 
              className="w-full h-full object-cover grayscale" 
            />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
               <h1 className="text-7xl font-bold tracking-tighter uppercase leading-none">{profile.username}</h1>
               {profile.is_admin && <ShieldCheck size={32} className="text-black" />}
            </div>
            <p className="text-xl font-bold uppercase text-grey-mid tracking-tight max-w-lg italic">
              "{profile.liner_notes || 'NO LINER NOTES FILED IN THE ARCHIVE.'}"
            </p>
            {isOwnProfile && (
              <button 
                onClick={handleSpotify}
                className="mt-4 brutalist-button py-3 px-6 text-xs bg-green-500 hover:bg-black hover:text-green-500 flex items-center justify-center gap-2 self-start"
              >
                CONNECT WITH SPOTIFY (OAUTH MOCK)
              </button>
            )}
            {!isOwnProfile && (
              <div className="flex gap-4 items-center border-t-2 border-black pt-4 w-full">
                 <div className="bg-black text-white px-4 py-2 font-bold uppercase tracking-widest text-xs">
                    ESTIMATED COMPATIBILITY: 85%
                 </div>
                 
                 {profile.friendship_status === 'accepted' ? (
                   <button onClick={handleUnfriend} className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs hover:text-red-600 transition-colors ml-auto">
                     <UserMinus size={16} /> UNFRIEND
                   </button>
                 ) : profile.friendship_status === 'pending' ? (
                   profile.friendship_sender === currentUser.id ? (
                     <span className="font-bold uppercase tracking-widest text-xs text-grey-mid ml-auto border border-grey-mid px-4 py-2">REQUEST SENT</span>
                   ) : (
                     <button onClick={() => handleRespond(profile.friendship_id, 'accepted')} className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs text-green-600 hover:text-black hover:bg-green-400 border border-green-600 px-4 py-2 transition-colors ml-auto">
                       <Check size={16} /> ACCEPT REQUEST
                     </button>
                   )
                 ) : (
                   <button onClick={handleRequestFriend} className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs hover:text-cyan-500 transition-colors ml-auto">
                     <User size={16} /> ADD CONNECTION
                   </button>
                 )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* ARTISTS COLUMN */}
          <div className="flex flex-col gap-8">
            <div className="border-b-4 border-black pb-2">
               <h3 className="text-2xl font-black uppercase flex items-center gap-2">
                 <Music size={24} /> SONIC FINGERPRINT
               </h3>
            </div>
            <div className="flex flex-col gap-4">
              {artists.map((artist, i) => (
                <div key={i} className="brutalist-border p-6 font-bold flex justify-between items-center bg-white group hover:invert transition-all">
                   <span className="text-2xl tracking-tighter uppercase">{artist}</span>
                   <span className="text-[10px] opacity-20">0{i+1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CONNECTIONS COLUMN */}
          <div className="flex flex-col gap-8">
            <div className="border-b-4 border-black pb-2">
               <h3 className="text-2xl font-black uppercase flex items-center gap-2">
                 <Users size={24} /> CONNECTIONS
               </h3>
            </div>

            {/* PENDING REQUESTS (Only for own profile) */}
            {isOwnProfile && pending.length > 0 && (
              <div className="flex flex-col gap-4 mb-4">
                <span className="text-[10px] font-bold tracking-[0.5em] text-grey-mid uppercase">INCOMING SIGNALS</span>
                {pending.map((req) => (
                  <div key={req.id} className="brutalist-border p-4 bg-black text-white flex justify-between items-center">
                    <span className="font-bold uppercase text-sm">{req.requester_name}</span>
                    <div className="flex gap-2">
                       <button onClick={() => handleRespond(req.id, 'accepted')} className="p-2 bg-white text-black brutalist-border hover:bg-grey-silver">
                          <Check size={16} />
                       </button>
                       <button onClick={() => handleRespond(req.id, 'rejected')} className="p-2 border border-white hover:bg-grey-dark">
                          <X size={16} />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ACCEPTED FRIENDS */}
            <div className="flex flex-wrap gap-4">
               {friends.map((friend) => (
                 <div key={friend.id} className="flex flex-col gap-2 group cursor-pointer">
                    <div className="w-20 h-20 brutalist-border overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                       <img src={friend.friend_pic || `https://api.dicebear.com/9.x/shapes/svg?seed=${friend.friend_name}`} />
                    </div>
                    <span className="text-[10px] font-bold text-center uppercase tracking-widest truncate w-20">{friend.friend_name}</span>
                 </div>
               ))}
               {friends.length === 0 && (
                 <p className="text-xs font-bold text-grey-mid uppercase tracking-[0.3em]">NO STABLE CONNECTIONS DETECTED.</p>
               )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
