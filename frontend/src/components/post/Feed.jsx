
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Post from './Post';

function Feed({ username, isMedia, isLikedPosts }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url = 'http://localhost:5000/api/posts';
    if (username) {
      url = isMedia
        ? `http://localhost:5000/api/posts/user/${username}/media`
        : isLikedPosts
        ? `http://localhost:5000/api/users/${username}/liked-posts`
        : `http://localhost:5000/api/posts/user/${username}`;
    }
    axios
      .get(url, {
        headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {},
      })
      .then((response) => {
        setPosts(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load posts');
        setLoading(false);
      });
  }, [username, isMedia, isLikedPosts, user]);

  // Poll for new posts every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      let url = 'http://localhost:5000/api/posts';
      if (username) {
        url = isMedia
          ? `http://localhost:5000/api/posts/user/${username}/media`
          : isLikedPosts
          ? `http://localhost:5000/api/users/${username}/liked-posts`
          : `http://localhost:5000/api/posts/user/${username}`;
      }
      axios
        .get(url, {
          headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {},
        })
        .then((response) => {
          setPosts(response.data);
        })
        .catch((err) => {
          console.error(err);
        });
    }, 10000);
    return () => clearInterval(interval);
  }, [username, isMedia, isLikedPosts, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!newPost && !imageUrl) {
      setError('Post content or image is required');
      return;
    }
    try {
      await axios.post(
        'http://localhost:5000/api/posts',
        { content: newPost, image_url: imageUrl },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setNewPost('');
      setImageUrl('');
      setError('');
      const response = await axios.get('http://localhost:5000/api/posts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setPosts(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post');
    }
  };

  if (loading) return <div className="text-center mt-10 text-gray-600">Loading...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto">
      {!username && !isLikedPosts && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 rounded-lg shadow-md">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="w-full p-2 mt-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-500 mt-2">{error}</p>}
          <button
            type="submit"
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition duration-200"
          >
            Post
          </button>
        </form>
      )}
      {posts.length === 0 ? (
        <p className="text-gray-500 text-center">No posts to display</p>
      ) : (
        posts.map((post) => <Post key={post.id} post={post} />)
      )}
    </div>
  );
}

export default Feed;
