

import { Link } from 'react-router-dom';

function Comment({ comment }) {
  return (
    <div className="p-2 bg-gray-100 rounded-md mb-2">
      <Link to={`/profile/${comment.username}`} className="font-bold">
        @{comment.username}
      </Link>
      <p>{comment.content}</p>
      <p className="text-sm text-gray-500">
        {new Date(comment.created_at).toLocaleString()}
      </p>
    </div>
  );
}

export default Comment;
