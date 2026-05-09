import React, { useState } from 'react';
import { Search, Music, X } from 'lucide-react';

export default function Onboarding({ user, token, onComplete }: { user: any, token: string, onComplete: () => void }) {
  const [artists, setArtists] = useState(['', '', '', '', '']);
  const [linerNotes, setLinerNotes] = useState('');
  const [favoriteGenre, setFavoriteGenre] = useState('');
  const [anthemTrackId, setAnthemTrackId] = useState('');
  const [anthemName, setAnthemName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [trackQuery, setTrackQuery] = useState('');
  const [trackResults, setTrackResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anthemTrackId) {
      alert('PLEASE SELECT A SONIC ANTHEM.');
      return;
    }
    setLoading(true);
    
    try {
      const res = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId: user.id, 
          topArtists: artists, 
          linerNotes,
          favoriteGenre,
          anthemTrackId,
          anthemName
        })
      });
      if (!res.ok) throw new Error('Failed to save onboarding data.');
      
      const updatedUser = { ...user, hasOnboarded: true };
      localStorage.setItem('monutune_user', JSON.stringify(updatedUser));
      
      onComplete();
    } catch (err) {
      alert('ONBOARDING FAILED. RE-SIGNAL LATER.');
    } finally {
      setLoading(false);
    }
  };

  const updateArtist = (index: number, val: string) => {
    const newArtists = [...artists];
    newArtists[index] = val;
    setArtists(newArtists);
  };

  return (
    <div className="min-h-screen bg-grey-silver p-4 md:p-8 lg:p-24 flex flex-col items-center">
      <div className="max-w-4xl w-full bg-white brutalist-border-thick p-12 flex flex-col gap-12">
        <div>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tighter mb-4">SONIC ARCHIVE</h1>
          <p className="text-xl font-bold uppercase text-grey-mid tracking-widest">
            LOG YOUR TOP 5 FREQUENCIES TO CALIBRATE YOUR MATCH ENGINE.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              
              <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid mb-2">SPOTIFY ARTIST SEARCH</label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!query) return;
                      try {
                        const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
                        const data = await res.json();
                        setResults(data);
                      } catch(err) {}
                    }
                  }}
                  placeholder="SEARCH ARTISTS..."
                  className="flex-1 brutalist-border p-2 font-bold uppercase"
                />
                <button 
                  type="button" 
                  onClick={handleSearch}
                  className="brutalist-button px-4 py-2 flex items-center justify-center"
                >
                  <Search size={16} />
                </button>
              </div>
              {results.length > 0 && (
                <div className="flex flex-col gap-1 mb-4 bg-white brutalist-border p-2 max-h-40 overflow-y-auto">
                  {results.map((r, i) => (
                    <button 
                      key={i} 
                      type="button"
                      onClick={() => addResultToArtists(r.name)}
                      className="text-left font-bold text-sm hover:bg-black hover:text-white p-2 uppercase flex items-center gap-3 transition-colors"
                    >
                      {r.image && (
                        <img src={r.image} className="w-8 h-8 object-cover border border-black shrink-0" alt="" />
                      )}
                      <span className="truncate">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid mt-4 mb-2">TOP 5 ARTISTS</label>
              {artists.map((artist, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="font-bold text-xl opacity-20">0{i+1}</span>
                  <input 
                    type="text" 
                    placeholder="ARTIST NAME"
                    className="flex-1 brutalist-border p-4 font-bold uppercase placeholder:opacity-10"
                    value={artist}
                    onChange={(e) => updateArtist(i, e.target.value)}
                    required
                  />
                </div>
              ))}
              <button 
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/auth/spotify?userId=${user.id}`);
                    const data = await res.json();
                    const popup = window.open(data.url, 'Spotify Sync', 'width=500,height=700');
                    
                    const handler = (event: StorageEvent) => {
                      if (event.key === 'spotify_connected') {
                        window.removeEventListener('storage', handler);
                        try {
                          const result = JSON.parse(event.newValue || '{}');
                          if (result.artists) {
                            const newArtists = [...result.artists];
                            while (newArtists.length < 5) newArtists.push('');
                            setArtists(newArtists.slice(0, 5));
                          }
                        } catch(e) {}
                        localStorage.removeItem('spotify_connected');
                      }
                    };
                    window.addEventListener('storage', handler);

                    const pollTimer = setInterval(() => {
                      if (popup && popup.closed) {
                        clearInterval(pollTimer);
                        window.removeEventListener('storage', handler);
                        const stored = localStorage.getItem('spotify_connected');
                        if (stored) {
                          try {
                            const result = JSON.parse(stored);
                            if (result.artists) {
                              const newArtists = [...result.artists];
                              while (newArtists.length < 5) newArtists.push('');
                              setArtists(newArtists.slice(0, 5));
                            }
                          } catch(e) {}
                          localStorage.removeItem('spotify_connected');
                        }
                      }
                    }, 500);
                  } catch (e) {
                    console.error('Spotify sync failed');
                  }
                }}
                className="brutalist-button py-3 bg-green-500 text-black hover:bg-black hover:text-green-500 text-xs flex items-center justify-center gap-2 mt-4"
              >
                CONNECT SPOTIFY & SYNC TOP ARTISTS
              </button>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">LINER NOTES (BIO)</label>
                <textarea 
                  className="flex-1 brutalist-border p-6 font-bold uppercase placeholder:opacity-10 min-h-[150px] resize-none"
                  placeholder="DESCRIBE YOUR SONIC JOURNEY..."
                  value={linerNotes}
                  onChange={(e) => setLinerNotes(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">FAVORITE GENRE</label>
                <select 
                  className="brutalist-border p-4 font-bold uppercase"
                  value={favoriteGenre}
                  onChange={e => setFavoriteGenre(e.target.value)}
                  required
                >
                  <option value="" disabled>SELECT PRIMARY GENRE</option>
                  <option value="pop">POP</option>
                  <option value="hiphop">HIP HOP</option>
                  <option value="rock">ROCK</option>
                  <option value="metal">METAL</option>
                  <option value="indie">INDIE</option>
                  <option value="electronic">ELECTRONIC</option>
                </select>
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">SONIC ANTHEM</label>
                {anthemTrackId ? (
                  <div className="brutalist-border p-4 bg-black text-white flex items-center gap-4">
                    <Music size={20} className="text-cyan-400 shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <p className="font-black uppercase text-sm truncate">{anthemName}</p>
                      <p className="text-[10px] font-bold tracking-widest text-grey-mid uppercase">{anthemTrackId}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setAnthemTrackId(''); setAnthemName(''); }}
                      className="text-white hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={trackQuery}
                        onChange={e => setTrackQuery(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!trackQuery) return;
                            try {
                              const res = await fetch(`/api/music/tracks?q=${encodeURIComponent(trackQuery)}`);
                              const data = await res.json();
                              setTrackResults(data);
                            } catch(err) {}
                          }
                        }}
                        placeholder="SEARCH A SONG..."
                        className="flex-1 brutalist-border p-2 font-bold uppercase"
                      />
                      <button 
                        type="button" 
                        onClick={async () => {
                          if (!trackQuery) return;
                          try {
                            const res = await fetch(`/api/music/tracks?q=${encodeURIComponent(trackQuery)}`);
                            const data = await res.json();
                            setTrackResults(data);
                          } catch(err) {}
                        }}
                        className="brutalist-button px-4 py-2 flex items-center justify-center"
                      >
                        <Search size={16} />
                      </button>
                    </div>
                    {trackResults.length > 0 && (
                      <div className="flex flex-col gap-1 bg-white brutalist-border p-2 max-h-60 overflow-y-auto">
                        {trackResults.map((t, i) => (
                          <button 
                            key={i} 
                            type="button"
                            onClick={() => {
                              setAnthemTrackId(t.id);
                              setAnthemName(`${t.name} — ${t.artist}`);
                              setTrackResults([]);
                              setTrackQuery('');
                            }}
                            className="text-left font-bold text-sm hover:bg-black hover:text-white p-3 uppercase flex items-center gap-3 transition-colors"
                          >
                            {t.image && (
                              <img src={t.image} className="w-10 h-10 object-cover border border-black shrink-0" />
                            )}
                            <div className="flex flex-col overflow-hidden">
                              <span className="truncate">{t.name}</span>
                              <span className="text-[10px] text-grey-mid truncate">{t.artist} · {t.album}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="brutalist-button py-8 text-3xl"
          >
            {loading ? 'CALIBRATING...' : 'FINALIZE IDENTITY →'}
          </button>
        </form>
      </div>
    </div>
  );
}
