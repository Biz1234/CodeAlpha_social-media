

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import CommentForm from './CommentForm';
import Comment from './Comment';

function Post({ post }) {
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (showComments) {
      axios
        .get(`http://localhost:5000/api/posts/${post.id}`)
        .then((response) => setComments(response.data.comments))
        .catch((err) => console.error(err));
    }
  }, [showComments, post.id]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-4">
      <Link to={`/profile/${post.username}`} className="font-bold">
        @{post.username}
      </Link>
      <p className="mt-2">{post.content}</p>
      <p className="text-sm text-gray-500">
        {new Date(post.created_at).toLocaleString()}
      </p>
      <button
        onClick={() => setShowComments(!showComments)}
        className="mt-2 text-blue-500 hover:underline"
      >
        {showComments ? 'Hide Comments' : 'Show Comments'}
      </button>
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
