import React, { useState } from 'react';
import { Save, LogOut, AlertTriangle } from 'lucide-react';

export default function Settings({ user, token, onLogout }: { user: any, token: string, onLogout: () => void }) {
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [threshold, setThreshold] = useState(user.min_similarity_threshold || 0);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`/api/users/${user.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, password, minSimilarityThreshold: threshold })
      });
      if (res.ok) {
        setMessage('SYSTEM PARAMETERS UPDATED.');
        setPassword(''); // clear field
      } else {
        setMessage('UPDATE FAILED.');
      }
    } catch (err) {
      setMessage('CRITICAL ERROR DURING UPDATE.');
    }
  };

  return (
    <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white">
      <div className="max-w-2xl mx-auto flex flex-col gap-12">
        <div className="border-b-4 border-black pb-4">
          <h2 className="text-6xl font-black tracking-tighter uppercase">SETTINGS</h2>
          <span className="text-xs font-bold tracking-widest text-grey-mid uppercase">CONFIGURE YOUR TERMINAL</span>
        </div>

        {message && (
          <div className="bg-black text-white p-4 font-bold tracking-widest text-sm uppercase text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-8">
          
          <div className="p-6 brutalist-border bg-grey-silver flex flex-col gap-6">
            <h3 className="text-2xl font-black tracking-tighter uppercase">DISCOVERY ENGINE</h3>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-4">
                MINIMUM SIMILARITY THRESHOLD: <span className="text-cyan-600 text-lg">{threshold}%</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={threshold} 
                onChange={e => setThreshold(Number(e.target.value))}
                className="w-full accent-black h-2 bg-white border border-black appearance-none"
              />
              <p className="text-[10px] font-bold tracking-widest text-grey-mid uppercase mt-2">
                Only receive signals from users matching your music frequency at or above this level.
              </p>
            </div>
          </div>

          <div className="p-6 brutalist-border flex flex-col gap-6">
            <h3 className="text-2xl font-black tracking-tighter uppercase">ACCOUNT CREDENTIALS</h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-widest uppercase">ENCRYPTED EMAIL</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="brutalist-input"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-widest uppercase">NEW PASSWORD PROTOCOL</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="LEAVE BLANK TO RETAIN CURRENT"
                className="brutalist-input placeholder:text-[10px]"
              />
            </div>
          </div>

          <button type="submit" className="brutalist-button py-4 flex items-center justify-center gap-4 bg-black text-white hover:bg-cyan-400 hover:text-black">
            <Save size={20} />
            COMMIT CHANGES
          </button>
        </form>

        <div className="border-t-4 border-black pt-8 flex justify-between items-center">
          <button onClick={onLogout} className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm hover:underline">
            <LogOut size={16} /> DISCONNECT
          </button>
          
          <button className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-red-600 hover:underline">
            <AlertTriangle size={16} /> PURGE ACCOUNT
          </button>
        </div>

      </div>
    </div>
  );
}
