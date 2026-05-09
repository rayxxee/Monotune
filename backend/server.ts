import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import DB Module
import { connectDB, User, Post, Comment, Friendship, Message, Story, Block, Encore, Image } from './db/index';

// --- CONFIGURATION ---
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
});
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'monutune_secret_signal';

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- RATE LIMITING ---
const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, message: { error: 'Too many requests. Slow down.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many auth attempts. Try again later.' } });
const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many uploads. Slow down.' } });
app.use('/api/', generalLimiter);

// --- AUTH MIDDLEWARE ---
const requireAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Ban check — reject banned users at middleware level (Issue #10)
    const user = await User.findById(decoded.id).select('is_banned is_admin').lean();
    if (!user) return res.status(401).json({ error: 'User not found.' });
    if (user.is_banned) return res.status(403).json({ error: 'Account banned.' });
    
    req.userId = decoded.id;
    req.username = decoded.username;
    req.isAdmin = user.is_admin;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required.' });
  next();
};

// --- BASE API ROUTES ---
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ONLINE', 
    engine: 'MONUTUNE_V2_MONGO',
    timestamp: new Date().toISOString()
  });
});

// --- NOTIFICATIONS ---
app.get('/api/notifications/counts', requireAuth, async (req: any, res) => {
  try {
    const unreadMessages = await Message.countDocuments({ receiver_id: req.userId, is_read: false });
    const pendingConnections = await Friendship.countDocuments({ user_id_2: req.userId, status: 'pending' });
    res.json({ messages: unreadMessages, connections: pendingConnections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notification counts.' });
  }
});

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.post('/api/upload', requireAuth, uploadLimiter, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const image = await Image.create({
      data: req.file.buffer,
      contentType: req.file.mimetype
    });
    res.json({ imageUrl: `/api/images/${image._id}` });
  } catch (err) {
    res.status(500).json({ error: 'Image upload failed' });
  }
});

app.get('/api/images/:id', async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) return res.status(404).send('Not found');
    res.set('Content-Type', image.contentType);
    res.send(image.data);
  } catch (err) {
    res.status(500).send('Error');
  }
});

// --- PROFILE PICTURE UPLOAD ---
app.post('/api/users/:id/profile-picture', requireAuth, upload.single('image'), async (req: any, res) => {
  if (req.userId !== req.params.id) return res.status(403).json({ error: 'Forbidden.' });
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided.' });

    // Validate mimetype
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF.' });
    }

    // Store image binary in the Image collection
    const image = await Image.create({
      data: req.file.buffer,
      contentType: req.file.mimetype
    });

    const imageUrl = `/api/images/${image._id}`;

    // Update the user's profile_picture field
    await User.findByIdAndUpdate(req.params.id, { $set: { profile_picture: imageUrl } });

    res.json({ success: true, imageUrl });
  } catch (err) {
    res.status(500).json({ error: 'Profile picture upload failed.' });
  }
});

