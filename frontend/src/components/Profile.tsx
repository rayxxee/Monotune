import React, { useState, useEffect, useRef } from 'react';
import { User, UserPlus, Music, Users, ShieldCheck, Check, X, UserMinus, ArrowLeft, MessageCircle, Image as ImageIcon, Trash2, Radio } from 'lucide-react';

const SpotifyAutoplayer = ({ trackId }: { trackId: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let controller: any = null;

    const init = () => {
      if (!containerRef.current || !(window as any).SpotifyIframeApi) return;
      
      const options = {
        uri: `spotify:track:${trackId}`,
        width: '100%',
        height: '80',
        theme: '0'
      };
      
      const tempDiv = document.createElement('div');
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(tempDiv);

      (window as any).SpotifyIframeApi.createController(tempDiv, options, (EmbedController: any) => {
        controller = EmbedController;
        EmbedController.addListener('ready', () => {
          EmbedController.play();
        });
      });
    };

    if ((window as any).SpotifyIframeApi) {
      init();
    } else {
      (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
        (window as any).SpotifyIframeApi = IFrameAPI;
        init();
      };
      if (!document.querySelector('script[src="https://open.spotify.com/embed/iframe-api/v1"]')) {
        const script = document.createElement("script");
        script.src = "https://open.spotify.com/embed/iframe-api/v1";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      if (controller) {
        try { controller.destroy(); } catch (e) {}
      }
    };
  }, [trackId]);

  return <div ref={containerRef} className="w-full h-[80px]"></div>;
};

