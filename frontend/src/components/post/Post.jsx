
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

  useEffect(() => {
    if (user) {
      axios
        .get(`http://localhost:5000/api/posts/${post.id}/like-status`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        .then((response) => setIsLiked(response.data.isLiked))
        .catch((err) => console.error(err));
    }
    if (showComments) {
      axios
        .get(`http://localhost:5000/api/posts/${post.id}`)
        .then((response) => setComments(response.data.comments))
        .catch((err) => console.error(err));
    }
  }, [showComments, post.id, user]);

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await axios.post(
        `http://localhost:5000/api/posts/${post.id}/like`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-4">
      <Link to={`/profile/${post.username}`} className="font-bold">
        @{post.username}
      </Link>
      <p className="mt-2">{post.content}</p>
      <p className="text-sm text-gray-500">
        {new Date(post.created_at).toLocaleString()}
      </p>
      <div className="mt-2 flex items-center space-x-4">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-1 ${
            isLiked ? 'text-red-500' : 'text-gray-500'
          } hover:text-red-600`}
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
