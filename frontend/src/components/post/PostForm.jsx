


import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

function PostForm() {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to post');
      return;
    }
    try {
      await axios.post(
        'http://localhost:5000/api/posts',
        { content },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setContent('');
      window.location.reload(); // Refresh to show new post
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 p-4 bg-white rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-2 border rounded-md"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Post
        </button>
      </form>
    </div>
  );
}

export default PostForm;
