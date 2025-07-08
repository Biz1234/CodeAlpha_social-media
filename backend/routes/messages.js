const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Send a message (protected)
router.post('/', authMiddleware, (req, res) => {
  console.log('POST /api/messages:', { body: req.body, user: req.user });
  const { recipient_id, content } = req.body;
  const sender_id = req.user.id;

  if (!recipient_id || !content) {
    return res.status(400).json({ error: 'Recipient ID and content are required' });
  }

  if (recipient_id === sender_id) {
    return res.status(400).json({ error: 'Cannot send message to yourself' });
  }

  db.query(
    'SELECT private FROM users WHERE id = ?',
    [recipient_id],
    (err, results) => {
      if (err) {
        console.error('POST /api/messages user error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Recipient not found' });
      }
      if (results[0].private) {
        db.query(
          'SELECT * FROM followers WHERE follower_id = ? AND followed_id = ?',
          [sender_id, recipient_id],
          (err, followerResults) => {
            if (err) {
              console.error('POST /api/messages followers error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            if (followerResults.length === 0) {
              return res.status(403).json({ error: 'Cannot message private account unless following' });
            }
            sendMessage();
          }
        );
      } else {
        sendMessage();
      }
    }
  );

  function sendMessage() {
    db.query(
      'INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)',
      [sender_id, recipient_id, content],
      (err, result) => {
        if (err) {
          console.error('POST /api/messages insert error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        // Fetch the new message
        db.query(
          `SELECT m.id, m.sender_id, m.recipient_id, m.content, m.created_at, u.username
           FROM messages m
           JOIN users u ON u.id = m.sender_id
           WHERE m.id = ?`,
          [result.insertId],
          (err, messageResults) => {
            if (err) {
              console.error('POST /api/messages fetch error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            const io = req.io; // Use req.io from middleware
            if (io) {
              console.log('POST /api/messages: Emitting new_message:', messageResults[0]);
              io.to(`user_${sender_id}`).emit('new_message', messageResults[0]);
              io.to(`user_${recipient_id}`).emit('new_message', messageResults[0]);
            } else {
              console.error('POST /api/messages: Socket.IO instance not available');
            }
            res.status(201).json({ message: 'Message sent successfully', messageId: result.insertId });
          }
        );
      }
    );
  }
});

// Get conversations (protected)
router.get('/conversations', authMiddleware, (req, res) => {
  console.log('GET /api/messages/conversations:', { user: req.user });
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
        console.error('GET /api/messages/conversations error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log('GET /api/messages/conversations results:', results);
      res.json(results);
    }
  );
});

// Get messages with a specific user (protected)
router.get('/:userId', authMiddleware, (req, res) => {
  console.log('GET /api/messages/:userId:', { userId: req.params.userId, user: req.user });
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
        console.error('GET /api/messages/:userId error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log('GET /api/messages/:userId results:', results);
      res.json(results);
    }
  );
});

module.exports = router;