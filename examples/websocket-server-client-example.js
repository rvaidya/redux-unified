/**
 * Redux Unified - Complete WebSocket Client/Server Example
 * 
 * This example demonstrates how Redux action format makes WebSocket
 * communication between client and server clean and predictable.
 */

// ===================================
// SERVER SIDE (Node.js + Express + Socket.IO)
// ===================================

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// In-memory store for demo
const chatRooms = new Map();
const userSessions = new Map();

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Handle all Redux actions from client
  socket.on('redux-action', (action) => {
    console.log('📥 Received Redux action:', action.type);
    
    try {
      switch (action.type) {
        // User authentication
        case 'auth/authenticate': {
          const { username, token } = action.payload;
          
          // Validate token (in real app, check with database)
          if (token && username) {
            userSessions.set(socket.id, { username, token });
            
            socket.emit('redux-action', {
              type: 'auth/authenticate_SUCCESS',
              payload: { 
                username,
                message: 'Authentication successful',
                sessionId: socket.id
              }
            });
          } else {
            socket.emit('redux-action', {
              type: 'auth/authenticate_ERROR',
              payload: { message: 'Invalid credentials' },
              error: true
            });
          }
          break;
        }

        // Chat room operations
        case 'chat/joinRoom': {
          const room = action.payload.room;
          const user = userSessions.get(socket.id);
          
          if (!user) {
            socket.emit('redux-action', {
              type: 'chat/joinRoom_ERROR',
              payload: { message: 'Not authenticated' },
              error: true
            });
            return;
          }
          
          socket.join(room);
          
          // Initialize room if doesn't exist
          if (!chatRooms.has(room)) {
            chatRooms.set(room, { members: [], messages: [] });
          }
          
          const roomData = chatRooms.get(room);
          roomData.members.push({ socketId: socket.id, username: user.username });
          
          // Notify everyone in room
          io.to(room).emit('redux-action', {
            type: 'chat/joinRoom_UPDATE',
            payload: {
              room,
              username: user.username,
              message: `${user.username} joined the room`,
              memberCount: roomData.members.length
            }
          });
          
          // Send room history to new member
          socket.emit('redux-action', {
            type: 'chat/loadHistory_SUCCESS',
            payload: {
              room,
              messages: roomData.messages.slice(-50) // Last 50 messages
            }
          });
          break;
        }

        case 'chat/sendMessage': {
          const messageRoom = action.payload.room;
          const sender = userSessions.get(socket.id);
          
          if (!sender) {
            socket.emit('redux-action', {
              type: 'chat/sendMessage_ERROR',
              payload: { message: 'Not authenticated' },
              error: true
            });
            return;
          }
          
          const message = {
            id: Date.now().toString(),
            text: action.payload.message,
            username: sender.username,
            timestamp: new Date().toISOString(),
            room: messageRoom
          };
          
          // Store message
          if (chatRooms.has(messageRoom)) {
            chatRooms.get(messageRoom).messages.push(message);
          }
          
          // Broadcast to all room members
          io.to(messageRoom).emit('redux-action', {
            type: 'chat/sendMessage_UPDATE',
            payload: message
          });
          break;
        }

        // Notifications
        case 'notifications/subscribe': {
          const notificationUser = userSessions.get(socket.id);
          if (notificationUser) {
            socket.join(`notifications-${notificationUser.username}`);
            
            socket.emit('redux-action', {
              type: 'notifications/subscribe_SUCCESS',
              payload: { 
                subscribed: true,
                channel: `notifications-${notificationUser.username}`
              }
            });
          }
          break;
        }

        default:
          console.log('⚠️ Unknown action type:', action.type);
      }
    } catch (error) {
      console.error('❌ Error processing action:', error);
      socket.emit('redux-action', {
        type: 'WEBSOCKET_ERROR',
        payload: { message: 'Server error processing action' },
        error: true
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    
    // Clean up user session
    const user = userSessions.get(socket.id);
    if (user) {
      // Remove from all chat rooms
      chatRooms.forEach((room, roomName) => {
        room.members = room.members.filter(member => member.socketId !== socket.id);
        
        // Notify room members
        if (room.members.length > 0) {
          io.to(roomName).emit('redux-action', {
            type: 'chat/memberLeft_UPDATE',
            payload: {
              room: roomName,
              username: user.username,
              message: `${user.username} left the room`,
              memberCount: room.members.length
            }
          });
        }
      });
      
      userSessions.delete(socket.id);
    }
  });
});

// Demo: Send periodic notifications
setInterval(() => {
  io.emit('redux-action', {
    type: 'notifications/serverUpdate_UPDATE',
    payload: {
      id: Date.now(),
      message: 'Server heartbeat',
      timestamp: new Date().toISOString(),
      type: 'system'
    }
  });
}, 30000); // Every 30 seconds

server.listen(3001, () => {
  console.log('🚀 WebSocket server running on port 3001');
});

// ===================================
// CLIENT SIDE (React + Redux Unified)
// ===================================

/*
// client/store/chatSlice.js
import { createSlice, EndpointType } from 'redux-unified';

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    isAuthenticated: false,
    username: null,
    currentRoom: null,
    messages: [],
    notifications: [],
    members: [],
    loading: false,
    error: null
  },
  
  reducers: {
    clearMessages: (state) => {
      state.messages = [];
    },
    setCurrentRoom: (state, action) => {
      state.currentRoom = action.payload;
    }
  },
  
  endpoints: {
    // Authentication
    authenticate: {
      type: EndpointType.WEBSOCKET,
      reducers: {
        request: (state) => {
          state.loading = true;
          state.error = null;
        },
        success: (state, action) => {
          state.loading = false;
          state.isAuthenticated = true;
          state.username = action.payload.username;
        },
        error: (state, action) => {
          state.loading = false;
          state.error = action.payload.message;
          state.isAuthenticated = false;
        }
      }
    },
    
    // Join chat room
    joinRoom: {
      type: EndpointType.WEBSOCKET,
      reducers: {
        update: (state, action) => {
          // Someone joined the room
          state.messages.push({
            id: Date.now(),
            text: action.payload.message,
            type: 'system',
            timestamp: new Date().toISOString()
          });
        }
      }
    },
    
    // Send/receive messages
    sendMessage: {
      type: EndpointType.WEBSOCKET,
      reducers: {
        update: (state, action) => {
          // New message received
          state.messages.push(action.payload);
        },
        error: (state, action) => {
          state.error = action.payload.message;
        }
      }
    },
    
    // Load message history
    loadHistory: {
      type: EndpointType.WEBSOCKET,
      reducers: {
        success: (state, action) => {
          state.messages = action.payload.messages;
        }
      }
    },
    
    // Real-time notifications
    notifications: {
      type: EndpointType.WEBSOCKET,
      reducers: {
        update: (state, action) => {
          state.notifications.push(action.payload);
        }
      }
    }
  }
});

export const { clearMessages, setCurrentRoom } = chatSlice.actions;
export const { 
  authenticate, 
  joinRoom, 
  sendMessage, 
  loadHistory, 
  notifications 
} = chatSlice.actions;
export default chatSlice.reducer;

// client/components/ChatApp.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  authenticate, 
  joinRoom, 
  sendMessage, 
  setCurrentRoom,
  notifications
} from '../store/chatSlice';

export default function ChatApp() {
  const dispatch = useDispatch();
  const { 
    isAuthenticated, 
    username, 
    currentRoom, 
    messages, 
    loading, 
    error 
  } = useSelector(state => state.chat);
  
  const [messageText, setMessageText] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  useEffect(() => {
    // Subscribe to notifications when component mounts
    if (isAuthenticated) {
      dispatch(notifications.action());
    }
  }, [isAuthenticated, dispatch]);

  const handleLogin = () => {
    if (usernameInput.trim()) {
      dispatch(authenticate.action({
        username: usernameInput.trim(),
        token: 'demo-token-123' // In real app, get from auth system
      }));
    }
  };

  const handleJoinRoom = (room) => {
    dispatch(setCurrentRoom(room));
    dispatch(joinRoom.action({ room, username }));
  };

  const handleSendMessage = () => {
    if (messageText.trim() && currentRoom) {
      dispatch(sendMessage.action({
        room: currentRoom,
        message: messageText.trim()
      }));
      setMessageText('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-form">
        <h2>Join Chat</h2>
        <input
          type="text"
          placeholder="Enter username"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} disabled={loading}>
          {loading ? 'Connecting...' : 'Join Chat'}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="chat-app">
      <div className="chat-header">
        <h2>Welcome, {username}!</h2>
        <div className="room-buttons">
          <button onClick={() => handleJoinRoom('general')}>General</button>
          <button onClick={() => handleJoinRoom('random')}>Random</button>
          <button onClick={() => handleJoinRoom('help')}>Help</button>
        </div>
        {currentRoom && <p>Current room: {currentRoom}</p>}
      </div>

      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.type || 'user'}`}>
            <strong>{msg.username}:</strong> {msg.text}
            <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>

      {currentRoom && (
        <div className="message-input">
          <input
            type="text"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      )}
    </div>
  );
}
*/

// ===================================
// KEY BENEFITS DEMONSTRATED
// ===================================

/*
✅ PREDICTABLE MESSAGE FORMAT
   Every WebSocket message follows Redux action structure
   
✅ AUTOMATIC STATE MANAGEMENT  
   Messages automatically trigger the correct reducers
   
✅ TYPE SAFETY
   Full TypeScript support for message payloads
   
✅ ERROR HANDLING
   Standardized error responses across HTTP and WebSocket
   
✅ EASY SERVER ROUTING
   Action type tells server exactly what to do
   
✅ REAL-TIME SYNCHRONIZATION
   Client state automatically updates with server broadcasts
   
✅ CLEAN SEPARATION OF CONCERNS
   Business logic in reducers, networking handled automatically
*/ 