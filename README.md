# Redux Unified

**Simplify Redux by unifying HTTP API calls, WebSocket connections, and regular actions in one place.**

Redux Unified extends Redux Toolkit's `createSlice` to handle HTTP requests and WebSocket connections directly in your slice definitions. No more separate API middleware, action creators, or complex state management patterns.

## What Problem Does This Solve?

Traditional Redux applications require:
- Separate files for actions, reducers, and API calls
- Multiple middleware packages (redux-thunk, RTK Query, etc.)
- Complex boilerplate for HTTP requests and WebSocket connections
- Manual state management for loading, success, and error states

**Redux Unified eliminates this complexity** by letting you define everything in one place.

## Key Features

✅ **One File Per Feature** - Actions, HTTP calls, WebSocket handlers all in your slice  
✅ **Works Everywhere** - Browser, Node.js, and test environments  
✅ **Type Safe** - Full TypeScript support with inference  
✅ **Smart Authentication** - Automatic token management and CSRF protection  
✅ **Auto-Reconnection** - WebSocket connection management built-in  
✅ **Backward Compatible** - Works with existing Redux Toolkit code  
✅ **70% Less Code** - Dramatically reduce boilerplate  

## Installation

```bash
npm install redux-unified

# For Node.js environments
npm install ws node-fetch
```

## Quick Example

Here's what a typical user management feature looks like:

### Before (Traditional Redux)
```typescript
// actions/user.ts - 35 lines
// reducers/user.ts - 68 lines  
// api/user.ts - 45 lines
// middleware setup - 25 lines
// Total: 173 lines across 4 files
```

### After (Redux Unified)
```typescript
// slices/user.ts - Single file, 45 lines total
import { createSlice, EndpointType } from 'redux-unified';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    profile: null,
    loading: false,
    error: null
  },
  
  // Regular reducers (same as Redux Toolkit)
  reducers: {
    logout: (state) => {
      state.profile = null;
    }
  },
  
  // HTTP and WebSocket endpoints
  endpoints: {
    // HTTP request
    fetchProfile: {
      type: EndpointType.HTTP,
      config: {
        path: 'users/profile',
        method: 'GET'
      },
      reducers: {
        request: (state) => { state.loading = true; },
        success: (state, action) => { 
          state.loading = false;
          state.profile = action.payload; 
        },
        error: (state, action) => { 
          state.loading = false;
          state.error = action.payload.message; 
        }
      }
    },
    
    // WebSocket connection
    liveUpdates: {
      type: EndpointType.WEBSOCKET,
      reducers: {
        update: (state, action) => {
          // Handle real-time updates
          Object.assign(state.profile, action.payload);
        }
      }
    }
  }
});

export const { logout } = userSlice.actions;
export const { fetchProfile, liveUpdates } = userSlice.actions;
export default userSlice.reducer;
```

That's it! You now have HTTP requests, WebSocket connections, and regular actions all managed in one file.

## Getting Started

### 1. Configure Your Store

```typescript
import { createStoreWithUnifiedMiddleware, configureHttp, configureWebSocket } from 'redux-unified';

// Set up HTTP API calls
configureHttp({
  baseURL: 'https://api.example.com',
  auth: {
    type: 'bearer',
    getToken: () => localStorage.getItem('token')
  }
});

// Set up WebSocket connections (optional)
configureWebSocket({
  url: 'wss://api.example.com/ws',
  reconnect: { enabled: true, maxAttempts: 5 }
});

// Create store (replaces configureStore)
const store = createStoreWithUnifiedMiddleware({
  reducer: {
    user: userSlice.reducer,
    // ... other reducers
  }
});
```

### 2. Use in Your Components

```typescript
import { useDispatch } from 'react-redux';

function UserProfile() {
  const dispatch = useDispatch();
  
  useEffect(() => {
    // Trigger HTTP request
    dispatch(fetchProfile.action());
    
    // Connect to WebSocket updates
    dispatch(liveUpdates.action());
  }, [dispatch]);
  
  return <div>User Profile</div>;
}
```

## Endpoint Types

Redux Unified provides a friendly enum for endpoint types that makes your code more readable and self-documenting:

```typescript
import { EndpointType } from 'redux-unified';

// ✅ New way - Clear and friendly
EndpointType.HTTP      // For REST API calls  
EndpointType.WEBSOCKET // For real-time connections

// ❌ Old way - Confusing
'rsaa'    // What does this mean?
'socket'  // Better, but inconsistent
```

