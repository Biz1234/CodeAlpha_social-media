
import { useState, useEffect } from 'react';
import axios from 'axios';
import Post from './Post';

function Feed({ username, isLikedPosts }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = isLikedPosts
      ? `http://localhost:5000/api/users/${username}/liked-posts`
      : username
      ? `http://localhost:5000/api/posts/user/${username}`
      : 'http://localhost:5000/api/posts';
    axios
      .get(url)
      .then((response) => {
        setPosts(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load posts');
        setLoading(false);
      });
  }, [username, isLikedPosts]);

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;

  return (
    <div>
      {posts.length === 0 ? (
        <p className="text-gray-500">{isLikedPosts ? 'No liked posts' : 'No posts yet'}</p>
      ) : (
        posts.map((post) => <Post key={post.id} post={post} />)
      )}
    </div>
  );
}

export default Feed;
