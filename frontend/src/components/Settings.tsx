import React, { useState, useEffect, useRef } from 'react';
import { Save, LogOut, AlertTriangle, Search, Music, X, Camera, Trash2 } from 'lucide-react';

export default function Settings({ user, token, onLogout }: { user: any, token: string, onLogout: () => void }) {
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [threshold, setThreshold] = useState(user.min_similarity_threshold || 0);
  const [artists, setArtists] = useState<string[]>(['', '', '', '', '']);
  const [linerNotes, setLinerNotes] = useState('');
  const [favoriteGenre, setFavoriteGenre] = useState('');
  const [anthemTrackId, setAnthemTrackId] = useState('');
  const [anthemName, setAnthemName] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [trackQuery, setTrackQuery] = useState('');
  const [trackResults, setTrackResults] = useState<any[]>([]);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [pfpUploading, setPfpUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePictureUpload = async (file: File) => {
    setPfpUploading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`/api/users/${user.id}/profile-picture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setProfilePicture(data.imageUrl);
        setMessage('PROFILE PICTURE UPDATED.');
      } else {
        setMessage(data.error || 'UPLOAD FAILED.');
      }
    } catch (err) {
      setMessage('CRITICAL ERROR DURING UPLOAD.');
    } finally {
      setPfpUploading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!confirm('REMOVE YOUR PROFILE PICTURE?')) return;
    try {
      const res = await fetch(`/api/users/${user.id}/profile-picture`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProfilePicture(null);
        setMessage('PROFILE PICTURE REMOVED.');
      }
    } catch (err) {
      setMessage('FAILED TO REMOVE PICTURE.');
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    if (profileImages.length >= 3) {
      setMessage('MAXIMUM 3 IMAGES ALLOWED.');
      return;
    }
    setMessage('UPLOADING IMAGE...');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setProfileImages([...profileImages, data.imageUrl]);
        setMessage('IMAGE UPLOADED.');
      } else {
        setMessage('UPLOAD FAILED.');
      }
    } catch (e) {
      setMessage('CRITICAL ERROR DURING UPLOAD.');
    }
  };

  const handleRemoveProfileImage = (index: number) => {
    const newImages = [...profileImages];
    newImages.splice(index, 1);
    setProfileImages(newImages);
  };

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
        if (data.favorite_genre) setFavoriteGenre(data.favorite_genre);
        if (data.anthem_track_id) setAnthemTrackId(data.anthem_track_id);
        if (data.anthem_name) setAnthemName(data.anthem_name);
        setSpotifyConnected(!!data.spotify_connected);
        if (data.profile_picture) setProfilePicture(data.profile_picture);
        if (data.profile_images) setProfileImages(data.profile_images);
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
        body: JSON.stringify({ email, password, minSimilarityThreshold: threshold, topArtists: artists, linerNotes, favoriteGenre, anthemTrackId, anthemName, profileImages })
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
    <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto bg-white">
      <div className="max-w-2xl mx-auto flex flex-col gap-12">
        <div className="border-b-4 border-black pb-4">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">SETTINGS</h2>
          <span className="text-xs font-bold tracking-widest text-grey-mid uppercase">CONFIGURE YOUR TERMINAL</span>
        </div>

        {message && (
          <div className="bg-black text-white p-4 font-bold tracking-widest text-sm uppercase text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-8">
          
          {/* PROFILE PICTURE SECTION */}
          <div className="p-6 brutalist-border bg-grey-silver flex flex-col gap-6">
            <h3 className="text-2xl font-black tracking-tighter uppercase">PROFILE PICTURE</h3>
            <div className="flex items-start gap-8">
              {/* Preview */}
              <div className="relative group">
                <div className="w-32 h-32 brutalist-border-thick overflow-hidden bg-white">
                  <img 
                    src={profilePicture || `https://api.dicebear.com/9.x/shapes/svg?seed=${user.username}`} 
                    className="w-full h-full object-cover"
                    alt="Profile"
                  />
                </div>
                {profilePicture && (
                  <button
                    type="button"
                    onClick={handleRemoveProfilePicture}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white flex items-center justify-center border-2 border-black hover:bg-red-400 transition-colors"
                    title="Remove picture"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Upload Zone */}
              <div className="flex-1 flex flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProfilePictureUpload(file);
                    e.target.value = '';
                  }}
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-black', 'text-white'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-black', 'text-white'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-black', 'text-white');
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) handleProfilePictureUpload(file);
                  }}
                  className="brutalist-border p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-black hover:text-white transition-all min-h-[128px] bg-white"
                >
                  {pfpUploading ? (
                    <span className="text-xs font-bold tracking-widest uppercase animate-pulse">UPLOADING...</span>
                  ) : (
                    <>
                      <Camera size={24} />
                      <span className="text-xs font-bold tracking-widest uppercase text-center">
                        CLICK OR DROP IMAGE HERE
                      </span>
                      <span className="text-[10px] font-bold tracking-widest text-grey-mid uppercase">
                        JPEG · PNG · WEBP · GIF — MAX 5MB
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PROFILE SHOWCASE IMAGES */}
          <div className="p-6 brutalist-border bg-grey-silver flex flex-col gap-6">
            <h3 className="text-2xl font-black tracking-tighter uppercase">PROFILE SHOWCASE (MAX 3)</h3>
            <p className="text-[10px] font-bold tracking-widest text-grey-mid uppercase mt-[-1rem]">
              THESE VISUALS WILL BE DISPLAYED ON YOUR PUBLIC PROFILE.
            </p>
            <div className="flex gap-4 flex-wrap">
              {profileImages.map((img, i) => (
                <div key={i} className="relative group w-32 h-32 brutalist-border-thick bg-black">
                  <img src={img} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  <button
                    type="button"
                    onClick={() => handleRemoveProfileImage(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white flex items-center justify-center border-2 border-black hover:bg-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              
              {profileImages.length < 3 && (
                <div className="w-32 h-32 brutalist-border-thick bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-black hover:text-white transition-colors group relative">
                  <Camera size={24} className="mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-center px-2">ADD IMAGE</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProfileImageUpload(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

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
            
            <div className="flex flex-col gap-2 mb-2">
              <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">SPOTIFY ARTIST SEARCH</label>
              <div className="flex gap-2">
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
                  className="flex-1 brutalist-input p-2 font-bold uppercase"
                />
                <button onClick={handleSearch} type="button" className="brutalist-button px-4 py-2 flex items-center justify-center"><Search size={16} /></button>
              </div>
              {results.length > 0 && (
                <div className="flex flex-col gap-1 mt-2 bg-white brutalist-border p-2 max-h-40 overflow-y-auto">
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
              <button 
                type="button"
                onClick={async () => {
                  try {
                    const popup = window.open('about:blank', 'Spotify Sync', 'width=500,height=700');
                    const res = await fetch(`/api/auth/spotify?userId=${user.id}`);
                    const data = await res.json();
                    if (popup) popup.location.href = data.url;
                    
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

                    // Fallback: poll for popup close
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
                className="brutalist-button py-3 bg-green-500 text-black hover:bg-black hover:text-green-500 text-xs flex items-center justify-center gap-2"
              >
                🔄 SYNC TOP ARTISTS FROM SPOTIFY (LAST MONTH)
              </button>
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

            <div className="flex flex-col gap-4 mt-4">
              <label className="text-xs font-bold tracking-[0.4em] uppercase text-grey-mid">FAVORITE GENRE</label>
              <select 
                className="brutalist-input p-4 font-bold uppercase"
                value={favoriteGenre}
                onChange={e => setFavoriteGenre(e.target.value)}
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

            <div className="flex flex-col gap-4 mt-4">
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
                      className="flex-1 brutalist-input p-2 font-bold uppercase"
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

          <div className="p-6 brutalist-border flex flex-col gap-6">
            <h3 className="text-2xl font-black tracking-tighter uppercase">SPOTIFY CONNECTION</h3>
            {spotifyConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600 font-bold text-xs tracking-widest uppercase">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                  SPOTIFY ACCOUNT LINKED
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('UNLINK YOUR SPOTIFY ACCOUNT? Your top artists will remain but will no longer auto-sync.')) return;
                    try {
                      const res = await fetch('/api/auth/spotify/unlink', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id }),
                      });
                      if (res.ok) {
                        setSpotifyConnected(false);
                        setMessage('SPOTIFY ACCOUNT UNLINKED.');
                      }
                    } catch (e) {
                      setMessage('FAILED TO UNLINK SPOTIFY.');
                    }
                  }}
                  className="font-bold uppercase tracking-widest text-xs text-red-600 hover:underline flex items-center gap-2"
                >
                  <X size={14} /> UNLINK
                </button>
              </div>
            ) : (
              <p className="text-xs font-bold tracking-widest uppercase text-grey-mid">
                NOT CONNECTED. USE THE CONNECT BUTTON ON YOUR PROFILE.
              </p>
            )}
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
          
          <button
            onClick={async () => {
              if (!confirm('⚠️ THIS WILL PERMANENTLY DELETE YOUR ACCOUNT AND ALL DATA. THIS CANNOT BE UNDONE. ARE YOU ABSOLUTELY SURE?')) return;
              if (!confirm('LAST CHANCE. TYPE "DELETE" IN THE NEXT PROMPT TO CONFIRM.')) return;
              const answer = prompt('TYPE "DELETE" TO CONFIRM ACCOUNT PURGE:');
              if (answer !== 'DELETE') return;
              try {
                const res = await fetch(`/api/users/${user.id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                  alert('ACCOUNT PURGED. GOODBYE.');
                  onLogout();
                } else {
                  alert('DELETION FAILED.');
                }
              } catch (e) { alert('CRITICAL ERROR.'); }
            }}
            className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-red-600 hover:underline"
          >
            <AlertTriangle size={16} /> PURGE ACCOUNT
          </button>
        </div>

      </div>
    </div>
  );
}