### Migration Example

```typescript
// Before - Confusing abbreviations
const slice = createSlice({
  endpoints: {
    fetchUser: { type: 'rsaa', /* ... */ },
    liveChat: { type: 'socket', /* ... */ }
  }
});

// After - Self-documenting code
const slice = createSlice({
  endpoints: {
    fetchUser: { type: EndpointType.HTTP, /* ... */ },
    liveChat: { type: EndpointType.WEBSOCKET, /* ... */ }
  }
});
```

### Benefits of the Enum Approach

✅ **IntelliSense Support** - Auto-completion in your IDE  
✅ **Type Safety** - Compile-time validation  
✅ **Self-Documenting** - Code explains itself  
✅ **Refactor-Safe** - IDE can rename all occurrences  
✅ **Backward Compatible** - Legacy strings still work  

You can still use the legacy string values for backward compatibility:
- `'rsaa'` (equivalent to `EndpointType.HTTP`)
- `'socket'` (equivalent to `EndpointType.WEBSOCKET`)

## HTTP Endpoints

HTTP endpoints handle API requests with automatic loading states:

```typescript
import { EndpointType } from 'redux-unified';

endpoints: {
  createUser: {
    type: EndpointType.HTTP,
    config: {
      path: 'users',           // API endpoint
      method: 'POST',          // HTTP method
      cache: false             // Disable caching for mutations
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
        state.error = action.payload.message;
      }
    }
  }
}
```

**Supported HTTP methods:** GET, POST, PUT, PATCH, DELETE  
**Built-in features:** Caching, timeouts, custom headers, authentication

## WebSocket Endpoints

WebSocket endpoints handle real-time connections:

```typescript
import { EndpointType } from 'redux-unified';

endpoints: {
  chatMessages: {
    type: EndpointType.WEBSOCKET,
    config: {
      room: 'chat-room-1'      // Optional: join specific room
    },
    reducers: {
      update: (state, action) => {
        // Handle incoming messages
        state.messages.push(action.payload);
      },
      error: (state, action) => {
        state.connectionError = action.payload.message;
      }
    }
  }
}
```

**Built-in features:** Auto-reconnection, heartbeat, authentication, message validation

### Socket Server Implementation

Redux Unified uses Redux action format for WebSocket messages, making server implementation clean and predictable.  All websocket responses from the socket server should be formatted as Redux types, which the middleware will dispatch
back into Redux.

#### Node.js WebSocket Server Example

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  console.log('Client connected');

  // Handle incoming Redux action messages
  ws.on('message', (data) => {
    try {
      const action = JSON.parse(data);
      
      // All messages follow Redux action format:
      // { type: "slice/endpoint", payload: {...}, meta: {...} }
      
      console.log('Received action:', action.type);
      
      // Handle different action types
      switch (action.type) {
        case 'chat/sendMessage':
          // Broadcast to all clients in room
          const room = action.meta?.socket?.room || 'general';
          broadcastToRoom(room, {
            type: 'chat/sendMessage_UPDATE',
            payload: {
              id: Date.now(),
              message: action.payload.message,
              user: action.payload.user,
              timestamp: new Date().toISOString()
            }
          });
          break;
          
        case 'user/subscribeToNotifications':
          // Subscribe user to their notification channel
          const userId = action.payload.userId;
          subscribeToChannel(ws, `notifications-${userId}`);
          
          // Send success response
          ws.send(JSON.stringify({
            type: 'user/subscribeToNotifications_SUCCESS',
            payload: { subscribed: true, channel: `notifications-${userId}` }
          }));
          break;
      }
    } catch (error) {
      // Send error response in Redux action format
      ws.send(JSON.stringify({
        type: 'WEBSOCKET_ERROR',
        payload: { message: 'Invalid message format' },
        error: true
      }));
    }
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'CONNECTION_SUCCESS',
    payload: { message: 'Connected to server', timestamp: new Date().toISOString() }
  }));
});

function broadcastToRoom(room, action) {
  wss.clients.forEach(client => {
    if (client.room === room && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(action));
    }
  });
}
```

#### Express + Socket.IO Server Example

```javascript
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle Redux actions
  socket.on('redux-action', (action) => {
    console.log('Redux action received:', action.type);
    
    switch (action.type) {
      case 'chat/joinRoom':
        const room = action.payload.room;
        socket.join(room);
        
        // Notify room about new member
        socket.to(room).emit('redux-action', {
          type: 'chat/joinRoom_UPDATE',
          payload: { 
            message: `${action.payload.username} joined the room`,
            room: room
          }
        });
        break;
        
      case 'chat/sendMessage':
        const messageRoom = action.payload.room;
        
        // Broadcast message to room
        io.to(messageRoom).emit('redux-action', {
          type: 'chat/sendMessage_UPDATE',
          payload: {
            id: Date.now(),
            message: action.payload.message,
            username: action.payload.username,
            room: messageRoom,
            timestamp: new Date().toISOString()
          }
        });
        break;
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

### Benefits of Redux Action Format for WebSocket Messages

#### 1. **Predictable Message Structure**
```javascript
// Every message follows the same format
{
  type: "slice/endpoint_ACTION_TYPE",  // Clear action identification
  payload: { /* data */ },             // Actual message content
  meta: { /* metadata */ }             // Additional context
}
```

#### 2. **Seamless Client Integration**
- Messages automatically trigger the correct reducers
- No manual message parsing or routing needed
- Type-safe message handling with TypeScript

#### 3. **Built-in Action Types**
```javascript
// Redux Unified automatically generates these action types:
"user/notifications_REQUEST"  // When connection starts
"user/notifications_UPDATE"   // For real-time updates  
"user/notifications_SUCCESS"  // For successful operations
"user/notifications_ERROR"    // For error handling
```

#### 4. **Server-Side Benefits**
- **Easy Routing**: Action type tells you exactly what to do
- **Consistent API**: Same patterns for HTTP and WebSocket
- **Error Handling**: Standardized error response format
- **Debugging**: Clear action logs for troubleshooting

#### 5. **Real-World Example**
```javascript
// Client sends:
{
  type: "orders/subscribeToUpdates",
  payload: { orderId: "12345" },
  meta: { socket: { room: "order-12345" } }
}

// Server processes and broadcasts:
{
  type: "orders/subscribeToUpdates_UPDATE", 
  payload: { 
    orderId: "12345",
    status: "shipped",
    trackingNumber: "1Z999AA1234567890"
  }
}

// Client reducer automatically handles it:
// state.orders.find(o => o.id === "12345").status = "shipped"
```

#### 6. **Type Safety & IntelliSense**
```typescript
// Server knows exactly what message format to expect
interface ChatMessage {
  type: 'chat/sendMessage';
  payload: {
    room: string;
    message: string;
    username: string;
  };
}

// Client gets full type safety and autocomplete
dispatch(chatEndpoint.action({
  room: 'general',      // ✅ Type-safe
  message: 'Hello!',    // ✅ IntelliSense works
  username: 'john'      // ✅ Validated at compile time
}));
```

## Authentication

Redux Unified handles authentication automatically:

### Bearer Token Authentication
```typescript
configureHttp({
  baseURL: 'https://api.example.com',
  auth: {
    type: 'bearer',
    getToken: () => localStorage.getItem('accessToken'),
    onAuthError: () => {
      // Handle 401/403 errors
      window.location.href = '/login';
    }
  }
});
```

### Advanced Authentication with CSRF
```typescript
configureHttp({
  baseURL: 'https://api.example.com',
  auth: {
    type: 'bearer',
    getToken: () => localStorage.getItem('accessToken')
  },
  // Add CSRF token from Redux state
  requestInterceptor: (config, { getState }) => {
    const csrfToken = getState().auth.csrfToken;
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  }
});
```

### WebSocket Authentication
```typescript
configureWebSocket({
  url: 'wss://api.example.com/ws',
  auth: {
    type: 'token',
    // Get token from Redux state
    getToken: (getState) => getState().auth.socketToken
  }
});
```

## Environment Support

Redux Unified works in all JavaScript environments:

- **Browser** - Uses native fetch and WebSocket APIs
- **Node.js** - Uses Node.js 18+ fetch or node-fetch fallback, ws package for WebSocket  
- **Testing** - Jest-compatible with automatic mocking

No configuration needed - environment detection is automatic.

## Migration from Existing Redux

### Step 1: Update Import
```typescript
// Before
import { createSlice } from '@reduxjs/toolkit';

// After  
import { createSlice } from 'redux-unified';
```

### Step 2: Move API Logic to Endpoints
```typescript
// Before: Separate files and complex setup
// actions/user.ts, reducers/user.ts, api/user.ts, middleware setup

// After: Single slice file
const userSlice = createSlice({
  name: 'user',
  initialState: { /* ... */ },
  reducers: { /* existing reducers */ },
  endpoints: { /* move API calls here */ }
});
```

### Step 3: Update Store Configuration
```typescript
// Before
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiMiddleware, socketMiddleware)
});

// After
const store = createStoreWithUnifiedMiddleware({
  reducer: rootReducer
});
```

## Complete Working Example

Here's a complete authentication slice with login, token refresh, and real-time notifications:

```typescript
import { createSlice, EndpointType } from 'redux-unified';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    loading: false,
    error: null,
    notifications: []
  },
  
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
    }
  },
  
  endpoints: {
    // Login API call
    login: {
      type: EndpointType.HTTP,
      config: {
        path: 'auth/login',
        method: 'POST'
      },
      reducers: {
        request: (state) => { 
          state.loading = true; 
          state.error = null; 
        },
        success: (state, action) => {
          state.loading = false;
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
        },
        error: (state, action) => {
          state.loading = false;
          state.error = action.payload.message;
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

export const { logout } = authSlice.actions;
export const { login, notifications } = authSlice.actions;
export default authSlice.reducer;
```

## Benefits

### Code Reduction
- **Traditional Redux:** 300+ lines across multiple files
- **Redux Unified:** 80-100 lines in single file
- **70% less boilerplate code**

### Developer Experience
- Everything in one place
- Familiar Redux Toolkit patterns
- Built-in best practices
- Type safety out of the box
- Works with existing Redux code

### Production Features
- Automatic authentication handling
- Smart caching for performance
- WebSocket reconnection and heartbeat
- Environment compatibility
- Comprehensive error handling

## API Reference

### Configuration Functions

- `configureHttp(options)` - Set up HTTP API configuration
- `configureWebSocket(options)` - Set up WebSocket configuration  
- `createStoreWithUnifiedMiddleware(options)` - Create Redux store with unified middleware

### Slice Definition

```typescript
import { EndpointType } from 'redux-unified';

createSlice({
  name: string,
  initialState: any,
  reducers: { /* standard Redux Toolkit reducers */ },
  endpoints: {
    [endpointName]: {
      type: EndpointType.HTTP | EndpointType.WEBSOCKET,
      config: { /* endpoint-specific configuration */ },
      reducers: { /* request/success/error handlers */ }
    }
  }
})
```

## Testing

Redux Unified includes comprehensive testing utilities:

```typescript
import { createTestServers } from 'redux-unified/testing';

// Create test HTTP and WebSocket servers
const { httpServer, wsServer } = createTestServers();

beforeAll(async () => {
  await httpServer.start();
  await wsServer.start();
});

afterAll(async () => {
  await httpServer.stop(); 
  await wsServer.stop();
});
```

## What's New in This Version

### 🎯 User-Friendly Endpoint Types
- **Before:** Confusing `'rsaa'` and `'socket'` strings
- **After:** Clear `EndpointType.HTTP` and `EndpointType.WEBSOCKET` enums
- **Benefits:** IntelliSense support, type safety, self-documenting code
- **Migration:** Seamless - legacy strings still work

### 🔌 Complete WebSocket Server Examples
- **Node.js + WebSocket** implementation examples
- **Express + Socket.IO** implementation examples  
- **Redux Action Format** for predictable message structure
- **Real-world Chat Application** showing client/server communication

### 📡 Redux Action Format Benefits
- **Predictable Structure:** Every message follows Redux action format
- **Automatic Routing:** Action type determines server behavior
- **Type Safety:** Full TypeScript support for message payloads
- **Error Handling:** Standardized error responses
- **Easy Integration:** Messages automatically trigger correct reducers

## Summary

Redux Unified now provides:

✅ **Friendlier API** - `EndpointType.HTTP` instead of `'rsaa'`  
✅ **Complete Documentation** - Server implementation examples  
✅ **Real-world Examples** - Chat app with authentication  
✅ **Type Safety** - Full TypeScript support  
✅ **Backward Compatibility** - No breaking changes  
✅ **Production Ready** - Comprehensive testing and examples  

## License

MIT License - see LICENSE file for details 