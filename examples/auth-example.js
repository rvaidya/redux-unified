/**
 * Authentication Example
 * 
 * Demonstrates how to use Redux Unified with custom authentication
 * including CSRF tokens for HTTP and socket tokens for WebSocket
 */

import { configureStore } from '@reduxjs/toolkit';
import { 
  createSlice,
  configureHttpMiddleware,
  configureWebSocketMiddleware,
  httpMiddleware,
  websocketMiddleware
} from 'redux-unified';

// 1. Create Authentication Slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    bearerToken: null,
    csrfToken: null,
    socketToken: null,
    isAuthenticated: false
  },
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.bearerToken = action.payload.bearerToken;
      state.csrfToken = action.payload.csrfToken;
      state.socketToken = action.payload.socketToken;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.bearerToken = null;
      state.csrfToken = null;
      state.socketToken = null;
      state.isAuthenticated = false;
    },
    updateTokens: (state, action) => {
      state.bearerToken = action.payload.bearerToken;
      state.csrfToken = action.payload.csrfToken;
      state.socketToken = action.payload.socketToken;
    }
  }
});

// 2. Create API Slice with HTTP endpoints
const apiSlice = createSlice({
  name: 'api',
  initialState: {
    users: [],
    posts: [],
    loading: false,
    error: null
  },
  endpoints: {
    // Create user with CSRF protection
    createUser: {
      type: 'rsaa',
      config: {
        path: '/users',
        method: 'POST'
      },
      reducers: {
        request: (state) => {
          state.loading = true;
          state.error = null;
        },
        success: (state, action) => {
          state.loading = false;
          state.users.push(action.payload);
        },
        error: (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      }
    },
    
    // Update user with authentication
    updateUser: {
      type: 'rsaa',
      config: {
        path: '/users/:id',
        method: 'PUT'
      },
      reducers: {
        request: (state) => { state.loading = true; },
        success: (state, action) => {
          state.loading = false;
          const index = state.users.findIndex(u => u.id === action.payload.id);
          if (index >= 0) {
            state.users[index] = action.payload;
          }
        },
        error: (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      }
    },
    
    // Delete with CSRF protection
    deletePost: {
      type: 'rsaa',
      config: {
        path: '/posts/:id',
        method: 'DELETE'
      },
      reducers: {
        request: (state) => { state.loading = true; },
        success: (state, action) => {
          state.loading = false;
          state.posts = state.posts.filter(p => p.id !== action.payload.id);
        },
        error: (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      }
    }
  }
});

// 3. Create Chat Slice with WebSocket endpoints
const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    activeUsers: [],
    connected: false,
    error: null
  },
  endpoints: {
    // Send message with socket authentication
    sendMessage: {
      type: 'socket',
      config: {
        room: 'general'
      },
      reducers: {
        request: (state) => {
          // Message being sent
        },
        success: (state, action) => {
          // Server confirmed message sent
          console.log('Message sent successfully:', action.payload);
        },
        update: (state, action) => {
          // Incoming message from other users
          state.messages.push(action.payload);
        },
        error: (state, action) => {
          state.error = action.payload;
        }
      }
    },
    
    // Join room with authentication
    joinRoom: {
      type: 'socket',
      config: {
        room: 'general'
      },
      reducers: {
        request: (state) => {
          state.connected = false;
        },
        success: (state, action) => {
          state.connected = true;
          state.activeUsers = action.payload.users || [];
        },
        update: (state, action) => {
          // User joined/left updates
          if (action.payload.type === 'user_joined') {
            state.activeUsers.push(action.payload.user);
          } else if (action.payload.type === 'user_left') {
            state.activeUsers = state.activeUsers.filter(
              u => u.id !== action.payload.user.id
            );
          }
        },
        error: (state, action) => {
          state.connected = false;
          state.error = action.payload;
        }
      }
    }
  }
});

// 4. Configure Authentication Middleware
let store; // Will be set after store creation

