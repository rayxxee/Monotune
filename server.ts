import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import fs from 'fs';

// --- CONFIGURATION ---
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- DATABASE CONNECTION ---
const dbPath = path.join(__dirname, 'monutune.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Verification and Initialization check
function checkDbConnection() {
  console.log('--- DB INITIALIZATION ---');
  console.log(`Target DB: ${dbPath}`);
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema);
      console.log('Schema successfully verified/initialized.');
    } else {
      console.warn('schema.sql not found. Ensure DB is already initialized.');
    }
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
  }
}

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- BASE API ROUTES ---
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ONLINE', 
    engine: 'MONUTUNE_V1',
    timestamp: new Date().toISOString()
  });
});

// --- SERVER STARTUP ---
async function startServer() {
  checkDbConnection();

  // VITE INTEGRATION (For development/preview)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('--- MONUTUNE CORE ACTIVE ---');
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export db for use in other slices if needed
export { db };

// --- AUTHENTICATION ROUTES ---
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'monutune_secret_signal';

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, hashedPassword);
    
    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET);
    res.json({ token, user: { id: result.lastInsertRowid, username, email } });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// --- ONBOARDING ROUTE ---
app.post('/api/users/onboarding', async (req, res) => {
  const { userId, topArtists, linerNotes } = req.body;
  try {
    db.prepare(
      'UPDATE users SET top_artist_1 = ?, top_artist_2 = ?, top_artist_3 = ?, top_artist_4 = ?, top_artist_5 = ?, liner_notes = ? WHERE id = ?'
    ).run(topArtists[0], topArtists[1], topArtists[2], topArtists[3], topArtists[4], linerNotes, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Onboarding failed.' });
  }
});

// --- DISCOVERY ENGINE ---
// Phase 3: Mathematical Similarity Percentage Rank
const calculateRank = (u1: any, u2: any) => {
  const artists1 = [u1.top_artist_1, u1.top_artist_2, u1.top_artist_3, u1.top_artist_4, u1.top_artist_5]
    .filter(Boolean).map(a => a.toLowerCase().trim());
  const artists2 = [u2.top_artist_1, u2.top_artist_2, u2.top_artist_3, u2.top_artist_4, u2.top_artist_5]
    .filter(Boolean).map(a => a.toLowerCase().trim());

  if (artists1.length === 0 || artists2.length === 0) return 0;

  const set1 = new Set(artists1);
  const set2 = new Set(artists2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  // Similarity = (Shared / Total Unique) * 100
  return Math.round((intersection.size / union.size) * 100);
};

app.get('/api/discover', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id) as any;
    
    // Only fetch users we haven't swiped on yet, and who haven't already been matched/rejected with us
    const allUsers = db.prepare(`
      SELECT id, username, top_artist_1, top_artist_2, top_artist_3, top_artist_4, top_artist_5, liner_notes, profile_picture 
      FROM users 
      WHERE id != ?
      AND id NOT IN (SELECT user_id_2 FROM friendships WHERE user_id_1 = ?)
      AND id NOT IN (SELECT user_id_1 FROM friendships WHERE user_id_2 = ? AND status IN ('accepted', 'rejected'))
    `).all(decoded.id, decoded.id, decoded.id) as any;
    
    const recommendations = allUsers.map((other: any) => {
      const score = calculateRank(currentUser, other);
      
      // Find shared artists for UI display
      const u1Artists = [currentUser.top_artist_1, currentUser.top_artist_2, currentUser.top_artist_3, currentUser.top_artist_4, currentUser.top_artist_5]
        .filter(Boolean).map((a: string) => a.toLowerCase().trim());
      const u2Artists = [other.top_artist_1, other.top_artist_2, other.top_artist_3, other.top_artist_4, other.top_artist_5]
        .filter(Boolean).map((a: string) => a.toLowerCase().trim());
      const shared = u1Artists.filter((a: string) => u2Artists.includes(a));

      return {
        ...other,
        matchScore: score,
        sharedArtists: shared
      };
    })
    .sort((a: any, b: any) => b.matchScore - a.matchScore);

    res.json(recommendations);
  } catch (err) {
    res.status(401).json({ error: 'Session invalid' });
  }
});

app.post('/api/discover/swipe', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const currentUserId = decoded.id;
    const { targetUserId, direction } = req.body; // direction = 'left' or 'right'

    // Check if the target user has already liked us
    const existingIncoming = db.prepare(
      'SELECT * FROM friendships WHERE user_id_1 = ? AND user_id_2 = ? AND status = "pending"'
    ).get(targetUserId, currentUserId) as any;

    if (direction === 'right') {
      if (existingIncoming) {
        // MATCH!
        db.prepare(
          'UPDATE friendships SET status = "accepted" WHERE id = ?'
        ).run(existingIncoming.id);
        return res.json({ success: true, isMatch: true });
      } else {
        // We like them first
        const u1 = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUserId) as any;
        const u2 = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
        const score = calculateRank(u1, u2);

        db.prepare(
          'INSERT INTO friendships (user_id_1, user_id_2, status, similarity_score) VALUES (?, ?, "pending", ?)'
        ).run(currentUserId, targetUserId, score);
        return res.json({ success: true, isMatch: false });
      }
    } else {
      // Swiped Left (Pass)
      if (existingIncoming) {
        db.prepare(
          'UPDATE friendships SET status = "rejected" WHERE id = ?'
        ).run(existingIncoming.id);
      } else {
        db.prepare(
          'INSERT INTO friendships (user_id_1, user_id_2, status, similarity_score) VALUES (?, ?, "rejected", 0)'
        ).run(currentUserId, targetUserId);
      }
      return res.json({ success: true, isMatch: false });
    }
  } catch (err) {
    res.status(500).json({ error: 'Swipe processing failed.' });
  }
});

