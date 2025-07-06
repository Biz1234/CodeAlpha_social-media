


import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

function CommentForm({ postId, setComments }) {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to comment');
      return;
    }
    try {
      await axios.post(
        `http://localhost:5000/api/posts/${postId}/comments`,
        { content },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setContent('');
      // Refresh comments
      axios
        .get(`http://localhost:5000/api/posts/${postId}`)
        .then((response) => setComments(response.data.comments))
        .catch((err) => console.error(err));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create comment');
    }
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-2 border rounded-md"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Comment
        </button>
      </form>
    </div>
  );
}

export default CommentForm;
