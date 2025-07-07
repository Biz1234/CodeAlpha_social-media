
import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Feed from '../post/Feed';

function Profile() {
  const { username } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [privateStatus, setPrivateStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/users/${username}`, {
        headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {},
      })
      .then((response) => {
        setProfile(response.data);
        setPrivateStatus(response.data.private);
        if (user && user.username !== username) {
          axios
            .get(`http://localhost:5000/api/users/follow-status/${response.data.id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            })
            .then((res) => setIsFollowing(res.data.isFollowing))
            .catch(() => setIsFollowing(false));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load profile');
        setLoading(false);
      });
  }, [username, user]);

  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await axios.post(
        `http://localhost:5000/api/users/follow/${profile.id}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setIsFollowing(!isFollowing);
      axios.get(`http://localhost:5000/api/users/${username}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then((response) => setProfile(response.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update follow status');
    }
  };

  const handleTogglePrivate = async () => {
    if (!user || user.username !== username) return;
    try {
      await axios.put(
        'http://localhost:5000/api/users/me',
        { private: !privateStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPrivateStatus(!privateStatus);
      setProfile({ ...profile, private: !privateStatus });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update privacy setting');
    }
  };

  if (loading) return <div className="text-center mt-10 text-gray-600">Loading...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10">
      {/* Cover Photo */}
      <div className="h-48 bg-gray-200">
        <img
          src={profile.cover_photo || 'https://picsum.photos/1200/200'}
          alt="Cover"
          className="w-full h-full object-cover rounded-t-lg"
        />
      </div>
      {/* Profile Info */}
      <div className="relative bg-white rounded-b-lg shadow-md -mt-16 mx-4 p-6">
        <div className="flex items-center space-x-4">
          <img
            src={profile.profile_picture || 'https://picsum.photos/150'}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-white"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold text-gray-800">@{profile.username}</h2>
              {profile.private && (
                <span className="text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                  Private Account
                </span>
              )}
            </div>
            {profile.full_name && <p className="text-lg text-gray-600">{profile.full_name}</p>}
            <p className="text-gray-500">{profile.bio || 'No bio available'}</p>
          </div>
        </div>
        {/* Privacy Toggle and Buttons */}
        <div className="mt-4 flex items-center space-x-4">
          {user && user.username === profile.username && (
            <label className="flex items-center space-x-2 text-gray-700">
              <input
                type="checkbox"
                checked={privateStatus}
                onChange={handleTogglePrivate}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500"
              />
              <span>Private Account</span>
            </label>
          )}
          {user && user.username !== profile.username && (
            <>
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-full font-semibold ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } transition duration-200`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
              <button
                onClick={() => navigate(`/messages?userId=${profile.id}`)}
                className="text-blue-500 hover:text-blue-600 transition duration-200"
                title="Send Message"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </>
          )}
          {user && user.username === profile.username && (
            <button
              onClick={() => navigate('/edit-profile')}
              className="px-4 py-2 bg-gray-200 text-gray-600 rounded-full font-semibold hover:bg-gray-300 transition duration-200"
            >
              Edit Profile
            </button>
          )}
          <div className="text-sm text-gray-500">
            <span>{profile.follower_count} Followers</span> |{' '}
            <span>{profile.following_count} Following</span> |{' '}
            <span>{profile.post_count || 0} Posts</span>
          </div>
        </div>
        {/* Additional Info */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
          {profile.location && (
            <p>
              <strong>Location:</strong> {profile.location}
            </p>
          )}
          {profile.website && (
            <p>
              <strong>Website:</strong>{' '}
              <a href={profile.website} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
                {profile.website}
              </a>
            </p>
          )}
          {profile.occupation && (
            <p>
              <strong>Occupation:</strong> {profile.occupation}
            </p>
          )}
          {profile.interests && (
            <p>
              <strong>Interests:</strong> {profile.interests}
            </p>
          )}
          {profile.pronouns && (
            <p>
              <strong>Pronouns:</strong> {profile.pronouns}
            </p>
          )}
        </div>
        {/* Tabs */}
        {(!profile.private || (user && (user.username === profile.username || isFollowing))) ? (
          <div className="mt-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`px-4 py-2 border-b-2 font-semibold ${
                    activeTab === 'posts' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-blue-500'
                  } transition duration-200`}
                >
                  Posts
                </button>
                <button
                  onClick={() => setActiveTab('media')}
                  className={`px-4 py-2 border-b-2 font-semibold ${
                    activeTab === 'media' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-blue-500'
                  } transition duration-200`}
                >
                  Media
                </button>
                <button
                  onClick={() => setActiveTab('likes')}
                  className={`px-4 py-2 border-b-2 font-semibold ${
                    activeTab === 'likes' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-blue-500'
                  } transition duration-200`}
                >
                  Likes
                </button>
              </nav>
            </div>
            <div className="mt-4">
              {activeTab === 'posts' && <Feed username={profile.username} />}
              {activeTab === 'media' && <Feed username={profile.username} isMedia />}
              {activeTab === 'likes' && <Feed username={profile.username} isLikedPosts />}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-gray-500 text-center">
            This account is private. Follow to see their posts.
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
