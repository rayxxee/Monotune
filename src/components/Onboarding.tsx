import React, { useState } from 'react';

export default function Onboarding({ user, token, onComplete }: { user: any, token: string, onComplete: () => void }) {
  const [artists, setArtists] = useState(['', '', '', '', '']);
  const [linerNotes, setLinerNotes] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
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
          linerNotes 
        })
      });
      if (!res.ok) throw new Error('Failed to save onboarding data.');
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
    <div className="min-h-screen bg-grey-silver p-8 md:p-24 flex flex-col items-center">
      <div className="max-w-4xl w-full bg-white brutalist-border-thick p-12 flex flex-col gap-12">
        <div>
          <h1 className="text-7xl font-bold tracking-tighter mb-4">SONIC ARCHIVE</h1>
          <p className="text-xl font-bold uppercase text-grey-mid tracking-widest">
            LOG YOUR TOP 5 FREQUENCIES TO CALIBRATE YOUR MATCH ENGINE.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              
              <div className="mb-8 p-6 bg-grey-silver brutalist-border flex flex-col gap-4">
                <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">EXTERNAL DB QUERY</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="SEARCH ARTISTS..."
                    className="flex-1 brutalist-border p-2 font-bold uppercase"
                  />
                  <button onClick={handleSearch} type="button" className="brutalist-button px-4">SEARCH</button>
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

              <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">TOP 5 ARTISTS (MANUAL OR SEARCH)</label>
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
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">LINER NOTES (BIO)</label>
              <textarea 
                className="flex-1 brutalist-border p-6 font-bold uppercase placeholder:opacity-10 min-h-[300px] resize-none"
                placeholder="DESCRIBE YOUR SONIC JOURNEY..."
                value={linerNotes}
                onChange={(e) => setLinerNotes(e.target.value)}
              />
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
