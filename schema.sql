/**
 * MONUTUNE: DATABASE SCHEMA (SQLite)
 * 
 * This schema defines the foundational tables for the music-based social network.
 * It includes support for top 5 artist tracking, toxicity flagging, and friendship relations.
 */

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Music Persona
    top_artist_1 VARCHAR(100),
    top_artist_2 VARCHAR(100),
    top_artist_3 VARCHAR(100),
    top_artist_4 VARCHAR(100),
    top_artist_5 VARCHAR(100),
    
    liner_notes TEXT, -- Bio
    profile_picture VARCHAR(255),
    
    -- Settings & Moderation
    min_similarity_threshold INTEGER DEFAULT 0,
    is_admin BOOLEAN DEFAULT 0,
    is_banned BOOLEAN DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- POSTS TABLE (Forum/Community Feed)
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) DEFAULT 'Untitled',
    content TEXT NOT NULL,
    
    -- Content Metadata
    image_url VARCHAR(255),
    spotify_track_id VARCHAR(100),
    
    -- Moderation & Engagement
    is_toxic BOOLEAN DEFAULT 0,
    toxicity_score FLOAT DEFAULT 0.0,
    
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    
    -- Moderation
    is_toxic BOOLEAN DEFAULT 0,
    toxicity_score FLOAT DEFAULT 0.0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- FRIENDSHIPS TABLE (Bidirectional Matching)
CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id_1 INTEGER NOT NULL,
    user_id_2 INTEGER NOT NULL,
    
    -- Status can be 'pending', 'accepted', 'rejected'
    status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    
    -- Similarity Snapshot
    similarity_score INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id_1, user_id_2),
    FOREIGN KEY (user_id_1) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id_2) REFERENCES users(id) ON DELETE CASCADE
);

-- MESSAGES TABLE (Chat Hub)
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    spotify_track_id VARCHAR(100),
    is_read BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