// DELETE profile picture
app.delete('/api/users/:id/profile-picture', requireAuth, async (req: any, res) => {
  if (req.userId !== req.params.id) return res.status(403).json({ error: 'Forbidden.' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Remove the old image document if it exists
    if (user.profile_picture) {
      const imageId = user.profile_picture.split('/').pop();
      if (imageId) await Image.findByIdAndDelete(imageId);
    }

    await User.findByIdAndUpdate(req.params.id, { $set: { profile_picture: null } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove profile picture.' });
  }
});

// --- WEBSOCKETS ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'monutune_secret_signal';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    socket.data.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  socket.join(socket.data.userId);

  socket.on('disconnect', () => {
    // disconnected
  });
});

// --- SERVER STARTUP ---
async function startServer() {
  await connectDB(); 

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('--- MONUTUNE CORE ACTIVE ---');
    console.log(`Server: http://localhost:${PORT}`);
  });
}

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({ username, email, password_hash: hashedPassword, verification_token: verificationToken });
    
    // Log verification URL (swap with real email service in production)
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${verificationToken}`;
    console.log(`[EMAIL VERIFICATION] ${email} → ${verifyUrl}`);
    
    const token = jwt.sign({ id: user._id, username }, JWT_SECRET);
    res.json({ token, user: { id: user._id, username, email, hasOnboarded: false, is_verified: false } });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    if (user.is_banned) {
      return res.status(403).json({ error: 'Account has been banned by a moderator.' });
    }
    
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, hasOnboarded: user.top_artists.length > 0, is_verified: user.is_verified } });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// --- EMAIL VERIFICATION ---
app.get('/api/auth/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verification_token: req.params.token });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token.' });
    user.is_verified = true;
    user.verification_token = undefined;
    await user.save();
    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed.' });
  }
});



// --- ONBOARDING ROUTE ---
app.post('/api/users/onboarding', requireAuth, async (req: any, res) => {
  const { topArtists, linerNotes, favoriteGenre, anthemTrackId, anthemName } = req.body;
  const userId = req.userId;
  try {
    await User.findByIdAndUpdate(userId, {
      $set: {
        top_artists: topArtists || [],
        liner_notes: linerNotes || null,
        favorite_genre: favoriteGenre || null,
        anthem_track_id: anthemTrackId || null,
        anthem_name: anthemName || null
      }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Onboarding failed.' });
  }
});


// --- DISCOVERY ENGINE ---
// Phase 3: Mathematical Similarity Percentage Rank
const calculateRank = (artists1: string[], artists2: string[]) => {
  const a1 = artists1.filter(Boolean).map(a => a.toLowerCase().trim());
  const a2 = artists2.filter(Boolean).map(a => a.toLowerCase().trim());

  if (a1.length === 0 || a2.length === 0) return 0;

  const set1 = new Set(a1);
  const set2 = new Set(a2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  // Similarity = (Shared / Total Unique) * 100
  return Math.round((intersection.size / union.size) * 100);
};

app.get('/api/discover', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
const currentUser = await User.findById(decoded.id);
    if (!currentUser) return res.status(401).json({ error: 'User not found' });
    
    const genreFilter = req.query.genre as string;
    
    // Get Blocked IDs
    const blocks = await Block.find({
      $or: [{ blocker_id: currentUser._id }, { blocked_id: currentUser._id }]
    });
    const blockedIds = blocks.map(b => 
      b.blocker_id.toString() === currentUser._id.toString() ? b.blocked_id : b.blocker_id
    );

    // Get Friendship IDs
    const friendships = await Friendship.find({
      $or: [{ user_id_1: currentUser._id }, { user_id_2: currentUser._id }]
    });
    // Exclude accepted/rejected. Pending sent from us also excluded. Pending received from them we should see them so we can swipe back? Actually original sql excluded pending sent from us, and all accepted/rejected
    const excludedFriendshipIds: mongoose.Types.ObjectId[] = [];
    friendships.forEach(f => {
      // AND u.id NOT IN (SELECT user_id_2 FROM friendships WHERE user_id_1 = ?)
      if (f.user_id_1.toString() === currentUser._id.toString()) excludedFriendshipIds.push(f.user_id_2);
      // AND u.id NOT IN (SELECT user_id_1 FROM friendships WHERE user_id_2 = ? AND status IN ('accepted', 'rejected'))
      if (f.user_id_2.toString() === currentUser._id.toString() && (f.status === 'accepted' || f.status === 'rejected')) {
        excludedFriendshipIds.push(f.user_id_1);
      }
    });
    
    const excludeIds = [currentUser._id, ...blockedIds, ...excludedFriendshipIds];

    let query: any = { _id: { $nin: excludeIds } };
    if (genreFilter) {
      query.favorite_genre = { $regex: new RegExp(`^${genreFilter}$`, 'i') };
    }

    const allUsers = await User.find(query);
    const threshold = currentUser.min_similarity_threshold || 0;

    const recommendations = allUsers.map((other) => {
      const score = calculateRank(currentUser.top_artists, other.top_artists);
      
      const u1Artists = currentUser.top_artists.map(a => a.toLowerCase().trim());
      const u2Artists = other.top_artists.map(a => a.toLowerCase().trim());
      const shared = u1Artists.filter(a => u2Artists.includes(a));

      return {
        id: other._id.toString(),
        username: other.username,
        top_artist_1: other.top_artists[0],
        top_artist_2: other.top_artists[1],
        top_artist_3: other.top_artists[2],
        top_artist_4: other.top_artists[3],
        top_artist_5: other.top_artists[4],
        liner_notes: other.liner_notes,
        profile_picture: other.profile_picture,
        anthem_track_id: other.anthem_track_id,
        anthem_name: other.anthem_name,
        favorite_genre: other.favorite_genre,
        matchScore: score,
        sharedArtists: shared
      };
    })
    .filter(a => a.matchScore >= threshold)
    .sort((a, b) => b.matchScore - a.matchScore);

    res.json(recommendations);
  } catch (err) {
    res.status(401).json({ error: 'Session invalid' });
  }
});

// Get remaining Encores
app.get('/api/discover/encores/remaining', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
// Mongoose: count encores today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const count = await Encore.countDocuments({
      sender_id: decoded.id,
      createdAt: { $gte: startOfDay }
    });
    
    res.json({ remaining: Math.max(0, 1 - count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch encores.' });
  }
});

app.post('/api/discover/swipe', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
const currentUserId = decoded.id;
    const { targetUserId, direction, isEncore } = req.body;
    
    if (isEncore) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const count = await Encore.countDocuments({ sender_id: currentUserId, createdAt: { $gte: startOfDay } });
      if (count > 0) return res.status(400).json({ error: 'Out of Encores for today.' });
      
      await Encore.create({ sender_id: currentUserId, receiver_id: targetUserId });
    }

    const existingIncoming = await Friendship.findOne({
      user_id_1: targetUserId,
      user_id_2: currentUserId,
      status: 'pending'
    });

    if (direction === 'right') {
      if (existingIncoming) {
        existingIncoming.status = 'accepted';
        await existingIncoming.save();
        return res.json({ success: true, isMatch: true });
      } else {
        const u1 = await User.findById(currentUserId);
        const u2 = await User.findById(targetUserId);
        if (!u1 || !u2) throw new Error('User not found');
        const score = calculateRank(u1.top_artists, u2.top_artists);

        await Friendship.create({
          user_id_1: currentUserId,
          user_id_2: targetUserId,
          status: 'pending',
          similarity_score: score
        });
        return res.json({ success: true, isMatch: false });
      }
    } else {
      // Swiped Left
      if (existingIncoming) {
        existingIncoming.status = 'rejected';
        await existingIncoming.save();
      } else {
        await Friendship.create({
          user_id_1: currentUserId,
          user_id_2: targetUserId,
          status: 'rejected',
          similarity_score: 0
        });
      }
      return res.json({ success: true, isMatch: false });
    }
  } catch (err) {
    res.status(500).json({ error: 'Swipe processing failed.' });
  }
});

// --- TOXICITY MODERATION MIDDLEWARE ---
const checkToxicity = async (text: string) => {
  try {
    const response = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) return { is_toxic: false, score: 0 };
    
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

app.post('/api/posts', requireAuth, async (req: any, res) => {
  const { title, content, imageUrl, spotifyTrackId } = req.body;
  const userId = req.userId;
  
  const mod = await checkToxicity(content);
  if (mod.is_toxic) {
    return res.status(400).json({ 
      error: 'COMMENT REJECTED: TOXICITY DETECTED.',
      is_toxic: true 
    });
  }

  try {
    const post = await Post.create({
      user_id: userId,
      title: title || 'Untitled',
      content,
      image_url: imageUrl || null,
      spotify_track_id: spotifyTrackId || null,
      is_toxic: mod.is_toxic,
      toxicity_score: mod.score
    });
    res.json({ id: post._id, title, content, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to broadcast signal.' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const total = await Post.countDocuments({ is_toxic: false });
    const posts = await Post.find({ is_toxic: false })
      .populate('user_id', 'username profile_picture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const formattedPosts = posts.map(p => ({
      ...p,
      id: p._id,
      user_id: (p.user_id as any)._id,
      username: (p.user_id as any).username,
      profile_picture: (p.user_id as any).profile_picture,
      created_at: p.createdAt
    }));
    res.json({ data: formattedPosts, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve signal stream.' });
  }
});

app.get('/api/users/:id/posts', async (req, res) => {
  try {
    const posts = await Post.find({ user_id: req.params.id, is_toxic: false })
      .populate('user_id', 'username profile_picture')
      .sort({ createdAt: -1 })
      .lean();
      
    const formattedPosts = posts.map(p => ({
      ...p,
      id: p._id,
      user_id: (p.user_id as any)._id,
      username: (p.user_id as any).username,
      profile_picture: (p.user_id as any).profile_picture,
      created_at: p.createdAt
    }));
    res.json(formattedPosts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user posts.' });
  }
});

app.delete('/api/posts/:id', requireAuth, async (req: any, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.user_id.toString() !== req.userId && !req.isAdmin) return res.status(403).json({ error: 'Forbidden.' });

    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ post_id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const postObj = await Post.findById(req.params.id)
      .populate('user_id', 'username')
      .lean();
    if (!postObj) return res.status(404).json({error: 'Not found'});
    
    const post = {
      ...postObj,
      id: postObj._id,
      user_id: (postObj.user_id as any)._id,
      username: (postObj.user_id as any).username,
      created_at: postObj.createdAt
    };
    
    const commentsRaw = await Comment.find({ post_id: req.params.id, is_toxic: false })
      .populate('user_id', 'username')
      .sort({ createdAt: 1 })
      .lean();
      
    const comments = commentsRaw.map(c => ({
      ...c,
      id: c._id,
      user_id: (c.user_id as any)._id,
      username: (c.user_id as any).username,
      created_at: c.createdAt
    }));
    
    res.json({ post, comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync with thread.' });
  }
});

app.post('/api/posts/:id/vote', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
const blockerId = decoded.id;
    const blockedId = req.params.id;

    await Friendship.deleteMany({
      $or: [
        { user_id_1: blockerId, user_id_2: blockedId },
        { user_id_1: blockedId, user_id_2: blockerId }
      ]
    });
    
    await Block.updateOne(
      { blocker_id: blockerId, blocked_id: blockedId },
      { blocker_id: blockerId, blocked_id: blockedId },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Block failed.' });
  }
});

app.post('/api/users/:id/unblock', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
await Block.deleteOne({ blocker_id: decoded.id, blocked_id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Unblock failed.' });
  }
});

app.get('/api/blocks', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
const blocks = await Block.find({ blocker_id: decoded.id })
      .populate('blocked_id', 'username')
      .lean();
      
    const formatted = blocks.map(b => ({
      id: b._id,
      blocked_id: (b.blocked_id as any)._id,
      blocked_name: (b.blocked_id as any).username
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blocks.' });
  }
});

// --- FRIENDSHIPS ---
app.post('/api/friendships/request', requireAuth, async (req: any, res) => {
  try {
    const { userId1, userId2 } = req.body;
    const currentUserId = req.userId;
    if (userId1 !== currentUserId) return res.status(403).json({ error: 'Forbidden' });
    
    const existing = await Friendship.findOne({
      $or: [
        { user_id_1: userId1, user_id_2: userId2 },
        { user_id_1: userId2, user_id_2: userId1 }
      ]
    });
    if (existing) return res.json({ success: true });

    const u1 = await User.findById(userId1);
    const u2 = await User.findById(userId2);
    if (!u1 || !u2) return res.status(404).json({ error: 'User not found' });
    const score = calculateRank(u1.top_artists, u2.top_artists);

    await Friendship.create({
      user_id_1: userId1,
      user_id_2: userId2,
      status: 'pending',
      similarity_score: score
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send request.' });
  }
});

app.post('/api/friendships/respond', requireAuth, async (req: any, res) => {
  try {
    const { friendshipId, status } = req.body;
    const currentUserId = req.userId;
    
    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) return res.status(404).json({ error: 'Not found' });
    if (friendship.user_id_2.toString() !== currentUserId && !req.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    if (status === 'accepted') {
      friendship.status = 'accepted';
      await friendship.save();
    } else {
      await Friendship.findByIdAndDelete(friendshipId);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to respond.' });
  }
});

app.post('/api/friendships/unfriend', requireAuth, async (req: any, res) => {
  try {
    const { userId1, userId2 } = req.body;
    const currentUserId = req.userId;
    if (userId1 !== currentUserId && !req.isAdmin) return res.status(403).json({ error: 'Forbidden' });

    await Friendship.deleteMany({
      $or: [
        { user_id_1: userId1, user_id_2: userId2 },
        { user_id_1: userId2, user_id_2: userId1 }
      ]
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unfriend.' });
  }
});

// Get User Friends / Connections
app.get('/api/users/:id/friends', async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ user_id_1: req.params.id }, { user_id_2: req.params.id }],
      status: 'accepted'
    })
    .populate('user_id_1', 'username profile_picture')
    .populate('user_id_2', 'username profile_picture')
    .lean();
    
    const formatted = friendships.map(f => {
      const isUser1 = (f.user_id_1 as any)._id.toString() === req.params.id;
      const friend = isUser1 ? f.user_id_2 as any : f.user_id_1 as any;
      return {
        ...f,
        id: f._id,
        user_id_1: (f.user_id_1 as any)._id,
        user_id_2: (f.user_id_2 as any)._id,
        friend_name: friend.username,
        friend_pic: friend.profile_picture
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'FAILED TO SYNC CONNECTIONS.' });
  }
});

// Get Pending Requests
app.get('/api/users/:id/pending', async (req, res) => {
  try {
    const friendships = await Friendship.find({
      user_id_2: req.params.id,
      status: 'pending'
    })
    .populate('user_id_1', 'username profile_picture')
    .lean();
    
    const formatted = friendships.map(f => ({
      ...f,
      id: f._id,
      user_id_1: (f.user_id_1 as any)._id,
      user_id_2: f.user_id_2,
      requester_name: (f.user_id_1 as any).username,
      requester_pic: (f.user_id_1 as any).profile_picture
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'FAILED TO FETCH PENDING SIGNALS.' });
  }
});

// --- USER PROFILE ROUTE ---
app.get('/api/users/:id', async (req, res) => {
  const viewerId = req.query.viewerId;
  try {
    const userObj = await User.findById(req.params.id).lean();
    if (!userObj) return res.status(404).json({error: 'Not found'});

    const user: any = {
      id: userObj._id,
      username: userObj.username,
      email: userObj.email,
      top_artist_1: userObj.top_artists[0],
      top_artist_2: userObj.top_artists[1],
      top_artist_3: userObj.top_artists[2],
      top_artist_4: userObj.top_artists[3],
      top_artist_5: userObj.top_artists[4],
      liner_notes: userObj.liner_notes,
      profile_picture: userObj.profile_picture,
      is_admin: userObj.is_admin,
      is_banned: userObj.is_banned,
      min_similarity_threshold: userObj.min_similarity_threshold,
      created_at: userObj.createdAt,
      badge: userObj.badge,
      anthem_track_id: userObj.anthem_track_id,
      anthem_name: userObj.anthem_name,
      favorite_genre: userObj.favorite_genre,
      spotify_connected: userObj.spotify_connected,
      profile_images: userObj.profile_images
    };

    if (viewerId && String(viewerId) !== String(req.params.id)) {
      const viewerUser = await User.findById(viewerId).select('top_artists').lean();
      const friendship = await Friendship.findOne({
        $or: [
          { user_id_1: viewerId, user_id_2: req.params.id },
          { user_id_1: req.params.id, user_id_2: viewerId }
        ]
      });

      user.friendship_status = friendship ? friendship.status : 'none';
      user.friendship_sender = friendship ? friendship.user_id_1 : null;
      user.friendship_id = friendship ? friendship._id : null;
      
      if (viewerUser) {
        user.similarity_score = calculateRank(viewerUser.top_artists, userObj.top_artists);
      }
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'USER RECORD UNREADABLE.' });
  }
});

app.patch('/api/users/:id/settings', requireAuth, async (req: any, res) => {
  if (req.userId !== req.params.id) return res.status(403).json({ error: 'Forbidden.' });
  const { email, password, minSimilarityThreshold, topArtists, linerNotes, favoriteGenre, anthemTrackId, anthemName, profileImages } = req.body;
  try {
    const update: any = { min_similarity_threshold: minSimilarityThreshold || 0 };
    
    if (email) update.email = email;
    if (password && password.length > 0) {
      update.password_hash = await bcrypt.hash(password, 10);
    }
    if (topArtists && topArtists.length === 5) {
      update.top_artists = topArtists;
    }
    if (linerNotes !== undefined) update.liner_notes = linerNotes;
    if (favoriteGenre !== undefined) update.favorite_genre = favoriteGenre || null;
    if (anthemTrackId !== undefined) {
      update.anthem_track_id = anthemTrackId || null;
      update.anthem_name = anthemName || null;
    }
    if (profileImages !== undefined) {
      update.profile_images = profileImages;
    }

    await User.findByIdAndUpdate(req.params.id, { $set: update });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// --- ACCOUNT DELETION ---
app.delete('/api/users/:id', requireAuth, async (req: any, res) => {
  if (req.userId !== req.params.id) return res.status(403).json({ error: 'Forbidden.' });
  try {
    const userId = req.params.id;
    
    // Cascade delete all user data
    await Promise.all([
      Post.deleteMany({ user_id: userId }),
      Comment.deleteMany({ user_id: userId }),
      Message.deleteMany({ $or: [{ sender_id: userId }, { receiver_id: userId }] }),
      Friendship.deleteMany({ $or: [{ user_id_1: userId }, { user_id_2: userId }] }),
      Story.deleteMany({ user_id: userId }),
      Block.deleteMany({ $or: [{ blocker_id: userId }, { blocked_id: userId }] }),
      Encore.deleteMany({ $or: [{ sender_id: userId }, { receiver_id: userId }] }),
    ]);
    
    // Delete profile picture image if exists
    const user = await User.findById(userId);
    if (user?.profile_picture) {
      const imageId = user.profile_picture.split('/').pop();
      if (imageId) await Image.findByIdAndDelete(imageId);
    }
    // Delete profile showcase images
    if (user?.profile_images) {
      for (const img of user.profile_images) {
        const imgId = img.split('/').pop();
        if (imgId) await Image.findByIdAndDelete(imgId);
      }
    }
    
    await User.findByIdAndDelete(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Account deletion failed.' });
  }
});

// --- STORIES ROUTES ---
app.get('/api/stories', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
const currentUserId = decoded.id;
    
    const friendships = await Friendship.find({
      $or: [{ user_id_1: currentUserId }, { user_id_2: currentUserId }],
      status: 'accepted'
    });
    
    const friendIds = friendships.map(f => 
      f.user_id_1.toString() === currentUserId ? f.user_id_2 : f.user_id_1
    );

    const now = new Date();
    
    const storiesRaw = await Story.find({
      user_id: { $in: friendIds },
      expires_at: { $gt: now }
    })
    .populate('user_id', 'username profile_picture')
    .sort({ createdAt: -1 })
    .lean();

    const formattedStories = storiesRaw.map(s => ({
      ...s,
      id: s._id,
      user_id: (s.user_id as any)._id,
      username: (s.user_id as any).username,
      profile_picture: (s.user_id as any).profile_picture,
      created_at: s.createdAt
    }));
    
    const myStoryRaw = await Story.findOne({
      user_id: currentUserId,
      expires_at: { $gt: now }
    })
    .populate('user_id', 'username profile_picture')
    .sort({ createdAt: -1 })
    .lean();
    
    if (myStoryRaw) {
      formattedStories.unshift({
        ...myStoryRaw,
        id: myStoryRaw._id,
        user_id: (myStoryRaw.user_id as any)._id,
        username: (myStoryRaw.user_id as any).username,
        profile_picture: (myStoryRaw.user_id as any).profile_picture,
        created_at: myStoryRaw.createdAt
      });
    }
    
    res.json(formattedStories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories.' });
  }
});

app.post('/api/stories', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
const { trackName, artistName, backgroundColor, spotifyTrackId, imageUrl } = req.body;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    await Story.create({
      user_id: decoded.id,
      track_name: trackName,
      artist_name: artistName,
      background_color: backgroundColor || '#000000',
      spotify_track_id: spotifyTrackId || null,
      image_url: imageUrl || null,
      expires_at: expiresAt
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to post story.' });
  }
});

app.delete('/api/stories/:id', requireAuth, async (req: any, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found.' });
    if (story.user_id.toString() !== req.userId && !req.isAdmin) return res.status(403).json({ error: 'Forbidden.' });

    await Story.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete story.' });
  }
});

// Get current user's active story (for Profile page)
app.get('/api/stories/me', requireAuth, async (req: any, res) => {
  try {
    const now = new Date();
    const story = await Story.findOne({ user_id: req.userId, expires_at: { $gt: now } })
      .sort({ createdAt: -1 }).lean();
    if (!story) return res.json(null);
    res.json({ ...story, id: story._id, created_at: story.createdAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your story.' });
  }
});

// --- CHAT ROUTES ---
app.get('/api/chats/inbox', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
const currentUserId = decoded.id;

    const friendships = await Friendship.find({
      $or: [{ user_id_1: currentUserId }, { user_id_2: currentUserId }],
      status: 'accepted'
    }).lean();

    const friendIds = new Set(friendships.map(f => 
      f.user_id_1.toString() === currentUserId ? f.user_id_2.toString() : f.user_id_1.toString()
    ));

    const sentMessages = await Message.find({ sender_id: currentUserId }).distinct('receiver_id');
    const receivedMessages = await Message.find({ receiver_id: currentUserId }).distinct('sender_id');

    const sentSet = new Set(sentMessages.map(id => id.toString()));
    const receivedSet = new Set(receivedMessages.map(id => id.toString()));

    const requestIds = new Set<string>();
    const inboxIds = new Set<string>(friendIds);

    for (const rId of receivedSet) {
      if (!sentSet.has(rId) && !friendIds.has(rId)) {
        requestIds.add(rId);
      } else {
        inboxIds.add(rId);
      }
    }
    
    for (const sId of sentSet) {
      inboxIds.add(sId);
    }

    const inboxUsers = await User.find({ _id: { $in: Array.from(inboxIds) } }).select('username profile_picture').lean();
    const requestUsers = await User.find({ _id: { $in: Array.from(requestIds) } }).select('username profile_picture').lean();

    const formatUser = (u: any) => ({
      id: u._id.toString(),
      name: u.username,
      pic: u.profile_picture
    });

    res.json({
      inbox: inboxUsers.map(formatUser),
      requests: requestUsers.map(formatUser)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load inbox.' });
  }
});

app.get('/api/chats/:friendId', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
    const currentUserId = decoded.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    
    const query = {
      $or: [
        { sender_id: currentUserId, receiver_id: req.params.friendId },
        { sender_id: req.params.friendId, receiver_id: currentUserId }
      ]
    };
    const total = await Message.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    // For messages, page 1 = newest. We skip from the end.
    const skip = Math.max(0, total - (page * limit));
    const fetchLimit = page === totalPages ? total - ((totalPages - 1) * limit) : limit;
    
    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .skip(skip < 0 ? 0 : skip)
      .limit(fetchLimit)
      .lean();
    
    res.json({ data: messages.map(m => ({...m, id: m._id, created_at: m.createdAt})), page, totalPages, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

app.post('/api/chats/:friendId', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
    const currentUserId = decoded.id;
    const { content, spotifyTrackId, messageType, reactionTrackId, trackName, trackArtist, trackImage } = req.body;
    
    const msg = await Message.create({
      sender_id: currentUserId,
      receiver_id: req.params.friendId,
      content,
      spotify_track_id: spotifyTrackId || null,
      message_type: messageType || 'text',
      reaction_track_id: reactionTrackId || null,
      track_name: trackName || null,
      track_artist: trackArtist || null,
      track_image: trackImage || null
    });

    const formattedMsg = { ...msg.toObject(), id: msg._id, created_at: msg.createdAt };
    
    // Emit real-time message to the receiver and the sender
    io.to(req.params.friendId).emit('new_message', formattedMsg);
    io.to(currentUserId).emit('new_message', formattedMsg);

    res.json({ success: true, message: formattedMsg });
  } catch (err) {
    res.status(500).json({ error: 'Message failed.' });
  }
});

app.patch('/api/messages/:friendId/read', requireAuth, async (req: any, res) => {
  try {
    const decoded = { id: req.userId, username: req.username };
    await Message.updateMany(
      { sender_id: req.params.friendId, receiver_id: decoded.id },
      { $set: { is_read: true } }
    );
    
    // Tell the sender that the messages they sent have been read
    io.to(req.params.friendId).emit('messages_read', {
      readerId: decoded.id
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark read.' });
  }
});

// --- ADMIN DASHBOARD ROUTES ---
app.post('/api/admin/ban', requireAuth, requireAdmin, async (req: any, res) => {
  const { userId, isBanned } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { is_banned: isBanned });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ban failed.' });
  }
});

app.get('/api/admin/review-queue', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const postsRaw = await Post.find({ is_toxic: false, toxicity_score: { $gt: 0 } })
      .populate('user_id', 'username')
      .sort({ createdAt: -1 }).lean();
    
    const commentsRaw = await Comment.find({ is_toxic: false, toxicity_score: { $gt: 0 } })
      .populate('user_id', 'username')
      .sort({ createdAt: -1 }).lean();
      
    const posts = postsRaw.map(p => ({...p, id: p._id, created_at: p.createdAt, username: (p.user_id as any).username}));
    const comments = commentsRaw.map(c => ({...c, id: c._id, created_at: c.createdAt, username: (c.user_id as any).username}));
    res.json({ posts, comments });
  } catch (err) {
    res.status(500).json({ error: 'Review queue fetch failed.' });
  }
});

app.get('/api/admin/stats', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();
    const toxicCount = await Post.countDocuments({ is_toxic: true });
    
    const flaggedPostsRaw = await Post.find({ is_toxic: true })
      .populate('user_id', 'username')
      .sort({ createdAt: -1 })
      .limit(5).lean();

    const flaggedPosts = flaggedPostsRaw.map(p => ({...p, id: p._id, created_at: p.createdAt, username: (p.user_id as any).username}));

    res.json({
      users: userCount,
      posts: postCount,
      toxicPosts: toxicCount,
      flagged: flaggedPosts
    });
  } catch (err) {
    res.status(500).json({ error: 'ADMIN ACCESS DENIED.' });
  }
});

// --- SPOTIFY INTEGRATION ---

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/api/auth/spotify/callback';

// Step 1: Redirect user to Spotify login
app.get('/api/auth/spotify', (req, res) => {
  const userId = req.query.userId;
  const scopes = 'user-top-read user-read-private user-read-email';
  const authUrl = 'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: scopes,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state: String(userId || ''),
    }).toString();
  res.json({ url: authUrl });
});

// Step 2: Spotify redirects back here with a code
app.get('/api/auth/spotify/callback', async (req, res) => {
  const code = req.query.code as string;
  const userId = req.query.state as string;

  if (!code) {
    return res.status(400).send('Missing authorization code from Spotify.');
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }).toString(),
    });

    const tokenData = await tokenRes.json() as any;

    if (!tokenData.access_token) {
      return res.status(400).send('Failed to get access token from Spotify.');
    }

    // Fetch user's top artists
    const topArtistsRes = await fetch('https://api.spotify.com/v1/me/top/artists?limit=5&time_range=short_term', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const topArtistsData = await topArtistsRes.json() as any;

    const artistNames = topArtistsData.items?.map((a: any) => a.name) || [];

    if (artistNames.length > 0 && userId) {
      await User.findByIdAndUpdate(userId, { top_artists: artistNames, spotify_connected: true });
    }

    // Redirect to the frontend with success data as query params
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const params = new URLSearchParams({
      spotify: 'success',
      artists: JSON.stringify(artistNames),
    });
    res.redirect(`${frontendUrl}/spotify-callback.html?${params.toString()}`);
  } catch (err) {
    console.error('Spotify callback error:', err);
    res.status(500).send('Spotify connection failed.');
  }
});

// Unlink Spotify from a user's account
app.post('/api/auth/spotify/unlink', async (req, res) => {
  const { userId } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { spotify_connected: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlink Spotify.' });
  }
});

// Track search using Spotify API (client credentials flow — no user login needed)
app.get('/api/music/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.json([]);

  try {
    // Get a client credentials token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenRes.json() as any;

    if (!tokenData.access_token) return res.json([]);

    // Search Spotify
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=5`,
      { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
    );
    const searchData = await searchRes.json() as any;

    const results = (searchData.artists?.items || []).map((a: any) => ({
      name: a.name,
      id: a.id,
      image: a.images?.[0]?.url || null,
      genres: a.genres || [],
    }));

    res.json(results);
  } catch (err) {
    console.error('Spotify search error:', err);
    res.json([]);
  }
});

// Track search by name (returns tracks, not artists)
app.get('/api/music/tracks', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.json([]);

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) return res.json([]);

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
    );
    const searchData = await searchRes.json() as any;

    const results = (searchData.tracks?.items || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      artist: t.artists?.[0]?.name || 'Unknown',
      album: t.album?.name || '',
      image: t.album?.images?.[0]?.url || null,
      preview_url: t.preview_url,
    }));

    res.json(results);
  } catch (err) {
    console.error('Spotify track search error:', err);
    res.json([]);
  }
});

startServer();
