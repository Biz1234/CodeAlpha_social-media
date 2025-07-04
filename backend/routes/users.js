
const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get user profile by username (public)
router.get('/:username', (req, res) => {
  const { username } = req.params;
  db.query(
    `SELECT id, username, full_name, bio, profile_picture, cover_photo, location, website, 
            occupation, interests, pronouns, created_at,
            (SELECT COUNT(*) FROM followers WHERE followed_id = users.id) AS follower_count,
            (SELECT COUNT(*) FROM followers WHERE follower_id = users.id) AS following_count
     FROM users WHERE username = ?`,
    [username],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(results[0]);
    }
  );
});

// Get current user's profile (protected)
router.get('/me', authMiddleware, (req, res) => {
  db.query(
    `SELECT id, username, email, full_name, bio, profile_picture, cover_photo, location, 
            website, occupation, interests, pronouns, created_at,
            (SELECT COUNT(*) FROM followers WHERE followed_id = users.id) AS follower_count,
            (SELECT COUNT(*) FROM followers WHERE follower_id = users.id) AS following_count
     FROM users WHERE id = ?`,
    [req.user.id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(results[0]);
    }
  );
});

// Update current user's profile (protected)
router.put('/me', authMiddleware, (req, res) => {
  const { full_name, bio, profile_picture, cover_photo, location, website, occupation, interests, pronouns } = req.body;
  db.query(
    `UPDATE users SET full_name = ?, bio = ?, profile_picture = ?, cover_photo = ?, 
            location = ?, website = ?, occupation = ?, interests = ?, pronouns = ? 
     WHERE id = ?`,
    [full_name || null, bio || null, profile_picture || null, cover_photo || null, 
     location || null, website || null, occupation || null, interests || null, pronouns || null, req.user.id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Follow or unfollow a user (protected)
router.post('/follow/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const followerId = req.user.id;

  if (parseInt(userId) === followerId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  // Check if already following
  db.query('SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?', [followerId, userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length > 0) {
      // Unfollow
      db.query('DELETE FROM followers WHERE follower_id = ? AND followed_id = ?', [followerId, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Unfollowed successfully' });
      });
    } else {
      // Follow
      db.query('INSERT INTO followers (follower_id, followed_id) VALUES (?, ?)', [followerId, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Followed successfully' });
      });
    }
  });
});

// Get follow status (protected)
router.get('/follow-status/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const followerId = req.user.id;

  db.query('SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?', [followerId, userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ isFollowing: results.length > 0 });
  });
});

module.exports = router;