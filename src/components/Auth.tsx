import React, { useState } from 'react';

export default function Auth({ onAuth }: { onAuth: (user: any, token: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <div className="w-full max-w-md border-2 border-black p-12 bg-white shadow-[12px_12px_0_0_rgba(0,0,0,1)]">
        <h1 className="text-6xl font-bold tracking-tighter mb-8 uppercase">
          {isLogin ? 'LOGIN' : 'SIGNUP'}
        </h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {!isLogin && (
            <input 
              type="text" 
              placeholder="USERNAME" 
              className="brutalist-border p-4 font-bold uppercase"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
          )}
          <input 
            type="email" 
            placeholder="EMAIL" 
            className="brutalist-border p-4 font-bold uppercase"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <input 
            type="password" 
            placeholder="PASSWORD" 
            className="brutalist-border p-4 font-bold uppercase"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          
          {error && <p className="text-black bg-white border border-black p-2 text-xs font-bold uppercase">{error}</p>}
          
          <button 
            type="submit" 
            disabled={loading}
            className="brutalist-button py-6 text-xl"
          >
            {loading ? 'PROCESSING...' : (isLogin ? 'ENTER GRID' : 'CREATE PERSONA')}
          </button>
        </form>
        
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="mt-8 text-xs font-bold tracking-widest uppercase underline hover:no-underline opacity-50 hover:opacity-100"
        >
          {isLogin ? 'NEED AN IDENTITY? SIGN UP' : 'ALREADY HAVE A SIGNAL? LOGIN'}
        </button>
      </div>
    </div>
  );
}