// --- TOXICITY MODERATION MIDDLEWARE ---
// Connects to local Flask API @ http://localhost:5000/predict
const checkToxicity = async (text: string) => {
  try {
    // In a real environment, this calls the ML model
    const response = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) return { is_toxic: false, score: 0 }; // Fallback if API is down
    
    const data = await response.json() as any;
    return { 
      is_toxic: data.prediction === 1 || data.is_toxic === true, 
      score: data.probability || data.score || 0 
    };
  } catch (err) {
    console.error('Toxicity API unreachable. Bypassing check for development.');
    return { is_toxic: false, score: 0 };
  }
};

// --- FORUM ROUTES ---

// Create Post
app.post('/api/posts', async (req, res) => {
  const { content, userId, imageUrl, spotifyTrackId } = req.body;
  
  // Toxicity Check
  const mod = await checkToxicity(content);
  if (mod.is_toxic) {
    return res.status(400).json({ 
      error: 'COMMENT REJECTED: TOXICITY DETECTED.',
      is_toxic: true 
    });
  }

  try {
    const result = db.prepare(
      'INSERT INTO posts (user_id, content, image_url, spotify_track_id, is_toxic, toxicity_score) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, content, imageUrl || null, spotifyTrackId || null, mod.is_toxic ? 1 : 0, mod.score);
    res.json({ id: result.lastInsertRowid, content, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to broadcast signal.' });
  }
});

// Get Feed
app.get('/api/posts', async (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT p.*, u.username, u.profile_picture 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.is_toxic = 0 
      ORDER BY p.created_at DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve signal stream.' });
  }
});

// Get Single Post + Comments
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = db.prepare(`
      SELECT p.*, u.username 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `).get(req.params.id);
    
    const comments = db.prepare(`
      SELECT c.*, u.username 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.post_id = ? AND c.is_toxic = 0
      ORDER BY c.created_at ASC
    `).all(req.params.id);
    
    res.json({ post, comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync with thread.' });
  }
});

// Create Comment
app.post('/api/posts/:postId/comments', async (req, res) => {
  const { content, userId } = req.body;
  
  const mod = await checkToxicity(content);
  if (mod.is_toxic) {
    return res.status(400).json({ 
      error: 'COMMENT REJECTED: TOXICITY DETECTED.',
      is_toxic: true 
    });
  }

  try {
    db.prepare(
      'INSERT INTO comments (post_id, user_id, content, is_toxic, toxicity_score) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.postId, userId, content, mod.is_toxic ? 1 : 0, mod.score);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to transmit comment.' });
  }
});

// --- FRIENDSHIP ROUTES ---

// Send Request
app.post('/api/friendships/request', async (req, res) => {
  const { userId1, userId2 } = req.body;
  try {
    // Determine similarity snapshot for the friendship record
    const u1 = db.prepare('SELECT * FROM users WHERE id = ?').get(userId1) as any;
    const u2 = db.prepare('SELECT * FROM users WHERE id = ?').get(userId2) as any;
    const score = calculateRank(u1, u2);

    db.prepare(
      'INSERT INTO friendships (user_id_1, user_id_2, status, similarity_score) VALUES (?, ?, "pending", ?)'
    ).run(userId1, userId2, score);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'FRIEND REQUEST FAILED. SIGNAL LOST.' });
  }
});

// Respond to Request
app.post('/api/friendships/respond', async (req, res) => {
  const { friendshipId, status } = req.body; // status: 'accepted' or 'rejected'
  try {
    db.prepare(
      'UPDATE friendships SET status = ? WHERE id = ?'
    ).run(status, friendshipId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'RESPONSE FAILED.' });
  }
});

// Get User Friends / Connections
app.get('/api/users/:id/friends', async (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT f.*, 
             u.username as friend_name, 
             u.profile_picture as friend_pic
      FROM friendships f
      JOIN users u ON (f.user_id_1 = u.id OR f.user_id_2 = u.id)
      WHERE (f.user_id_1 = ? OR f.user_id_2 = ?) 
      AND u.id != ?
      AND f.status = 'accepted'
    `).all(req.params.id, req.params.id, req.params.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'FAILED TO SYNC CONNECTIONS.' });
  }
});

// Get Pending Requests
app.get('/api/users/:id/pending', async (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT f.*, u.username as requester_name
      FROM friendships f
      JOIN users u ON f.user_id_1 = u.id
      WHERE f.user_id_2 = ? AND f.status = 'pending'
    `).all(req.params.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'FAILED TO FETCH PENDING SIGNALS.' });
  }
});

// --- USER PROFILE ROUTE ---
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, top_artist_1, top_artist_2, top_artist_3, top_artist_4, top_artist_5, liner_notes, profile_picture, is_admin, created_at 
      FROM users WHERE id = ?
    `).get(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'USER RECORD UNREADABLE.' });
  }
});

// --- ADMIN DASHBOARD ROUTES ---
app.get('/api/admin/stats', async (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get() as any;
    const toxicCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE is_toxic = 1').get() as any;
    
    // Recent flagged content
    const flaggedPosts = db.prepare(`
      SELECT p.*, u.username 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.is_toxic = 1 
      ORDER BY p.created_at DESC LIMIT 5
    `).all();

    res.json({
      users: userCount.count,
      posts: postCount.count,
      toxicPosts: toxicCount.count,
      flagged: flaggedPosts
    });
  } catch (err) {
    res.status(500).json({ error: 'ADMIN ACCESS DENIED.' });
  }
});

startServer();
