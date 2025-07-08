import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function PostForm() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !localStorage.getItem('token')) {
      setError('You must be logged in to post');
      navigate('/login');
      return;
    }
    if (!content && !image) {
      setError('Post content or image is required');
      return;
    }
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (image) formData.append('image', image);
    try {
      const response = await axios.post('http://localhost:5000/api/posts', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      console.log('PostForm: Post created:', response.data, 'Status:', response.status);
      setContent('');
      setImage(null);
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to create post';
      console.error('PostForm: Post error:', err.response?.data, err.response?.status, err.message);
      setError(errorMsg);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 p-4 bg-white rounded-lg shadow-md">
      <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) => setImage(e.target.files[0])}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition duration-200"
        >
          Post
        </button>
      </form>
    </div>
  );
}

export default PostForm;