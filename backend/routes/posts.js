
const express = require('express');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Optional auth parser to access req.user even on public routes
router.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch {
      req.user = null;
    }
  }
  next();
});

// Create a post (protected)
router.post('/', authMiddleware, (req, res) => {
  const { content, image_url } = req.body;
  const userId = req.user.id;

  if (!content && !image_url) {
    return res.status(400).json({ error: 'Content or image is required' });
  }

  db.query(
    'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
    [userId, content || null, image_url || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.status(201).json({ message: 'Post created successfully', postId: result.insertId });
    }
  );
});

// Get all posts (public or filtered by auth/follow)
router.get('/', (req, res) => {
  const currentUserId = req.user?.id || null;

  db.query(
    `SELECT posts.id, posts.content, posts.image_url, posts.created_at, users.username,
            (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) AS like_count,
            users.private, users.id AS user_id
     FROM posts
     JOIN users ON posts.user_id = users.id
     ORDER BY posts.created_at DESC`,
    async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      const filtered = await Promise.all(results.map(post => {
        return new Promise((resolve) => {
          if (!post.private || (currentUserId && post.user_id === currentUserId)) {
            return resolve(post);
          }
          db.query(
            'SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?',
            [currentUserId, post.user_id],
            (err, followers) => {
              if (!err && followers.length > 0) {
                resolve(post);
              } else {
                resolve(null);
              }
            }
          );
        });
      }));

      res.json(filtered.filter(Boolean)); // Remove nulls
    }
  );
});

// Get all posts by a user (public or restricted)
router.get('/user/:username', (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user ? req.user.id : null;

  db.query(
    'SELECT id, private FROM users WHERE username = ?',
    [username],
    (err, userResults) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (userResults.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = userResults[0];
      if (user.private && (!currentUserId || currentUserId !== user.id)) {
        db.query(
          'SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?',
          [currentUserId, user.id],
          (err, followerResults) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            if (followerResults.length === 0) {
              return res.status(403).json({ error: 'This account is private' });
            }
            fetchUserPosts();
          }
        );
      } else {
        fetchUserPosts();
      }
    }
  );

  function fetchUserPosts() {
    db.query(
      `SELECT posts.id, posts.content, posts.image_url, posts.created_at, users.username,
              (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) AS like_count
       FROM posts
       JOIN users ON posts.user_id = users.id
       WHERE users.username = ?
       ORDER BY posts.created_at DESC`,
      [username],
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
      }
    );
  }
});

// Get posts with images by a user (public or restricted)
router.get('/user/:username/media', (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user ? req.user.id : null;

  db.query(
    'SELECT id, private FROM users WHERE username = ?',
    [username],
    (err, userResults) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (userResults.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = userResults[0];
      if (user.private && (!currentUserId || currentUserId !== user.id)) {
        db.query(
          'SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?',
          [currentUserId, user.id],
          (err, followerResults) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            if (followerResults.length === 0) {
              return res.status(403).json({ error: 'This account is private' });
            }
            fetchMediaPosts();
          }
        );
      } else {
        fetchMediaPosts();
      }
    }
  );

  function fetchMediaPosts() {
    db.query(
      `SELECT posts.id, posts.content, posts.image_url, posts.created_at, users.username,
              (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) AS like_count
       FROM posts
       JOIN users ON posts.user_id = users.id
       WHERE users.username = ? AND posts.image_url IS NOT NULL
       ORDER BY posts.created_at DESC`,
      [username],
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
      }
    );
  }
});

// Get a single post with comments (public or restricted)
router.get('/:postId', (req, res) => {
  const { postId } = req.params;
  const currentUserId = req.user ? req.user.id : null;

  db.query(
    `SELECT posts.id, posts.content, posts.image_url, posts.created_at, users.username,
            (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) AS like_count,
            users.private, users.id AS user_id
     FROM posts
     JOIN users ON posts.user_id = users.id
     WHERE posts.id = ?`,
    [postId],
    (err, postResults) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (postResults.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      const post = postResults[0];
      if (post.private && (!currentUserId || currentUserId !== post.user_id)) {
        db.query(
          'SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?',
          [currentUserId, post.user_id],
          (err, followerResults) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            if (followerResults.length === 0) {
              return res.status(403).json({ error: 'This account is private' });
            }
            fetchPostComments();
          }
        );
      } else {
        fetchPostComments();
      }

      function fetchPostComments() {
        db.query(
          `SELECT comments.id, comments.content, comments.created_at, users.username
           FROM comments
           JOIN users ON comments.user_id = users.id
           WHERE comments.post_id = ?
           ORDER BY comments.created_at ASC`,
          [postId],
          (err, commentResults) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            res.json({ post: postResults[0], comments: commentResults });
          }
        );
      }
    }
  );
});

// Create a comment (protected)
router.post('/:postId/comments', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  db.query(
    'SELECT user_id, private FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = ?',
    [postId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      const post = results[0];
      if (post.private && post.user_id !== userId) {
        db.query(
          'SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?',
          [userId, post.user_id],
          (err, followerResults) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            if (followerResults.length === 0) {
              return res.status(403).json({ error: 'Cannot comment on private account\'s post' });
            }
            createComment();
          }
        );
      } else {
        createComment();
      }
    }
  );

  function createComment() {
    db.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, userId, content],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'Comment created successfully', commentId: result.insertId });
      }
    );
  }
});

// Like or unlike a post (protected)
router.post('/:postId/like', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  db.query(
    'SELECT user_id, private FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = ?',
    [postId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      const post = results[0];
      if (post.private && post.user_id !== userId) {
        db.query(
          'SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?',
          [userId, post.user_id],
          (err, followerResults) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            if (followerResults.length === 0) {
              return res.status(403).json({ error: 'Cannot like private account\'s post' });
            }
            toggleLike();
          }
        );
      } else {
        toggleLike();
      }
    }
  );

  function toggleLike() {
    db.query(
      'SELECT * FROM likes WHERE user_id = ? AND post_id = ?',
      [userId, postId],
      (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (results.length > 0) {
          db.query(
            'DELETE FROM likes WHERE user_id = ? AND post_id = ?',
            [userId, postId],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              res.json({ message: 'Unliked successfully' });
            }
          );
        } else {
          db.query(
            'INSERT INTO likes (user_id, post_id) VALUES (?, ?)',
            [userId, postId],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              res.json({ message: 'Liked successfully' });
            }
          );
        }
      }
    );
  }
});

// Get like status for a post (protected)
router.get('/:postId/like-status', authMiddleware, (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  db.query(
    'SELECT * FROM likes WHERE user_id = ? AND post_id = ?',
    [userId, postId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ isLiked: results.length > 0 });
    }
  );
});

module.exports = router;
