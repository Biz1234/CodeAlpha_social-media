
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

function Messages() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Handle userId from query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get('userId');
    if (userId && user) {
      axios
        .get(`http://localhost:5000/api/users/search?query=${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        .then((response) => {
          const targetUser = response.data.find((u) => u.id === parseInt(userId));
          if (targetUser) {
            setSelectedUser(targetUser);
          }
        })
        .catch((err) => {
          setError(err.response?.data?.error || 'Failed to load user');
        });
    }
  }, [location, user]);

  // Fetch conversations
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    axios
      .get('http://localhost:5000/api/messages/conversations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      .then((response) => {
        setConversations(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load conversations');
        setLoading(false);
      });
  }, [user, navigate]);

  // Fetch messages for selected user
  useEffect(() => {
    if (selectedUser) {
      axios
        .get(`http://localhost:5000/api/messages/${selectedUser.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        .then((response) => {
          setMessages(response.data);
        })
        .catch((err) => {
          setError(err.response?.data?.error || 'Failed to load messages');
        });
    }
  }, [selectedUser]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    if (selectedUser) {
      const interval = setInterval(() => {
        axios
          .get(`http://localhost:5000/api/messages/${selectedUser.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          })
          .then((response) => {
            setMessages(response.data);
          })
          .catch((err) => {
            console.error(err);
          });
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  // Search for users
  useEffect(() => {
    if (searchQuery.trim()) {
      axios
        .get(`http://localhost:5000/api/users/search?query=${searchQuery}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        .then((response) => {
          setSearchResults(response.data.filter((u) => u.id !== user.id));
        })
        .catch((err) => {
          setError(err.response?.data?.error || 'Failed to search users');
        });
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      setError('Message cannot be empty');
      return;
    }
    try {
      await axios.post(
        'http://localhost:5000/api/messages',
        { recipient_id: selectedUser.id, content: newMessage },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setNewMessage('');
      // Refresh messages
      const response = await axios.get(`http://localhost:5000/api/messages/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMessages(response.data);
      // Refresh conversations
      const convResponse = await axios.get('http://localhost:5000/api/messages/conversations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setConversations(convResponse.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
    }
  };

  if (loading) return <div className="text-center mt-10 text-gray-600">Loading...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10 flex space-x-4">
      {/* Conversation List */}
      <div className="w-1/3 bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Conversations</h2>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full p-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchResults.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-600">Search Results</h3>
            {searchResults.map((u) => (
              <div
                key={u.id}
                onClick={() => {
                  setSelectedUser(u);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 rounded-md cursor-pointer hover:bg-gray-100"
              >
                <p className="font-semibold text-blue-600">@{u.username}</p>
              </div>
            ))}
          </div>
        )}
        {conversations.length === 0 && !searchQuery ? (
          <p className="text-gray-500">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedUser(conv)}
              className={`p-2 rounded-md cursor-pointer ${
                selectedUser?.id === conv.id ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
            >
              <p className="font-semibold text-blue-600">@{conv.username}</p>
            </div>
          ))
        )}
      </div>
      {/* Chat Window */}
      <div className="w-2/3 bg-white rounded-lg shadow-md p-4">
        {selectedUser ? (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Chat with @{selectedUser.username}
            </h2>
            <div className="h-96 overflow-y-auto mb-4 p-4 border rounded-md">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-2 flex ${
                    msg.sender_id === user.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs p-2 rounded-lg ${
                      msg.sender_id === user.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition duration-200"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <p className="text-gray-500 text-center">Select a conversation or search for a user to start chatting</p>
        )}
      </div>
    </div>
  );
}

export default Messages;