export default function Profile({ currentUser, userId, token, onBack, onNavigateToChat, onSelectThread }: { currentUser: any, userId: number, token: string, onBack?: () => void, onNavigateToChat?: (id: string) => void, onSelectThread?: (id: number) => void }) {
  const isOwnProfile = currentUser.id === userId;
  const [profile, setProfile] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [myStory, setMyStory] = useState<any>(null);

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [profileRes, friendsRes, pendingRes, postsRes] = await Promise.all([
        fetch(`/api/users/${userId}?viewerId=${currentUser.id}`),
        fetch(`/api/users/${userId}/friends`),
        fetch(`/api/users/${userId}/pending`),
        fetch(`/api/users/${userId}/posts`)
      ]);
      
      const [profileData, friendsData, pendingData, postsData] = await Promise.all([
        profileRes.json(),
        friendsRes.json(),
        pendingRes.json(),
        postsRes.json()
      ]);

      setProfile(profileData);
      setFriends(friendsData);
      setPending(pendingData);
      setPosts(postsData);
      
      // Fetch own story if viewing own profile
      if (currentUser.id === userId) {
        try {
          const storyRes = await fetch('/api/stories/me', { headers: { 'Authorization': `Bearer ${token}` } });
          const storyData = await storyRes.json();
          setMyStory(storyData);
        } catch (e) { setMyStory(null); }
      }
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

  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);

  const confirmUnfriend = async () => {
    setShowUnfriendConfirm(false);
    try {
      await fetch('/api/friendships/unfriend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId1: currentUser.id, userId2: userId })
      });
      fetchProfileData();
    } catch (e) {}
  };

  const handleUnfriend = () => setShowUnfriendConfirm(true);

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
      const popup = window.open('about:blank', 'Spotify Login', 'width=500,height=700');
      const res = await fetch(`/api/auth/spotify?userId=${currentUser.id}`);
      const data = await res.json();
      if (popup) popup.location.href = data.url;
      
      // Listen for localStorage change from the callback page
      const handler = (event: StorageEvent) => {
        if (event.key === 'spotify_connected') {
          window.removeEventListener('storage', handler);
          localStorage.removeItem('spotify_connected');
          fetchProfileData(); // Refresh profile to show new artists
        }
      };
      window.addEventListener('storage', handler);

      // Fallback: poll for popup close and refresh anyway
      const pollTimer = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('storage', handler);
          localStorage.removeItem('spotify_connected');
          fetchProfileData();
        }
      }, 500);
    } catch (e) {
      console.error('Spotify connection failed');
    }
  };

  const handleDeletePostClick = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPostToDelete(postId);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    const postId = postToDelete;
    setPostToDelete(null);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) fetchProfileData();
    } catch (err) {}
  };

  if (loading) return null;

  const artists = profile.top_artists || [profile.top_artist_1, profile.top_artist_2, profile.top_artist_3, profile.top_artist_4, profile.top_artist_5].filter(Boolean);

  return (
    <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto bg-white relative">
      {showUnfriendConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 md:p-8 max-w-md w-full brutalist-border flex flex-col gap-6 animate-in fade-in zoom-in-95">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-red-600">SEVER CONNECTION?</h3>
            <p className="text-sm font-bold uppercase tracking-widest text-grey-dark">ARE YOU SURE YOU WANT TO UNFRIEND THIS USER?</p>
            <div className="flex gap-4 mt-4">
              <button onClick={confirmUnfriend} className="flex-1 brutalist-button bg-red-600 text-white hover:bg-black hover:text-red-600 py-3 font-black text-lg tracking-widest">
                CONFIRM
              </button>
              <button onClick={() => setShowUnfriendConfirm(false)} className="flex-1 border-4 border-black bg-white text-black hover:bg-grey-silver py-3 font-black text-lg tracking-widest">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
      
      {postToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 md:p-8 max-w-md w-full brutalist-border flex flex-col gap-6 animate-in fade-in zoom-in-95">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-red-600">DELETE BROADCAST?</h3>
            <p className="text-sm font-bold uppercase tracking-widest text-grey-dark">THIS ACTION CANNOT BE UNDONE. ALL REPLIES WILL BE LOST.</p>
            <div className="flex gap-4 mt-4">
              <button onClick={confirmDeletePost} className="flex-1 brutalist-button bg-red-600 text-white hover:bg-black hover:text-red-600 py-3 font-black text-lg tracking-widest">
                DELETE
              </button>
              <button onClick={() => setPostToDelete(null)} className="flex-1 border-4 border-black bg-white text-black hover:bg-grey-silver py-3 font-black text-lg tracking-widest">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto flex flex-col gap-8 md:gap-12">
        
        {onBack && (
          <button onClick={onBack} className="self-start font-bold text-xs tracking-widest hover:underline flex items-center gap-2 uppercase">
            <ArrowLeft size={16} /> BACK
          </button>
        )}
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start brutalist-border-thick p-6 md:p-12 bg-grey-silver">
          <div className="w-48 h-48 brutalist-border-thick overflow-hidden relative group">
            <img 
              src={profile.profile_picture || `https://api.dicebear.com/9.x/shapes/svg?seed=${profile.username}`} 
              className="w-full h-full object-cover grayscale" 
            />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 flex-wrap">
               <h1 className="text-4xl md:text-7xl font-bold tracking-tighter uppercase leading-none">{profile.username}</h1>
               {profile.is_admin && <ShieldCheck size={32} className="text-black" title="ADMIN" />}
               {profile.badge && (
                 <span className="bg-cyan-400 text-black px-3 py-1 font-black tracking-widest uppercase text-xs border-2 border-black flex items-center gap-1">
                   {profile.badge}
                 </span>
               )}
            </div>
            <p className="text-xl font-bold uppercase text-grey-mid tracking-tight max-w-lg italic">
              "{profile.liner_notes || 'NO LINER NOTES FILED IN THE ARCHIVE.'}"
            </p>
            {isOwnProfile && !profile.spotify_connected && (
              <button 
                onClick={handleSpotify}
                className="mt-4 brutalist-button py-3 px-6 text-xs bg-green-500 hover:bg-black hover:text-green-500 flex items-center justify-center gap-2 self-start"
              >
                CONNECT WITH SPOTIFY
              </button>
            )}
            {isOwnProfile && profile.spotify_connected && (
              <div className="mt-4 flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                SPOTIFY LINKED
              </div>
            )}
            {!isOwnProfile && (
              <div className="flex gap-4 items-center border-t-2 border-black pt-4 w-full">
                 <div className="bg-black text-white px-4 py-2 font-bold uppercase tracking-widest text-xs">
                    ESTIMATED COMPATIBILITY: {profile.similarity_score ?? '??'}%
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
                     <UserPlus size={16} /> ADD FRIEND
                   </button>
                 )}
                 <button 
                   onClick={() => onNavigateToChat?.(profile.id)}
                   className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs hover:text-cyan-500 transition-colors ml-4 border-l-2 border-black pl-4"
                 >
                   <MessageCircle size={16} /> MESSAGE
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* MY ACTIVE STORY (Own profile only) */}
        {isOwnProfile && myStory && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-2xl font-black uppercase border-b-4 border-black pb-2">
              <Radio size={24} /> ACTIVE STORY
            </div>
            <div className="brutalist-border-thick p-6 flex items-center gap-6 bg-black text-white" style={{ background: `linear-gradient(135deg, ${myStory.background_color || '#000'}, #000)` }}>
              {myStory.image_url && (
                <div className="w-24 h-24 shrink-0 border-2 border-white overflow-hidden">
                  <img src={myStory.image_url} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                {myStory.track_name && <h4 className="text-xl font-black uppercase truncate">{myStory.track_name}</h4>}
                {myStory.artist_name && <p className="text-xs font-bold uppercase tracking-widest text-white/60 truncate">{myStory.artist_name}</p>}
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-2">
                  EXPIRES {new Date(myStory.expires_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!confirm('DELETE YOUR ACTIVE STORY?')) return;
                  try {
                    const res = await fetch(`/api/stories/${myStory.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) setMyStory(null);
                  } catch (e) {}
                }}
                className="shrink-0 text-white hover:text-red-500 font-bold text-xs uppercase tracking-widest border border-white/30 px-4 py-2 hover:border-red-500 transition-colors"
              >
                DELETE
              </button>
            </div>
          </div>
        )}

        {/* PROFILE VISUAL SHOWCASE */}
        {profile.profile_images && profile.profile_images.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-2xl font-black uppercase border-b-4 border-black pb-2">
              <ImageIcon size={24} /> VISUAL ARCHIVE
            </div>
            <div className="flex gap-8 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {profile.profile_images.map((img: string, idx: number) => (
                <div key={idx} className="w-64 h-64 shrink-0 brutalist-border-thick bg-black snap-center group">
                  <img src={img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          
          {/* ARTISTS COLUMN */}
          <div className="flex flex-col gap-8">
            {profile.anthem_track_id && (
              <div className="mb-4 brutalist-border p-6 bg-black text-white flex flex-col gap-4">
                 <div className="flex justify-between items-center opacity-60 text-xs font-bold tracking-widest">
                   <span>SONIC ANTHEM</span>
                   <Music size={16} className="text-cyan-400" />
                 </div>
                 <h3 className="text-3xl font-black uppercase">{profile.anthem_name || profile.anthem_track_id}</h3>
                 <div className="mt-2">
                   <SpotifyAutoplayer trackId={profile.anthem_track_id} />
                 </div>
              </div>
            )}
            
            <div className="border-b-4 border-black pb-2 flex justify-between items-end">
               <h3 className="text-2xl font-black uppercase flex items-center gap-2">
                 <Music size={24} /> SONIC FINGERPRINT
               </h3>
               {profile.favorite_genre && (
                 <span className="text-[10px] font-bold tracking-widest bg-grey-silver px-2 py-1 uppercase brutalist-border">
                   {profile.favorite_genre}
                 </span>
               )}
            </div>
            <div className="flex flex-col gap-4">
              {artists.map((artist, i) => (
                <div key={i} className="brutalist-border p-6 font-bold flex justify-between items-center bg-white group hover:invert transition-all">
                   <span className="text-xl md:text-2xl tracking-tighter uppercase">{artist}</span>
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

        {/* POSTS ARCHIVE SECTION */}
        <div className="flex flex-col gap-6 md:gap-8 mt-8 border-t-4 border-black pt-8 md:pt-12">
          <div className="border-b-4 border-black pb-2">
             <h3 className="text-3xl font-black uppercase flex items-center gap-2">
               <MessageCircle size={28} /> BROADCAST ARCHIVE
             </h3>
          </div>
          
          {posts.length === 0 ? (
            <p className="text-xs font-bold text-grey-mid uppercase tracking-[0.3em] py-8 text-center">NO SIGNALS BROADCASTED YET.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  onClick={() => onSelectThread?.(post.id)}
                  className="bg-grey-silver brutalist-border p-6 flex flex-col gap-4 group hover:bg-black hover:text-white transition-colors cursor-pointer relative"
                >
                  {isOwnProfile && (
                    <button 
                      onClick={(e) => handleDeletePostClick(post.id, e)}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-red-600 text-white flex items-center justify-center border-2 border-black hover:bg-red-400 transition-colors z-10"
                      title="DELETE BROADCAST"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="flex justify-between items-center border-b-2 border-black group-hover:border-white pb-2">
                    <span className="font-bold tracking-tighter uppercase truncate text-lg pr-4">{post.title || "UNTITLED"}</span>
                    <span className="text-[10px] font-bold opacity-50 uppercase whitespace-nowrap">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-bold uppercase opacity-80 line-clamp-3">
                    {post.content}
                  </p>
                  {post.image_url && (
                    <div className="w-full h-48 border-2 border-black group-hover:border-white overflow-hidden bg-black mt-auto">
                      <img src={post.image_url} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  {post.spotify_track_id && !post.image_url && (
                    <div className="mt-auto flex items-center gap-2 text-xs font-bold uppercase opacity-50">
                       <Music size={14} /> AUDIO SIGNAL ATTACHED
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
