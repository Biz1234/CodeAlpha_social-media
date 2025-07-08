const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();



// Get current user's profile
router.get('/me', authMiddleware, (req, res) => {
  db.query(
    `SELECT id, username, email, full_name, bio, profile_picture, cover_photo, location, 
            website, occupation, interests, pronouns, created_at, private,
            (SELECT COUNT(*) FROM followers WHERE followed_id = users.id) AS follower_count,
            (SELECT COUNT(*) FROM followers WHERE follower_id = users.id) AS following_count,
            (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS post_count
     FROM users WHERE id = ?`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(results[0]);
    }
  );
});

// Update current user's profile
router.put('/me', authMiddleware, (req, res) => {
  const {
    full_name, bio, profile_picture, cover_photo,
    location, website, occupation, interests, pronouns, private
  } = req.body;

  db.query(
    `UPDATE users SET full_name = ?, bio = ?, profile_picture = ?, cover_photo = ?, 
            location = ?, website = ?, occupation = ?, interests = ?, pronouns = ?, private = ? 
     WHERE id = ?`,
    [
      full_name || null, bio || null, profile_picture || null, cover_photo || null,
      location || null, website || null, occupation || null, interests || null,
      pronouns || null, private !== undefined ? private : false, req.user.id
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Follow/unfollow a user
router.post('/follow/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const followerId = req.user.id;

  if (parseInt(userId) === followerId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  db.query('SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?', [followerId, userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (results.length > 0) {
      db.query('DELETE FROM followers WHERE follower_id = ? AND followed_id = ?', [followerId, userId], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Unfollowed successfully' });
      });
    } else {
      db.query('INSERT INTO followers (follower_id, followed_id) VALUES (?, ?)', [followerId, userId], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Followed successfully' });
      });
    }
  });
});

// Get follow status
router.get('/follow-status/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const followerId = req.user.id;

  db.query('SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?', [followerId, userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ isFollowing: results.length > 0 });
  });
});



// Search users by username
router.get('/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Search query is required' });

  db.query(
    'SELECT id, username FROM users WHERE username LIKE ?',
    [`%${query}%`],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(results);
    }
  );
});

// Get posts liked by a user (respect privacy)
router.get('/:username/liked-posts', authMiddleware, (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user.id;

  db.query('SELECT id, private FROM users WHERE username = ?', [username], (err, userResults) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (userResults.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userResults[0];
    if (user.private && user.id !== currentUserId) {
      db.query('SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?', [currentUserId, user.id], (err, followResults) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (followResults.length === 0) return res.status(403).json({ error: 'This account is private' });
        fetchLikedPosts();
      });
    } else {
      fetchLikedPosts();
    }

    function fetchLikedPosts() {
      db.query(
        `SELECT posts.id, posts.content, posts.image_url, posts.created_at, users.username,
                (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) AS like_count
         FROM posts
         JOIN likes ON posts.id = likes.post_id
         JOIN users ON posts.user_id = users.id
         WHERE likes.user_id = (SELECT id FROM users WHERE username = ?)
         ORDER BY posts.created_at DESC`,
        [username],
        (err, results) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json(results);
        }
      );
    }
  });
});

// Get user profile by username (respect privacy)
router.get('/:username', authMiddleware, (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user.id;

  db.query(
    `SELECT id, username, full_name, bio, profile_picture, cover_photo, location, website, 
            occupation, interests, pronouns, created_at, private,
            (SELECT COUNT(*) FROM followers WHERE followed_id = users.id) AS follower_count,
            (SELECT COUNT(*) FROM followers WHERE follower_id = users.id) AS following_count,
            (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS post_count
     FROM users WHERE username = ?`,
    [username],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(404).json({ error: 'User not found' });

      const user = results[0];
      if (user.private && currentUserId !== user.id) {
        db.query(
          'SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?',
          [currentUserId, user.id],
          (err, followerResults) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (followerResults.length === 0) {
              return res.status(403).json({ error: 'This account is private' });
            }
            res.json(user);
          }
        );
      } else {
        res.json(user);
      }
    }
  );
});

module.exports = router;
