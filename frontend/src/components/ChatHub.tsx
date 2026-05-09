import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Music, Check, CheckCheck, Search, X, ArrowLeft } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export default function ChatHub({ user, token, onNavigateToProfile, initialChatId, onBack }: { user: any, token: string, onNavigateToProfile?: (id: string) => void, initialChatId?: string | null, onBack?: () => void }) {
  const [inboxList, setInboxList] = useState<any[]>([]);
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [viewingRequests, setViewingRequests] = useState(false);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [msgPage, setMsgPage] = useState(1);
  const [msgTotalPages, setMsgTotalPages] = useState(1);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const isInitialLoad = useRef(true);
  const socketRef = useRef<Socket | null>(null);

  // Song search modal state
  const [showSongSearch, setShowSongSearch] = useState(false);
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState<any[]>([]);
  const [songSearching, setSongSearching] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (initialChatId && !loading && !activeChat) {
      const foundInInbox = inboxList.find(u => u.id === initialChatId);
      const foundInRequests = requestsList.find(u => u.id === initialChatId);
      if (foundInInbox) {
        setActiveChat({ id: foundInInbox.id, name: foundInInbox.name, pic: foundInInbox.pic });
        setViewingRequests(false);
      } else if (foundInRequests) {
        setActiveChat({ id: foundInRequests.id, name: foundInRequests.name, pic: foundInRequests.pic });
        setViewingRequests(true);
      } else {
        fetch(`/api/users/${initialChatId}`)
          .then(res => res.json())
          .then(data => {
            setActiveChat({ id: data.id, name: data.username, pic: data.profile_picture });
          })
          .catch(() => {});
      }
    }
  }, [initialChatId, inboxList, requestsList]);

  // Socket.IO initialization
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : 'https://monotune-api.onrender.com');
    socketRef.current = io(socketUrl, { auth: { token } });
    return () => { socketRef.current?.disconnect(); };
  }, [token]);

  // Socket.IO listeners
  useEffect(() => {
    if (!socketRef.current) return;
    const handleNewMessage = (msg: any) => {
      // Refresh inbox list to reflect newest message
      fetchFriends();
      if (!activeChat) return;
      if (msg.sender_id === activeChat.id || msg.receiver_id === activeChat.id || msg.sender_id === user.id) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.sender_id === activeChat.id) {
          fetch(`/api/messages/${activeChat.id}/read`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => {});
        }
      }
    };

    const handleMessagesRead = (data: { readerId: string }) => {
      if (!activeChat) return;
      if (data.readerId === activeChat.id) {
        setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      }
    };

    socketRef.current.on('new_message', handleNewMessage);
    socketRef.current.on('messages_read', handleMessagesRead);
    return () => { 
      socketRef.current?.off('new_message', handleNewMessage); 
      socketRef.current?.off('messages_read', handleMessagesRead); 
    };
  }, [activeChat, token]);

  // Load initial messages for active chat
  useEffect(() => {
    if (activeChat) {
      isInitialLoad.current = true;
      setMsgPage(1);
      fetchMessages();
    }
  }, [activeChat]);

  const fetchFriends = async () => {
    try {
      const res = await fetch(`/api/chats/inbox`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setInboxList(data.inbox || []);
      setRequestsList(data.requests || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inbox');
    }
  };

  const fetchMessages = async () => {
    if (!activeChat) return;
    try {
      const res = await fetch(`/api/chats/${activeChat.id}?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data.data || []);
      setMsgTotalPages(data.totalPages || 1);
      
      // Mark as read
      fetch(`/api/messages/${activeChat.id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
      
    } catch (err) {
      console.error('Failed to sync messages');
    }
  };

  const loadEarlierMessages = async () => {
    if (!activeChat || msgPage >= msgTotalPages) return;
    setLoadingEarlier(true);
    try {
      const nextPage = msgPage + 1;
      const res = await fetch(`/api/chats/${activeChat.id}?page=${nextPage}&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(prev => [...(data.data || []), ...prev]);
      setMsgPage(nextPage);
    } catch (err) {} finally {
      setLoadingEarlier(false);
    }
  };

  // Mock typing indicator
  useEffect(() => {
    if (newMessage.trim().length > 0) setIsTyping(true);
    else setIsTyping(false);
  }, [newMessage]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (e: React.FormEvent, type: 'text' | 'song_reaction' = 'text', trackData?: any) => {
    e.preventDefault();
    if (type === 'text' && !newMessage.trim()) return;
    if (!activeChat) return;

    try {
      await fetch(`/api/chats/${activeChat.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: type === 'song_reaction' ? `🎵 ${trackData?.name || 'Song'}` : newMessage,
          messageType: type,
          reactionTrackId: trackData?.id || undefined,
          trackName: trackData?.name || undefined,
          trackArtist: trackData?.artist || undefined,
          trackImage: trackData?.image || undefined
        })
      });
      setNewMessage('');
    } catch (err) {
      console.error('Transmission failed');
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

  const handleSendSong = (track: any, e: React.MouseEvent) => {
    sendMessage(e as any, 'song_reaction', track);
    setShowSongSearch(false);
    setSongQuery('');
    setSongResults([]);
  };

  if (loading) return <div className="p-4 md:p-8 font-bold uppercase tracking-widest">CONNECTING TO COMM NETWORK...</div>;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-grey-silver">
      {/* Inbox List */}
      <div className="w-1/3 border-r-4 border-black bg-white flex flex-col h-full overflow-y-auto">
        <div className="p-6 border-b-4 border-black bg-grey-silver sticky top-0 z-10 flex flex-col gap-4">
          <div>
            {onBack && (
              <button onClick={onBack} className="font-bold text-[10px] tracking-widest hover:underline flex items-center gap-1 uppercase mb-2 text-grey-dark">
                <ArrowLeft size={12} /> BACK
              </button>
            )}
            <h2 className="text-3xl font-black tracking-tighter uppercase">INBOX</h2>
            <span className="text-[10px] font-bold tracking-widest text-grey-mid uppercase">{inboxList.length} ENCRYPTED CHANNELS</span>
          </div>
          
          <div className="flex gap-2 bg-white border-2 border-black p-1">
            <button 
              onClick={() => setViewingRequests(false)} 
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-2 ${!viewingRequests ? 'bg-black text-white' : 'hover:bg-grey-silver'}`}
            >
              MAIN
            </button>
            <button 
              onClick={() => setViewingRequests(true)} 
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-2 ${viewingRequests ? 'bg-black text-white' : 'hover:bg-grey-silver'} flex items-center justify-center gap-1`}
            >
              REQUESTS 
              {requestsList.length > 0 && (
                <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]">
                  {requestsList.length > 4 ? '4+' : requestsList.length}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {viewingRequests ? (
          requestsList.length === 0 ? (
            <div className="p-4 md:p-8 text-center text-grey-mid font-bold text-xs tracking-widest uppercase">
              NO PENDING REQUESTS.
            </div>
          ) : (
            requestsList.map((f: any) => (
              <button 
                key={f.id}
                onClick={() => setActiveChat({ id: f.id, name: f.name, pic: f.pic })}
                className={`p-6 border-b-4 border-black text-left flex items-center gap-4 transition-all hover:bg-black hover:text-white ${activeChat?.id === f.id ? 'bg-black text-white' : ''}`}
              >
                <div className="w-12 h-12 bg-grey-silver border border-black overflow-hidden shrink-0">
                  <img src={f.pic || `https://api.dicebear.com/9.x/shapes/svg?seed=${f.name}`} alt={f.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-xl uppercase tracking-tighter truncate">
                    {f.name}
                  </h3>
                  <p className="text-[10px] font-bold tracking-widest opacity-50 uppercase truncate text-yellow-600">INCOMING SIGNAL</p>
                </div>
              </button>
            ))
          )
        ) : (
          inboxList.length === 0 ? (
            <div className="p-4 md:p-8 text-center text-grey-mid font-bold text-xs tracking-widest uppercase">
              NO MUTUAL SIGNALS DETECTED YET.
            </div>
          ) : (
            inboxList.map((f: any) => (
              <button 
                key={f.id}
                onClick={() => setActiveChat({ id: f.id, name: f.name, pic: f.pic })}
                className={`p-6 border-b-4 border-black text-left flex items-center gap-4 transition-all hover:bg-black hover:text-white ${activeChat?.id === f.id ? 'bg-black text-white' : ''}`}
              >
                <div className="w-12 h-12 bg-grey-silver border border-black overflow-hidden shrink-0">
                  <img src={f.pic || `https://api.dicebear.com/9.x/shapes/svg?seed=${f.name}`} alt={f.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-xl uppercase tracking-tighter truncate">
                    {f.name}
                  </h3>
                  <p className="text-[10px] font-bold tracking-widest opacity-50 uppercase truncate">SECURE CHANNEL READY</p>
                </div>
              </button>
            ))
          )
        )}
      </div>

      {/* Active Chat */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {activeChat ? (
          <>
            <div className="p-6 border-b-4 border-black bg-grey-silver flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 bg-white border-2 border-black overflow-hidden cursor-pointer hover:ring-2 hover:ring-cyan-400 transition-all"
                  onClick={() => onNavigateToProfile?.(activeChat.id)}
                >
                  <img src={activeChat.pic || `https://api.dicebear.com/9.x/shapes/svg?seed=${activeChat.name}`} alt={activeChat.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 
                    className="text-2xl font-black tracking-tighter uppercase cursor-pointer hover:underline"
                    onClick={() => onNavigateToProfile?.(activeChat.id)}
                  >
                    {activeChat.name}
                  </h2>
                  <span className="text-[10px] font-bold tracking-widest text-green-600 uppercase">CHANNEL SECURE • LIVE</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMNCA0Wk00IDBMMCA0WiIgc3Ryb2tlPSIjZWVlIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')]">
              {/* Load Earlier Messages */}
              {msgPage < msgTotalPages && (
                <button
                  onClick={loadEarlierMessages}
                  disabled={loadingEarlier}
                  className="self-center text-[10px] font-bold uppercase tracking-widest bg-white border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors mb-2"
                >
                  {loadingEarlier ? 'LOADING...' : 'LOAD EARLIER MESSAGES'}
                </button>
              )}
              {messages.length === 0 ? (
                <div className="m-auto text-center font-bold text-xs tracking-widest text-grey-mid uppercase bg-white p-4 border border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  INITIALIZE COMM SEQUENCE.
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === user.id;
                  const isSongReaction = msg.message_type === 'song_reaction';
                  return (
                    <div key={i} className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[70%] border-2 border-black ${isMine ? 'bg-cyan-400 text-black shadow-[-4px_4px_0_0_rgba(0,0,0,1)]' : 'bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]'} ${isSongReaction ? 'p-0 overflow-hidden' : 'p-4'}`}>
                        {isSongReaction ? (
                          <div className="flex flex-col">
                            {/* Spotify embed player */}
                            {msg.reaction_track_id && (
                              <div className="w-full">
                                <iframe 
                                  src={`https://open.spotify.com/embed/track/${msg.reaction_track_id}?utm_source=generator&theme=0`}
                                  width="100%"
                                  height="152"
                                  frameBorder="0"
                                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                  loading="lazy"
                                  style={{ borderRadius: 0 }}
                                ></iframe>
                              </div>
                            )}
                            {/* Fallback if no track ID but has metadata */}
                            {!msg.reaction_track_id && msg.track_name && (
                              <div className="p-4 flex items-center gap-3">
                                {msg.track_image && (
                                  <img src={msg.track_image} className="w-12 h-12 object-cover border border-black shrink-0" alt="" />
                                )}
                                <div className="flex flex-col overflow-hidden">
                                  <span className="font-black uppercase text-sm truncate">{msg.track_name}</span>
                                  <span className="text-[10px] font-bold text-grey-mid uppercase truncate">{msg.track_artist}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="font-bold">{msg.content}</p>
                        )}
                        {msg.spotify_track_id && !isSongReaction && (
                          <div className="mt-2 pt-2 border-t border-black/20 flex items-center gap-2">
                             <Music size={12} className="opacity-50" />
                             <span className="text-[10px] font-bold uppercase truncate">{msg.spotify_track_id}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] font-bold tracking-widest opacity-60 uppercase">
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && (
                          msg.is_read ? <CheckCheck size={12} className="text-cyan-600" /> : <Check size={12} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {isTyping && (
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-grey-mid animate-pulse self-start ml-2 mt-2">
                  TRANSMITTING...
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={e => sendMessage(e, 'text')} className="p-6 border-t-4 border-black bg-grey-silver flex gap-4 shrink-0">
              <button 
                type="button" 
                onClick={() => setShowSongSearch(true)}
                className="brutalist-button bg-white text-black hover:bg-black hover:text-white flex items-center justify-center px-4"
                title="SEND A SONG"
              >
                <Music size={20} />
              </button>
              <input 
                type="text" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="BROADCAST SIGNAL..." 
                className="brutalist-input flex-1 bg-white border-2 border-black p-4 font-bold uppercase focus:outline-none"
              />
              <button type="submit" disabled={!newMessage.trim()} className="brutalist-button bg-black text-white hover:bg-cyan-400 hover:text-black flex items-center justify-center px-8 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20">
            <MessageSquare size={64} />
            <h2 className="mt-8 text-2xl font-black tracking-widest uppercase">NO ACTIVE CHANNEL</h2>
          </div>
        )}
      </div>

      {/* Song Search Modal */}
      {showSongSearch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white brutalist-border-thick p-6 md:p-8 flex flex-col gap-6 max-h-[80vh]">
            <div className="flex justify-between items-center border-b-4 border-black pb-4">
              <h3 className="text-2xl font-black tracking-tighter uppercase">SEND A SONG</h3>
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
                <Search size={16} />
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
                  onClick={(e) => handleSendSong(track, e)}
                  className="text-left font-bold text-sm hover:bg-black hover:text-white p-3 uppercase flex items-center gap-3 transition-colors brutalist-border bg-white"
                >
                  {track.image && (
                    <img src={track.image} className="w-12 h-12 object-cover border border-black shrink-0" alt="" />
                  )}
                  <div className="flex flex-col overflow-hidden flex-1">
                    <span className="truncate font-black">{track.name}</span>
                    <span className="text-[10px] text-grey-mid truncate">{track.artist} · {track.album}</span>
                  </div>
                  <Send size={14} className="shrink-0 opacity-40" />
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
