import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';

export default function ChatHub({ user, token }: { user: any, token: string }) {
  const [friends, setFriends] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeChat) {
      fetchMessages();
      // Simple long-polling for now since Socket.io isn't set up on backend
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [activeChat]);

  const fetchFriends = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setFriends(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inbox');
    }
  };

  const fetchMessages = async () => {
    if (!activeChat) return;
    try {
      const res = await fetch(`/api/chats/${activeChat.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to sync messages');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    try {
      await fetch(`/api/chats/${activeChat.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage })
      });
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      console.error('Transmission failed');
    }
  };

  if (loading) return <div className="p-8 font-bold uppercase tracking-widest">CONNECTING TO COMM NETWORK...</div>;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-grey-silver">
      {/* Inbox List */}
      <div className="w-1/3 border-r-4 border-black bg-white flex flex-col h-full overflow-y-auto">
        <div className="p-6 border-b-4 border-black bg-grey-silver sticky top-0 z-10">
          <h2 className="text-3xl font-black tracking-tighter uppercase">INBOX</h2>
          <span className="text-[10px] font-bold tracking-widest text-grey-mid uppercase">{friends.length} ENCRYPTED CHANNELS</span>
        </div>
        
        {friends.length === 0 ? (
          <div className="p-8 text-center text-grey-mid font-bold text-xs tracking-widest uppercase">
            NO MUTUAL SIGNALS DETECTED YET.
          </div>
        ) : (
          friends.map((f: any) => {
            const friendId = f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1;
            return (
              <button 
                key={f.id}
                onClick={() => setActiveChat({ id: friendId, name: f.friend_name, pic: f.friend_pic })}
                className={`p-6 border-b-4 border-black text-left flex items-center gap-4 transition-all hover:bg-black hover:text-white ${activeChat?.id === friendId ? 'bg-black text-white' : ''}`}
              >
                <div className="w-12 h-12 bg-grey-silver border border-black overflow-hidden shrink-0">
                  <img src={f.friend_pic || `https://api.dicebear.com/9.x/shapes/svg?seed=${f.friend_name}`} alt={f.friend_name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-xl uppercase tracking-tighter truncate">{f.friend_name}</h3>
                  <p className="text-[10px] font-bold tracking-widest opacity-50 uppercase truncate">SECURE CHANNEL READY</p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Active Chat */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {activeChat ? (
          <>
            <div className="p-6 border-b-4 border-black bg-grey-silver flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white border-2 border-black overflow-hidden">
                  <img src={activeChat.pic || `https://api.dicebear.com/9.x/shapes/svg?seed=${activeChat.name}`} alt={activeChat.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase">{activeChat.name}</h2>
                  <span className="text-[10px] font-bold tracking-widest text-green-600 uppercase">CHANNEL SECURE • LIVE</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMNCA0Wk00IDBMMCA0WiIgc3Ryb2tlPSIjZWVlIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')]">
              {messages.length === 0 ? (
                <div className="m-auto text-center font-bold text-xs tracking-widest text-grey-mid uppercase bg-white p-4 border border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  INITIALIZE COMM SEQUENCE.
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === user.id;
                  return (
                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-4 border-2 border-black ${isMine ? 'bg-cyan-400 text-black shadow-[-4px_4px_0_0_rgba(0,0,0,1)]' : 'bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]'}`}>
                        <p className="font-bold">{msg.content}</p>
                        <span className="text-[10px] font-bold tracking-widest opacity-60 uppercase block mt-2">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={sendMessage} className="p-6 border-t-4 border-black bg-grey-silver flex gap-4 shrink-0">
              <input 
                type="text" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="BROADCAST SIGNAL..." 
                className="brutalist-input flex-1 bg-white"
              />
              <button type="submit" className="brutalist-button bg-black text-white hover:bg-cyan-400 hover:text-black flex items-center justify-center px-8">
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
    </div>
  );
}
