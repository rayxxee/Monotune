import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'monutune.db');

const db = new Database(dbPath);

async function seed() {
  console.log('Initializing schema...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  console.log('Seeding database with test profiles...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, email, password_hash, top_artist_1, top_artist_2, top_artist_3, top_artist_4, top_artist_5, liner_notes, profile_picture)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('alice_music', 'alice@example.com', passwordHash, 'Taylor Swift', 'Lorde', 'Lana Del Rey', 'Charli XCX', 'Phoebe Bridgers', 'Just a girl who loves sad pop songs.', 'https://api.dicebear.com/9.x/notionists/svg?seed=Alice');
  
  insertUser.run('hiphop_bob', 'bob@example.com', passwordHash, 'Kendrick Lamar', 'Tyler, The Creator', 'Frank Ocean', 'J. Cole', 'Mac Miller', 'Hip hop head since day one.', 'https://api.dicebear.com/9.x/notionists/svg?seed=Bob');
  
  insertUser.run('charlie_indie', 'charlie@example.com', passwordHash, 'Taylor Swift', 'Phoebe Bridgers', 'Clairo', 'Mitski', 'Boygenius', 'Indie vibes only.', 'https://api.dicebear.com/9.x/notionists/svg?seed=Charlie');
  
  insertUser.run('metal_diana', 'diana@example.com', passwordHash, 'Metallica', 'Iron Maiden', 'Megadeth', 'Slayer', 'Anthrax', 'Metal forever \\m/', 'https://api.dicebear.com/9.x/notionists/svg?seed=Diana');

  console.log('Users seeded successfully.');

  // Get user IDs
  const aliceId = (db.prepare("SELECT id FROM users WHERE username = 'alice_music'").get() as any)?.id;
  const bobId = (db.prepare("SELECT id FROM users WHERE username = 'hiphop_bob'").get() as any)?.id;
  const charlieId = (db.prepare("SELECT id FROM users WHERE username = 'charlie_indie'").get() as any)?.id;
  const dianaId = (db.prepare("SELECT id FROM users WHERE username = 'metal_diana'").get() as any)?.id;

  if (aliceId && bobId && charlieId && dianaId) {
    const insertPost = db.prepare(`
      INSERT INTO posts (user_id, content, is_toxic, toxicity_score) VALUES (?, ?, 0, 0)
    `);
    
    // Clear posts to prevent duplicates on rerun
    db.exec('DELETE FROM posts');
    db.exec('DELETE FROM comments');
    db.exec('DELETE FROM friendships');

    const p1 = insertPost.run(aliceId, "Did anyone catch that new Lorde album? Absolute masterpiece.");
    const p2 = insertPost.run(bobId, "Just secured tickets to see Tyler next month!!");
    const p3 = insertPost.run(dianaId, "Nothing beats the energy of a live thrash metal show.");

    const insertComment = db.prepare(`
      INSERT INTO comments (post_id, user_id, content, is_toxic, toxicity_score) VALUES (?, ?, ?, 0, 0)
    `);

    insertComment.run(p1.lastInsertRowid, charlieId, "Yes! I've had it on repeat all day.");
    insertComment.run(p2.lastInsertRowid, aliceId, "Have fun! His live shows are crazy.");

    // Friendships
    const insertFriendship = db.prepare(`
      INSERT INTO friendships (user_id_1, user_id_2, status, similarity_score) VALUES (?, ?, ?, ?)
    `);

    // Alice and Charlie are friends
    insertFriendship.run(aliceId, charlieId, 'accepted', 60);
    
    // Bob sent friend request to Alice
    insertFriendship.run(bobId, aliceId, 'pending', 0);

    console.log('Posts, comments, and friendships seeded successfully.');
  }

  console.log('\\n-----------------------------------------');
  console.log('Seeding complete! You can login with any of the following:');
  console.log('1. alice@example.com');
  console.log('2. bob@example.com');
  console.log('3. charlie@example.com');
  console.log('4. diana@example.com');
  console.log('Password for all accounts is: password123');
  console.log('-----------------------------------------');
}

seed().catch(console.error);
