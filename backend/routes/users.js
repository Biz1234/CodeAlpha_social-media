const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Images only (JPEG/PNG)'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Get current user's profile
router.get('/me', authMiddleware, (req, res) => {
  console.log('GET /api/users/me:', { user: req.user });
  db.query(
    `SELECT id, username, email, full_name, bio, profile_picture, cover_photo, location, 
            website, occupation, interests, pronouns, created_at, private,
            (SELECT COUNT(*) FROM followers WHERE followed_id = users.id) AS follower_count,
            (SELECT COUNT(*) FROM followers WHERE follower_id = users.id) AS following_count,
            (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS post_count
     FROM users WHERE id = ?`,
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error('GET /api/users/me error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) return res.status(404).json({ error: 'User not found' });
      console.log('GET /api/users/me results:', results[0]);
      res.json(results[0]);
    }
  );
});

// Update current user's profile
router.put('/me', authMiddleware, upload.fields([
  { name: 'profile_picture', maxCount: 1 },
  { name: 'cover_photo', maxCount: 1 },
]), async (req, res) => {
  console.log('PUT /api/users/me:', { body: req.body, files: req.files, user: req.user });
  const {
    full_name, bio, location, website, occupation, interests, pronouns, private
  } = req.body;
  const profilePicture = req.files && req.files.profile_picture ? `/Uploads/${req.files.profile_picture[0].filename}` : null;
  const coverPhoto = req.files && req.files.cover_photo ? `/Uploads/${req.files.cover_photo[0].filename}` : null;

  // Delete old images if new ones are uploaded
  try {
    if (profilePicture || coverPhoto) {
      db.query('SELECT profile_picture, cover_photo FROM users WHERE id = ?', [req.user.id], async (err, results) => {
        if (err) {
          console.error('PUT /api/users/me fetch old images error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        const oldProfilePicture = results[0]?.profile_picture;
        const oldCoverPhoto = results[0]?.cover_photo;

        if (profilePicture && oldProfilePicture) {
          try {
            await fs.unlink(path.join(__dirname, '..', oldProfilePicture));
            console.log('PUT /api/users/me: Deleted old profile picture:', oldProfilePicture);
          } catch (e) {
            console.error('PUT /api/users/me: Failed to delete old profile picture:', e);
          }
        }
        if (coverPhoto && oldCoverPhoto) {
          try {
            await fs.unlink(path.join(__dirname, '..', oldCoverPhoto));
            console.log('PUT /api/users/me: Deleted old cover photo:', oldCoverPhoto);
          } catch (e) {
            console.error('PUT /api/users/me: Failed to delete old cover photo:', e);
          }
        }

        // Update database
        db.query(
          `UPDATE users SET 
            full_name = ?, 
            bio = ?, 
            profile_picture = COALESCE(?, profile_picture), 
            cover_photo = COALESCE(?, cover_photo), 
            location = ?, 
            website = ?, 
            occupation = ?, 
            interests = ?, 
            pronouns = ?, 
            private = ? 
           WHERE id = ?`,
          [
            full_name || null,
            bio || null,
            profilePicture,
            coverPhoto,
            location || null,
            website || null,
            occupation || null,
            interests || null,
            pronouns || null,
            private === 'true' || private === true ? 1 : 0,
            req.user.id
          ],
          (err, result) => {
            if (err) {
              console.error('PUT /api/users/me update error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            if (result.affectedRows === 0) {
              return res.status(404).json({ error: 'User not found' });
            }
            console.log('PUT /api/users/me: Profile updated successfully');
            res.json({ message: 'Profile updated successfully' });
          }
        );
      });
    } else {
      // No new images, update other fields
      db.query(
        `UPDATE users SET 
          full_name = ?, 
          bio = ?, 
          location = ?, 
          website = ?, 
          occupation = ?, 
          interests = ?, 
          pronouns = ?, 
          private = ? 
         WHERE id = ?`,
        [
          full_name || null,
          bio || null,
          location || null,
          website || null,
          occupation || null,
          interests || null,
          pronouns || null,
          private === 'true' || private === true ? 1 : 0,
          req.user.id
        ],
        (err, result) => {
          if (err) {
            console.error('PUT /api/users/me update error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
          }
          console.log('PUT /api/users/me: Profile updated successfully');
          res.json({ message: 'Profile updated successfully' });
        }
      );
    }
  } catch (e) {
    console.error('PUT /api/users/me error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Follow/unfollow a user
router.post('/follow/:userId', authMiddleware, (req, res) => {
  console.log('POST /api/users/follow/:userId:', { userId: req.params.userId, user: req.user });
  const { userId } = req.params;
  const followerId = req.user.id;

  if (parseInt(userId) === followerId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  db.query('SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?', [followerId, userId], (err, results) => {
    if (err) {
      console.error('POST /api/users/follow/:userId check error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length > 0) {
      db.query('DELETE FROM followers WHERE follower_id = ? AND followed_id = ?', [followerId, userId], (err) => {
        if (err) {
          console.error('POST /api/users/follow/:userId unfollow error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        console.log('POST /api/users/follow/:userId: Unfollowed');
        res.json({ message: 'Unfollowed successfully' });
      });
    } else {
      db.query('INSERT INTO followers (follower_id, followed_id) VALUES (?, ?)', [followerId, userId], (err) => {
        if (err) {
          console.error('POST /api/users/follow/:userId follow error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        console.log('POST /api/users/follow/:userId: Followed');
        res.json({ message: 'Followed successfully' });
      });
    }
  });
});

// Get follow status
router.get('/follow-status/:userId', authMiddleware, (req, res) => {
  console.log('GET /api/users/follow-status/:userId:', { userId: req.params.userId, user: req.user });
  const { userId } = req.params;
  const followerId = req.user.id;

  db.query('SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?', [followerId, userId], (err, results) => {
    if (err) {
      console.error('GET /api/users/follow-status/:userId error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('GET /api/users/follow-status/:userId results:', results);
    res.json({ isFollowing: results.length > 0 });
  });
});

// Search users by username
router.get('/search', (req, res) => {
  console.log('GET /api/users/search:', { query: req.query.query });
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Search query is required' });

  db.query(
    'SELECT id, username FROM users WHERE username LIKE ?',
    [`%${query}%`],
    (err, results) => {
      if (err) {
        console.error('GET /api/users/search error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log('GET /api/users/search results:', results);
      res.json(results);
    }
  );
});

// Get posts liked by a user (respect privacy)
router.get('/:username/liked-posts', authMiddleware, (req, res) => {
  console.log('GET /api/users/:username/liked-posts:', { username: req.params.username, user: req.user });
  const { username } = req.params;
  const currentUserId = req.user.id;

  db.query('SELECT id, private FROM users WHERE username = ?', [username], (err, userResults) => {
    if (err) {
      console.error('GET /api/users/:username/liked-posts user error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (userResults.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userResults[0];
    if (user.private && user.id !== currentUserId) {
      db.query('SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?', [currentUserId, user.id], (err, followResults) => {
        if (err) {
          console.error('GET /api/users/:username/liked-posts followers error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
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
          if (err) {
            console.error('GET /api/users/:username/liked-posts posts error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          console.log('GET /api/users/:username/liked-posts results:', results);
          res.json(results);
        }
      );
    }
  });
});

// Get user profile by username (respect privacy)
router.get('/:username', authMiddleware, (req, res) => {
  console.log('GET /api/users/:username:', { username: req.params.username, user: req.user });
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
      if (err) {
        console.error('GET /api/users/:username error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) return res.status(404).json({ error: 'User not found' });

      const user = results[0];
      if (user.private && currentUserId !== user.id) {
        db.query(
          'SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?',
          [currentUserId, user.id],
          (err, followerResults) => {
            if (err) {
              console.error('GET /api/users/:username followers error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            if (followerResults.length === 0) {
              return res.status(403).json({ error: 'This account is private' });
            }
            console.log('GET /api/users/:username results:', user);
            res.json(user);
          }
        );
      } else {
        console.log('GET /api/users/:username results:', user);
        res.json(user);
      }
    }
  );
});

module.exports = router;