
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/users/${username}`)
      .then((response) => {
        setProfile(response.data);
        if (user) {
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
      // Refresh profile to update counts
      axios.get(`http://localhost:5000/api/users/${username}`).then((response) => setProfile(response.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update follow status');
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10">
      {/* Cover Photo */}
      <div className="h-48 bg-gray-200">
        <img
          src={profile.cover_photo || 'https://via.placeholder.com/1200x200'}
          alt="Cover"
          className="w-full h-full object-cover"
        />
      </div>
      {/* Profile Info */}
      <div className="relative bg-white rounded-lg shadow-md -mt-16 mx-4 p-6">
        <div className="flex items-center space-x-4">
          <img
            src={profile.profile_picture || 'https://via.placeholder.com/150'}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-white"
          />
          <div>
            <h2 className="text-2xl font-bold">@{profile.username}</h2>
            {profile.full_name && <p className="text-lg">{profile.full_name}</p>}
            <p className="text-gray-600">{profile.bio || 'No bio available'}</p>
          </div>
        </div>
        {/* Follow Button and Counts */}
        <div className="mt-4 flex items-center space-x-4">
          {user && user.username !== profile.username && (
            <button
              onClick={handleFollow}
              className={`px-4 py-2 rounded-md ${
                isFollowing ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
          {user && user.username === profile.username && (
            <button
              onClick={() => navigate('/edit-profile')}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
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
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profile.location && (
            <p>
              <strong>Location:</strong> {profile.location}
            </p>
          )}
          {profile.website && (
            <p>
              <strong>Website:</strong>{' '}
              <a href={profile.website} className="text-blue-500" target="_blank" rel="noopener noreferrer">
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
        <div className="mt-6">
          <div className="border-b">
            <nav className="-mb-px flex">
              <button className="px-4 py-2 border-b-2 border-blue-500 text-blue-500">
                Posts
              </button>
            </nav>
          </div>
          <div className="mt-4">
            <Feed username={profile.username} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