// HTTP Authentication with CSRF
configureHttpMiddleware({
  baseURL: 'https://api.myapp.com',
  auth: {
    type: 'bearer',
    getToken: () => {
      const state = store.getState();
      return state.auth.bearerToken;
    }
  },
  interceptors: {
    request: (config) => {
      const state = store.getState();
      
      // Add CSRF token for state-changing operations
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method)) {
        if (state.auth.csrfToken) {
          config.headers = {
            ...config.headers,
            'X-CSRF-Token': state.auth.csrfToken
          };
        }
      }
      
      // Add user context
      if (state.auth.user?.id) {
        config.headers = {
          ...config.headers,
          'X-User-ID': state.auth.user.id
        };
      }
      
      return config;
    },
    
    error: (error) => {
      if (error.status === 401) {
        // Token expired or invalid
        console.warn('Authentication failed, logging out user');
        store.dispatch(authSlice.actions.logout());
        
        // Redirect to login (in a real app)
        // window.location.href = '/login';
      } else if (error.status === 403 && error.data?.code === 'CSRF_TOKEN_MISMATCH') {
        // CSRF token is invalid, try to refresh
        console.warn('CSRF token invalid, refreshing...');
        refreshCSRFToken();
      }
    }
  }
});

// WebSocket Authentication with Socket Token
configureWebSocketMiddleware({
  url: 'wss://api.myapp.com/ws',
  auth: {
    type: 'custom',
    getToken: () => {
      const state = store.getState();
      return state.auth.socketToken;
    },
    tokenParam: 'auth_token' // Field name in WebSocket messages
  },
  onConnect: () => {
    console.log('WebSocket connected with authentication');
  },
  onDisconnect: () => {
    console.log('WebSocket disconnected');
  },
  onError: (error) => {
    console.error('WebSocket error:', error);
  }
});

// 5. Create Store with Authentication
store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    api: apiSlice.reducer,
    chat: chatSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(httpMiddleware, websocketMiddleware)
});

// 6. Helper Functions

async function login(username, password) {
  try {
    // In a real app, this would call your login API
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Store all authentication tokens
      store.dispatch(authSlice.actions.loginSuccess({
        user: data.user,
        bearerToken: data.access_token,
        csrfToken: data.csrf_token,
        socketToken: data.socket_token
      }));
      
      console.log('Login successful');
      return true;
    }
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
}

async function refreshCSRFToken() {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${store.getState().auth.bearerToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      store.dispatch(authSlice.actions.updateTokens({
        bearerToken: store.getState().auth.bearerToken,
        csrfToken: data.csrf_token,
        socketToken: store.getState().auth.socketToken
      }));
    }
  } catch (error) {
    console.error('CSRF token refresh failed:', error);
  }
}

// 7. Usage Examples

// Login user
await login('john@example.com', 'password123');

// Make authenticated HTTP requests with CSRF protection
store.dispatch(apiSlice.endpoints.createUser.action({
  body: {
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'admin'
  }
}));

// Update user (will include Bearer token + CSRF token + User ID)
store.dispatch(apiSlice.endpoints.updateUser.action({
  pathParams: { id: '123' },
  body: {
    name: 'Jane Smith Updated',
    role: 'moderator'
  }
}));

// Delete with CSRF protection
store.dispatch(apiSlice.endpoints.deletePost.action({
  pathParams: { id: '456' }
}));

// Send WebSocket messages with socket authentication
store.dispatch(chatSlice.endpoints.joinRoom.action({
  room: 'general',
  userId: store.getState().auth.user?.id
}));

store.dispatch(chatSlice.endpoints.sendMessage.action({
  text: 'Hello everyone! This message is authenticated.',
  room: 'general'
}));

// 8. Expected Message Formats

/*
HTTP Request with Authentication:
POST /users HTTP/1.1
Host: api.myapp.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-CSRF-Token: abc123def456ghi789
X-User-ID: user-12345
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "admin"
}

WebSocket Message with Authentication:
{
  "type": "chat/sendMessage",
  "response_types": [
    "chat/sendMessage_REQUEST",
    "chat/sendMessage_UPDATE",
    "chat/sendMessage_SUCCESS", 
    "chat/sendMessage_ERROR"
  ],
  "payload": "{\"text\":\"Hello everyone!\",\"room\":\"general\"}",
  "auth_token": "socket-token-xyz789",
  "room": "general",
  "timestamp": 1749205500000
}
*/

export {
  authSlice,
  apiSlice,
  chatSlice,
  store,
  login,
  refreshCSRFToken
}; 