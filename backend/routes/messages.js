

const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Send a message (protected)
router.post('/', authMiddleware, (req, res) => {
  const { recipient_id, content } = req.body;
  const sender_id = req.user.id;

  if (!recipient_id || !content) {
    return res.status(400).json({ error: 'Recipient ID and content are required' });
  }

  if (recipient_id === sender_id) {
    return res.status(400).json({ error: 'Cannot send message to yourself' });
  }

  db.query(
    'INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)',
    [sender_id, recipient_id, content],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ message: 'Message sent successfully', messageId: result.insertId });
    }
  );
});

// Get conversations (protected)
router.get('/conversations', authMiddleware, (req, res) => {
  const userId = req.user.id;
  db.query(
    `SELECT DISTINCT u.id, u.username
     FROM users u
     WHERE u.id IN (
       SELECT sender_id FROM messages WHERE recipient_id = ?
       UNION
       SELECT recipient_id FROM messages WHERE sender_id = ?
     )
     ORDER BY u.username`,
    [userId, userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    }
  );
});

// Get messages with a specific user (protected)
router.get('/:userId', authMiddleware, (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;

  db.query(
    `SELECT m.id, m.sender_id, m.recipient_id, m.content, m.created_at, u.username
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE (m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)
     ORDER BY m.created_at ASC`,
    [currentUserId, userId, userId, currentUserId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(results);
    }
  );
});

module.exports = router;
