
const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Create a post (protected)
router.post('/', authMiddleware, (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  db.query(
    'INSERT INTO posts (user_id, content) VALUES (?, ?)',
    [userId, content],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ message: 'Post created successfully', postId: result.insertId });
    }
  );
});

// Get all posts (public)
router.get('/', (req, res) => {
  db.query(
    `SELECT posts.id, posts.content, posts.created_at, users.username
     FROM posts
     JOIN users ON posts.user_id = users.id
     ORDER BY posts.created_at DESC`,
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    }
  );
});

// Get all posts by a user (public)
router.get('/user/:username', (req, res) => {
  const { username } = req.params;
  db.query(
    `SELECT posts.id, posts.content, posts.created_at, users.username
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
});

// Get a single post with comments (public)
router.get('/:postId', (req, res) => {
  const { postId } = req.params;
  db.query(
    `SELECT posts.id, posts.content, posts.created_at, users.username
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
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
    [postId, userId, content],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ message: 'Comment created successfully', commentId: result.insertId });
    }
  );
});

module.exports = router;
