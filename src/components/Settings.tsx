import React, { useState, useEffect } from 'react';
import { Save, LogOut, AlertTriangle, Search } from 'lucide-react';

export default function Settings({ user, token, onLogout }: { user: any, token: string, onLogout: () => void }) {
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [threshold, setThreshold] = useState(user.min_similarity_threshold || 0);
  const [artists, setArtists] = useState<string[]>(['', '', '', '', '']);
  const [linerNotes, setLinerNotes] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/users/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        setArtists([data.top_artist_1 || '', data.top_artist_2 || '', data.top_artist_3 || '', data.top_artist_4 || '', data.top_artist_5 || '']);
        setLinerNotes(data.liner_notes || '');
        if (data.email) setEmail(data.email);
        if (data.min_similarity_threshold !== undefined) setThreshold(data.min_similarity_threshold);
      }
    })
    .catch(err => console.error("Failed to load full profile"));
  }, [user.id, token]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    } catch(err) {}
  };

  const addResultToArtists = (name: string) => {
    const emptyIndex = artists.findIndex(a => !a);
    if (emptyIndex !== -1) {
      updateArtist(emptyIndex, name);
      setResults([]);
      setQuery('');
    } else {
      alert('ALL 5 SLOTS FULL.');
    }
  };

  const updateArtist = (index: number, val: string) => {
    const newArtists = [...artists];
    newArtists[index] = val;
    setArtists(newArtists);
  };

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
        body: JSON.stringify({ email, password, minSimilarityThreshold: threshold, topArtists: artists, linerNotes })
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

          <div className="p-6 brutalist-border bg-grey-silver flex flex-col gap-6">
            <h3 className="text-2xl font-black tracking-tighter uppercase">SONIC IDENTITY</h3>
            
            <div className="flex flex-col gap-4">
              <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">EXTERNAL DB QUERY</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="SEARCH ARTISTS..."
                  className="flex-1 brutalist-input p-2 font-bold uppercase"
                />
                <button onClick={handleSearch} type="button" className="brutalist-button px-4 py-2 flex items-center justify-center"><Search size={16} /></button>
              </div>
              {results.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 bg-white brutalist-border p-2">
                  {results.map((r, i) => (
                    <button 
                      key={i} 
                      type="button"
                      onClick={() => addResultToArtists(r.name)}
                      className="text-left font-bold text-sm hover:bg-black hover:text-white p-2 uppercase"
                    >
                      + {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">TOP 5 ARTISTS</label>
              {artists.map((artist, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="font-bold text-xl opacity-20">0{i+1}</span>
                  <input 
                    type="text" 
                    placeholder="ARTIST NAME"
                    className="flex-1 brutalist-input p-4 font-bold uppercase placeholder:opacity-50"
                    value={artist}
                    onChange={(e) => updateArtist(i, e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">LINER NOTES (BIO)</label>
              <textarea 
                className="flex-1 brutalist-input p-6 font-bold uppercase placeholder:opacity-50 min-h-[150px] resize-y"
                placeholder="DESCRIBE YOUR SONIC JOURNEY..."
                value={linerNotes}
                onChange={(e) => setLinerNotes(e.target.value)}
              />
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
