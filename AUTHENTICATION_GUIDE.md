# Enhanced Authentication Guide

## Overview

Redux Unified provides flexible authentication for both HTTP and WebSocket calls. You can easily configure custom authentication that pulls tokens from Redux state, including CSRF tokens for web API calls and socket tokens for WebSocket communications.

## Current Authentication Features

### HTTP Authentication
- **Bearer Tokens**: `Authorization: Bearer <token>`
- **Basic Auth**: `Authorization: Basic <token>`
- **Custom Headers**: Any header name with any value
- **Request Interceptors**: Add custom headers dynamically
- **CSRF Token Support**: Via request interceptors

### WebSocket Authentication
- **Token Parameter**: Configurable token field name
- **Dynamic Token Lookup**: Get tokens from Redux state
- **Custom Auth Functions**: Define how to retrieve tokens

## Configuration Examples

### 1. Basic HTTP Authentication with Bearer Token

```javascript
import { configureHttpMiddleware } from 'redux-unified';

configureHttpMiddleware({
  baseURL: 'https://api.example.com',
  auth: {
    type: 'bearer',
    getToken: () => {
      const state = store.getState();
      return state.auth.bearerToken;
    }
  }
});
```

### 2. HTTP with CSRF Token (Your Use Case)

```javascript
import { configureHttpMiddleware } from 'redux-unified';

configureHttpMiddleware({
  baseURL: 'https://api.example.com',
  auth: {
    type: 'bearer', // For Authorization header
    getToken: () => {
      const state = store.getState();
      return state.auth.bearerToken;
    }
  },
  interceptors: {
    request: (config) => {
      const state = store.getState();
      
      // Add CSRF token from Redux state
      if (state.auth.csrfToken) {
        config.headers = {
          ...config.headers,
          'X-CSRF-Token': state.auth.csrfToken
        };
      }
      
      return config;
    }
  }
});
```

### 3. WebSocket with Socket Token (Your Use Case)

```javascript
import { configureWebSocketMiddleware } from 'redux-unified';

configureWebSocketMiddleware({
  url: 'wss://api.example.com/ws',
  auth: {
    type: 'custom',
    getToken: () => {
      const state = store.getState();
      return state.auth.socketToken;
    },
    tokenParam: 'auth_token' // Field name in WebSocket message
  }
});
```

## Complete Integration Example

### Step 1: Create Authentication Slice

```javascript
import { createSlice } from 'redux-unified';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    bearerToken: null,
    csrfToken: null,
    socketToken: null,
    user: null
  },
  reducers: {
    setTokens: (state, action) => {
      state.bearerToken = action.payload.bearerToken;
      state.csrfToken = action.payload.csrfToken;
      state.socketToken = action.payload.socketToken;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.bearerToken = null;
      state.csrfToken = null;
      state.socketToken = null;
      state.user = null;
    }
  }
});
```

### Step 2: Configure Middleware

```javascript
import { 
  configureHttpMiddleware, 
  configureWebSocketMiddleware,
  httpMiddleware,
  websocketMiddleware
} from 'redux-unified';

// HTTP configuration with CSRF
configureHttpMiddleware({
  baseURL: 'https://api.example.com',
  auth: {
    type: 'bearer',
    getToken: () => store.getState().auth.bearerToken
  },
  interceptors: {
    request: (config) => {
      const { csrfToken } = store.getState().auth;
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
      return config;
    },
    error: (error) => {
      if (error.status === 401) {
        // Handle auth errors
        store.dispatch(authSlice.actions.logout());
        window.location.href = '/login';
      }
    }
  }
});

// WebSocket configuration with socket token
configureWebSocketMiddleware({
  url: 'wss://api.example.com/ws',
  auth: {
    type: 'custom',
    getToken: () => store.getState().auth.socketToken,
    tokenParam: 'socket_token'
  }
});
```

### Step 3: Create API Slice

```javascript
const apiSlice = createSlice({
  name: 'api',
  initialState: {
    users: [],
    loading: false,
    error: null
  },
  endpoints: {
    createUser: {
      type: 'rsaa',
      config: {
        path: '/users',
        method: 'POST'
      },
      reducers: {
        request: (state) => { state.loading = true; },
        success: (state, action) => {
          state.loading = false;
          state.users.push(action.payload);
        },
        error: (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      }
    }
  }
});
```

### Step 4: Create WebSocket Slice

