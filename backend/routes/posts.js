const express = require('express');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
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
});

// Middleware to decode token (optional user)
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

// POST / - Create post (protected)
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  console.log('POST /api/posts:', { body: req.body, file: req.file, user: req.user });
  const { content } = req.body;
  const userId = req.user.id;
  const image_url = req.file ? `/Uploads/${req.file.filename}` : null;
  if (!content && !image_url) {
    return res.status(400).json({ error: 'Content or image is required' });
  }
  db.query(
    'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
    [userId, content || null, image_url],
    (err, result) => {
      if (err) {
        console.error('POST /api/posts error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      const postId = result.insertId;
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
            console.error('POST /api/posts fetch error:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          console.log('POST /api/posts: Emitting new_post:', postResults[0]);
          const io = req.app.get('io');
          io.emit('new_post', postResults[0]);
          res.status(201).json({ message: 'Post created successfully', postId });
        }
      );
    }
  );
});

// GET /user/:username/media
router.get('/user/:username/media', (req, res) => {
  console.log('GET /api/posts/user/:username/media:', { username: req.params.username, user: req.user });
  const { username } = req.params;
  const currentUserId = req.user ? req.user.id : null;
  db.query(
    'SELECT id, private FROM users WHERE username = ?',
    [username],
    (err, userResults) => {
      if (err) {
        console.error('GET /api/posts/user/:username/media user error:', err);
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
              console.error('GET /api/posts/user/:username/media followers error:', err);
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
          console.error('GET /api/posts/user/:username/media posts error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        console.log('GET /api/posts/user/:username/media results:', results);
        res.json(results);
      }
    );
  }
});

// GET /user/:username
router.get('/user/:username', (req, res) => {
  console.log('GET /api/posts/user/:username:', { username: req.params.username, user: req.user });
  const { username } = req.params;
  const currentUserId = req.user ? req.user.id : null;
  db.query(
    'SELECT id, private FROM users WHERE username = ?',
    [username],
    (err, userResults) => {
      if (err) {
        console.error('GET /api/posts/user/:username user error:', err);
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
              console.error('GET /api/posts/user/:username followers error:', err);
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
          console.error('GET /api/posts/user/:username posts error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        console.log('GET /api/posts/user/:username results:', results);
        res.json(results);
      }
    );
  }
});

// GET /:postId/like-status
router.get('/:postId/like-status', authMiddleware, (req, res) => {
  console.log('GET /api/posts/:postId/like-status:', { postId: req.params.postId, user: req.user });
  const { postId } = req.params;
  const userId = req.user.id;
  db.query(
    'SELECT * FROM likes WHERE user_id = ? AND post_id = ?',
    [userId, postId],
    (err, results) => {
      if (err) {
        console.error('GET /api/posts/:postId/like-status error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log('GET /api/posts/:postId/like-status results:', results);
      res.json({ isLiked: results.length > 0 });
    }
  );
});

// POST /:postId/comments
router.post('/:postId/comments', authMiddleware, (req, res) => {
  console.log('POST /api/posts/:postId/comments:', { postId: req.params.postId, body: req.body, user: req.user });
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
        console.error('POST /api/posts/:postId/comments post error:', err);
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
              console.error('POST /api/posts/:postId/comments followers error:', err);
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
          console.error('POST /api/posts/:postId/comments insert error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        console.log('POST /api/posts/:postId/comments: Comment created:', { commentId: result.insertId });
        res.status(201).json({ message: 'Comment created successfully', commentId: result.insertId });
      }
    );
  }
});

// POST /:postId/like
router.post('/:postId/like', authMiddleware, (req, res) => {
  console.log('POST /api/posts/:postId/like:', { postId: req.params.postId, user: req.user });
  const { postId } = req.params;
  const userId = req.user.id;
  db.query(
    'SELECT user_id, private FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = ?',
    [postId],
    (err, results) => {
      if (err) {
        console.error('POST /api/posts/:postId/like post error:', err);
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
              console.error('POST /api/posts/:postId/like followers error:', err);
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
          console.error('POST /api/posts/:postId/like check error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        if (results.length > 0) {
          db.query(
            'DELETE FROM likes WHERE user_id = ? AND post_id = ?',
            [userId, postId],
            (err) => {
              if (err) {
                console.error('POST /api/posts/:postId/like delete error:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              console.log('POST /api/posts/:postId/like: Unliked');
              res.json({ message: 'Unliked successfully' });
            }
          );
        } else {
          db.query(
            'INSERT INTO likes (user_id, post_id) VALUES (?, ?)',
            [userId, postId],
            (err) => {
              if (err) {
                console.error('POST /api/posts/:postId/like insert error:', err);
                return res.status(500).json({ error: 'Database error' });
              }
              console.log('POST /api/posts/:postId/like: Liked');
              res.json({ message: 'Liked successfully' });
            }
          );
        }
      }
    );
  }
});

// GET /:postId
router.get('/:postId', (req, res) => {
  console.log('GET /api/posts/:postId:', { postId: req.params.postId, user: req.user });
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
        console.error('GET /api/posts/:postId post error:', err);
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
              console.error('GET /api/posts/:postId followers error:', err);
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
              console.error('GET /api/posts/:postId comments error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            console.log('GET /api/posts/:postId results:', { post: postResults[0], comments: commentResults });
            res.json({ post: postResults[0], comments: commentResults });
          }
        );
      }
    }
  );
});

// GET / - All posts
router.get('/', async (req, res) => {
  console.log('GET /api/posts:', { user: req.user });
  const currentUserId = req.user ? req.user.id : null;
  try {
    const results = await new Promise((resolve, reject) => {
      db.query(
        `SELECT posts.id, posts.content, posts.image_url, posts.created_at, users.username,
                (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) AS like_count,
                users.private, users.id AS user_id
         FROM posts
         JOIN users ON posts.user_id = users.id
         ORDER BY posts.created_at DESC`,
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });

    const filteredPosts = await Promise.all(
      results.map(async (post) => {
        if (!post.private || (currentUserId && post.user_id === currentUserId)) {
          return post;
        }
        if (post.private && currentUserId) {
          const followerResults = await new Promise((resolve, reject) => {
            db.query(
              'SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?',
              [currentUserId, post.user_id],
              (err, results) => {
                if (err) reject(err);
                else resolve(results);
              }
            );
          });
          return followerResults.length > 0 ? post : null;
        }
        return null;
      })
    );

    const finalPosts = filteredPosts.filter((post) => post !== null);
    console.log('GET /api/posts results:', finalPosts);
    res.json(finalPosts);
  } catch (err) {
    console.error('GET /api/posts error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;