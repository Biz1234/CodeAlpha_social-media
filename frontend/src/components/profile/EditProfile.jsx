import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

function EditProfile() {
  const { user, refreshProfile } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    location: '',
    website: '',
    occupation: '',
    interests: '',
    pronouns: '',
    private: false,
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    console.log('EditProfile: Fetching profile for user:', user.username);
    axios
      .get('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      .then((response) => {
        console.log('EditProfile: Profile fetched:', response.data);
        setFormData({
          full_name: response.data.full_name || '',
          bio: response.data.bio || '',
          location: response.data.location || '',
          website: response.data.website || '',
          occupation: response.data.occupation || '',
          interests: response.data.interests || '',
          pronouns: response.data.pronouns || '',
          private: response.data.private || false,
        });
        setLoading(false);
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.error || 'Failed to load profile';
        console.error('EditProfile: Fetch error:', err.response?.data, err.response?.status, err.message);
        setError(errorMsg);
        setLoading(false);
      });
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (name === 'profile_picture') {
      setProfilePicture(files[0]);
    } else if (name === 'cover_photo') {
      setCoverPhoto(files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      data.append(key, formData[key]);
    });
    if (profilePicture) data.append('profile_picture', profilePicture);
    if (coverPhoto) data.append('cover_photo', coverPhoto);

    try {
      console.log('EditProfile: Submitting profile update:', formData, { profilePicture, coverPhoto });
      await axios.put('http://localhost:5000/api/users/me', data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('EditProfile: Profile updated successfully');
      await refreshProfile(); // Refresh user profile in AuthContext
      setError('');
      navigate(`/profile/${user.username}`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update profile';
      console.error('EditProfile: Update error:', err.response?.data, err.response?.status, err.message);
      setError(errorMsg);
    }
  };

  if (loading) return <div className="text-center mt-10 text-gray-600">Loading...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Profile</h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
        <div>
          <label className="block text-gray-700 font-semibold">Full Name</label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your full name"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold">Bio</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tell us about yourself"
            rows="4"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold">Profile Picture</label>
          <input
            type="file"
            name="profile_picture"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold">Cover Photo</label>
          <input
            type="file"
            name="cover_photo"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your location"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold">Website</label>
          <input
            type="text"
            name="website"
            value={formData.website}
            onChange={handleChange}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your website"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold">Occupation</label>
          <input
            type="text"
            name="occupation"
            value={formData.occupation}
            onChange={handleChange}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your occupation"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold">Interests</label>
          <input
            type="text"
            name="interests"
            value={formData.interests}
            onChange={handleChange}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your interests"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold">Pronouns</label>
          <input
            type="text"
            name="pronouns"
            value={formData.pronouns}
            onChange={handleChange}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your pronouns"
          />
        </div>
        <div>
          <label className="flex items-center space-x-2 text-gray-700">
            <input
              type="checkbox"
              name="private"
              checked={formData.private}
              onChange={handleChange}
              className="h-4 w-4 text-blue-500 focus:ring-blue-500"
            />
            <span>Private Account (visible only to followers)</span>
          </label>
        </div>
        {error && <p className="text-red-500">{error}</p>}
        <div className="flex space-x-4">
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-600 transition duration-200"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => navigate(`/profile/${user.username}`)}
            className="bg-gray-200 text-gray-600 px-4 py-2 rounded-full font-semibold hover:bg-gray-300 transition duration-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProfile;