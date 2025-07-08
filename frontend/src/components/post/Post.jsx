import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import CommentForm from './CommentForm';
import Comment from './Comment';

function Post({ post }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [animateLike, setAnimateLike] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      axios
        .get(`http://localhost:5000/api/posts/${post.id}/like-status`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        .then((response) => {
          console.log('Post: Like status fetched:', response.data);
          setIsLiked(response.data.isLiked);
        })
        .catch((err) => {
          console.error('Post: Like status error:', err.response?.data?.error, err.response?.status);
          setError('Failed to load like status');
        });
    }
    if (showComments) {
      axios
        .get(`http://localhost:5000/api/posts/${post.id}`)
        .then((response) => {
          console.log('Post: Comments fetched:', response.data.comments);
          setComments(response.data.comments || []);
        })
        .catch((err) => {
          console.error('Post: Comments fetch error:', err.response?.data?.error, err.response?.status);
          setError('Failed to fetch comments');
        });
    }
  }, [showComments, post.id, user]);

  const handleLike = async () => {
    if (!user) {
      setError('You must be logged in to like posts');
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(
        `http://localhost:5000/api/posts/${post.id}/like`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      console.log('Post: Like updated:', response.data);
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
      setAnimateLike(true);
      setTimeout(() => setAnimateLike(false), 300);
      setError('');
    } catch (err) {
      console.error('Post: Like error:', err.response?.data?.error, err.response?.status);
      setError('Failed to update like');
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-4">
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <Link to={`/profile/${post.username}`} className="font-bold text-blue-600 hover:underline">
        @{post.username}
      </Link>
      <p className="mt-2 text-gray-800">{post.content}</p>
      {post.image_url && (
        <img
          src={`http://localhost:5000${post.image_url}`}
          alt="Post media"
          className="mt-2 w-full h-64 object-cover rounded-md"
        />
      )}
      <p className="text-sm text-gray-500 mt-2">
        {new Date(post.created_at).toLocaleString()}
      </p>
      <div className="mt-2 flex items-center space-x-4">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-1 ${
            isLiked ? 'text-red-500' : 'text-gray-500'
          } hover:text-red-600 transition duration-200 ${animateLike ? 'scale-125' : ''}`}
        >
          <svg
            className="w-5 h-5"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span>{likeCount} Likes</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-blue-500 hover:underline"
        >
          {showComments ? 'Hide Comments' : 'Show Comments'}
        </button>
      </div>
      {showComments && (
        <div className="mt-4">
          <CommentForm postId={post.id} setComments={setComments} />
          {comments.map((comment) => (
            <Comment key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Post;