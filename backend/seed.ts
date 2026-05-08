import { connectDB, mongoose } from './db/connection';
import { User, Post, Comment, Friendship, Story, Message } from './db/index';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Initializing connection...');
  await connectDB();

  console.log('Clearing database...');
  await Promise.all([
    User.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Friendship.deleteMany({}),
    Story.deleteMany({}),
    Message.deleteMany({})
  ]);

  console.log('Seeding database with test profiles...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const alice = await User.create({
    username: 'alice_music',
    email: 'alice@example.com',
    password_hash: passwordHash,
    top_artists: ['Taylor Swift', 'Lorde', 'Lana Del Rey', 'Charli XCX', 'Phoebe Bridgers'],
    liner_notes: 'Just a girl who loves sad pop songs.',
    profile_picture: 'https://api.dicebear.com/9.x/notionists/svg?seed=Alice',
    favorite_genre: 'pop',
    anthem_track_id: '3hUxzQpSfdDqwM3ZTFQY0K',
    anthem_name: 'august',
    badge: 'EARLY ADOPTER'
  });
  
  const bob = await User.create({
    username: 'hiphop_bob',
    email: 'bob@example.com',
    password_hash: passwordHash,
    top_artists: ['Kendrick Lamar', 'Tyler, The Creator', 'Frank Ocean', 'J. Cole', 'Mac Miller'],
    liner_notes: 'Hip hop head since day one.',
    profile_picture: 'https://api.dicebear.com/9.x/notionists/svg?seed=Bob',
    favorite_genre: 'hiphop',
    anthem_track_id: '7KXjTSCq5nL1LoYtL7XAwS',
    anthem_name: 'HUMBLE.',
    badge: 'TASTEMAKER'
  });
  
  const charlie = await User.create({
    username: 'charlie_indie',
    email: 'charlie@example.com',
    password_hash: passwordHash,
    top_artists: ['Taylor Swift', 'Phoebe Bridgers', 'Clairo', 'Mitski', 'Boygenius'],
    liner_notes: 'Indie vibes only.',
    profile_picture: 'https://api.dicebear.com/9.x/notionists/svg?seed=Charlie',
    favorite_genre: 'indie',
    anthem_track_id: '0k1WUmIRnG3xU6fvvDVfRG',
    anthem_name: 'Motion Sickness'
  });
  
  const diana = await User.create({
    username: 'metal_diana',
    email: 'diana@example.com',
    password_hash: passwordHash,
    top_artists: ['Metallica', 'Iron Maiden', 'Megadeth', 'Slayer', 'Anthrax'],
    liner_notes: 'Metal forever \\m/',
    profile_picture: 'https://api.dicebear.com/9.x/notionists/svg?seed=Diana',
    favorite_genre: 'metal',
    anthem_track_id: '5sICkBXVmaCQk5aISGR3x1',
    anthem_name: 'Enter Sandman'
  });

  console.log('Users seeded successfully.');

  const p1 = await Post.create({
    user_id: alice._id,
    content: "Did anyone catch that new Lorde album? Absolute masterpiece.",
    title: "NEW LORDE ALBUM",
    image_url: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80",
    spotify_track_id: "1wZqMBc3JzFqN7b00D3zZ3"
  });

  const p2 = await Post.create({
    user_id: bob._id,
    content: "Just secured tickets to see Tyler next month!!",
    title: "TYLER TOUR"
  });

  await Post.create({
    user_id: diana._id,
    content: "Nothing beats the energy of a live thrash metal show.",
    title: "LIVE SHOWS",
    image_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80"
  });

  await Comment.create({
    post_id: p1._id,
    user_id: charlie._id,
    content: "Yes! I've had it on repeat all day."
  });

  await Comment.create({
    post_id: p2._id,
    user_id: alice._id,
    content: "Have fun! His live shows are crazy."
  });

  // Friendships
  // Alice and Charlie are friends
  await Friendship.create({
    user_id_1: alice._id,
    user_id_2: charlie._id,
    status: 'accepted',
    similarity_score: 60
  });
  
  // Bob sent friend request to Alice
  await Friendship.create({
    user_id_1: bob._id,
    user_id_2: alice._id,
    status: 'pending',
    similarity_score: 85
  });
  
  // Stories
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await Story.create({
    user_id: charlie._id,
    track_name: 'Kyoto',
    artist_name: 'Phoebe Bridgers',
    background_color: '#1a365d',
    spotify_track_id: '49tPTG8eEJbDcwHw1weJtV',
    expires_at: tomorrow
  });
  
  // Messages
  await Message.create({
    sender_id: alice._id,
    receiver_id: charlie._id,
    content: "hey charlie! did you see the new release?",
    message_type: "text",
    is_read: true
  });
  await Message.create({
    sender_id: charlie._id,
    receiver_id: alice._id,
    content: "yes it's so good!",
    message_type: "text",
    is_read: true
  });
  await Message.create({
    sender_id: alice._id,
    receiver_id: charlie._id,
    content: "Sent a song reaction",
    message_type: "song_reaction",
    reaction_track_id: "Motion Sickness",
    is_read: true
  });

  console.log('Posts, comments, friendships, and stories seeded successfully.');

  console.log('\n-----------------------------------------');
  console.log('Seeding complete! You can login with any of the following:');
  console.log('1. alice@example.com');
  console.log('2. bob@example.com');
  console.log('3. charlie@example.com');
  console.log('4. diana@example.com');
  console.log('Password for all accounts is: password123');
  console.log('-----------------------------------------');

  mongoose.connection.close();
}

seed().catch(console.error);