```javascript
const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    connected: false
  },
  endpoints: {
    sendMessage: {
      type: 'socket',
      config: {
        room: 'general'
      },
      reducers: {
        request: (state) => { state.connected = true; },
        success: (state, action) => {
          console.log('Message sent:', action.payload);
        },
        update: (state, action) => {
          state.messages.push(action.payload);
        },
        error: (state, action) => {
          console.error('Send failed:', action.payload);
        }
      }
    }
  }
});
```

### Step 5: Configure Store

```javascript
import { configureStore } from '@reduxjs/toolkit';

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    api: apiSlice.reducer,
    chat: chatSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(httpMiddleware, websocketMiddleware)
});
```

## Usage Examples

### Setting Authentication Tokens

```javascript
// After successful login
store.dispatch(authSlice.actions.setTokens({
  bearerToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  csrfToken: 'csrf-token-from-server',
  socketToken: 'socket-auth-token-123'
}));
```

### Making Authenticated HTTP Requests

```javascript
// This will automatically include:
// - Authorization: Bearer <bearerToken>
// - X-CSRF-Token: <csrfToken>
store.dispatch(apiSlice.endpoints.createUser.action({
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
}));
```

### Sending Authenticated WebSocket Messages

```javascript
// This will automatically include socket_token field
store.dispatch(chatSlice.endpoints.sendMessage.action({
  text: 'Hello everyone!',
  room: 'general'
}));
```

## Message Formats

### HTTP Request with Authentication

```javascript
// Request sent to server:
POST /users HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-CSRF-Token: csrf-token-from-server
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### WebSocket Message with Authentication

```javascript
// Message sent via WebSocket:
{
  "type": "chat/sendMessage",
  "response_types": [
    "chat/sendMessage_REQUEST",
    "chat/sendMessage_UPDATE", 
    "chat/sendMessage_SUCCESS",
    "chat/sendMessage_ERROR"
  ],
  "payload": "{\"text\":\"Hello everyone!\",\"room\":\"general\"}",
  "socket_token": "socket-auth-token-123",
  "room": "general",
  "timestamp": 1749205123456
}
```

## Advanced Patterns

### Dynamic Token Refresh

```javascript
configureHttpMiddleware({
  baseURL: 'https://api.example.com',
  auth: {
    type: 'bearer',
    getToken: () => {
      const state = store.getState();
      
      // Check if token is expired
      if (isTokenExpired(state.auth.bearerToken)) {
        // Trigger refresh (this should be handled elsewhere)
        store.dispatch(refreshTokenAction());
        return null; // Temporarily no token
      }
      
      return state.auth.bearerToken;
    }
  },
  interceptors: {
    error: async (error) => {
      if (error.status === 401) {
        // Attempt token refresh
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry the original request
          return retryRequest(error.config);
        } else {
          // Logout user
          store.dispatch(authSlice.actions.logout());
        }
      }
    }
  }
});
```

### Multiple Authentication Headers

```javascript
configureHttpMiddleware({
  baseURL: 'https://api.example.com',
  interceptors: {
    request: (config) => {
      const state = store.getState();
      
      // Add multiple auth headers
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${state.auth.bearerToken}`,
        'X-CSRF-Token': state.auth.csrfToken,
        'X-API-Key': state.auth.apiKey,
        'X-User-ID': state.auth.user?.id
      };
      
      return config;
    }
  }
});
```

### Environment-Specific Authentication

```javascript
const authConfig = {
  development: {
    auth: { type: 'custom', getToken: () => 'dev-token' }
  },
  production: {
    auth: { 
      type: 'bearer',
      getToken: () => store.getState().auth.bearerToken
    }
  }
};

configureHttpMiddleware({
  baseURL: process.env.REACT_APP_API_URL,
  ...authConfig[process.env.NODE_ENV]
});
```

## Security Best Practices

1. **Token Storage**: Store sensitive tokens securely (consider using secure httpOnly cookies for CSRF tokens)

2. **Token Rotation**: Implement automatic token refresh before expiration

3. **Error Handling**: Always handle authentication errors gracefully

4. **Environment Variables**: Use environment variables for API endpoints

5. **HTTPS**: Always use HTTPS in production

6. **Token Validation**: Validate tokens on both client and server side

## Summary

✅ **HTTP Authentication**: Bearer tokens + CSRF tokens via request interceptors  
✅ **WebSocket Authentication**: Custom socket tokens from Redux state  
✅ **Dynamic Token Updates**: Tokens are fetched fresh from state on each request  
✅ **Error Handling**: Automatic logout on 401 errors  
✅ **Flexible Configuration**: Support for multiple authentication strategies  
✅ **Production Ready**: Secure and scalable authentication patterns

This authentication system gives you complete control over how tokens are managed and transmitted, while keeping the implementation clean and maintainable! 