/**
 * Redux Unified - EndpointType Enum Example
 * 
 * This example shows how to use the new EndpointType enum for cleaner,
 * more readable endpoint type definitions.
 */

const { createSlice, EndpointType } = require('../index');

// ===================================
// Using the new EndpointType enum
// ===================================

const userSlice = createSlice({
    name: 'user',
    initialState: {
        profile: null,
        notifications: [],
        loading: false,
        error: null
    },
    
    // Regular reducers
    reducers: {
        logout: (state) => {
            state.profile = null;
        },
        clearNotifications: (state) => {
            state.notifications = [];
        }
    },
    
    // HTTP and WebSocket endpoints with friendly enum types
    endpoints: {
        // HTTP endpoint using EndpointType.HTTP (much clearer than 'rsaa')
        fetchProfile: {
            type: EndpointType.HTTP,
            config: {
                path: 'users/profile',
                method: 'GET'
            },
            reducers: {
                request: (state) => {
                    state.loading = true;
                    state.error = null;
                },
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
        
        // WebSocket endpoint using EndpointType.WEBSOCKET (much clearer than 'socket')
        liveNotifications: {
            type: EndpointType.WEBSOCKET,
            config: {
                room: 'user-notifications'
            },
            reducers: {
                update: (state, action) => {
                    state.notifications.push(action.payload);
                }
            }
        }
    }
});

// ===================================
// Backward compatibility - legacy strings still work
// ===================================

const legacySlice = createSlice({
    name: 'legacy',
    initialState: { data: null },
    endpoints: {
        // These still work for backward compatibility
        oldHttp: {
            type: 'rsaa',  // Old way - still supported
            config: { path: 'data', method: 'GET' },
            reducers: {
                success: (state, action) => { state.data = action.payload; }
            }
        },
        oldSocket: {
            type: 'socket',  // Old way - still supported
            reducers: {
                update: (state, action) => { state.data = action.payload; }
            }
        }
    }
});

// ===================================
// Comparison: Before vs After
// ===================================

console.log('🎉 Endpoint Types Made Simple!');
console.log('');
console.log('Before (confusing):');
console.log('  type: "rsaa"    // What does this mean?');
console.log('  type: "socket"  // Better, but inconsistent');
console.log('');
console.log('After (clear and friendly):');
console.log('  type: EndpointType.HTTP      // Crystal clear!');
console.log('  type: EndpointType.WEBSOCKET // Self-documenting!');
console.log('');
console.log('✅ IntelliSense support');
console.log('✅ Type safety');
console.log('✅ Self-documenting code');
console.log('✅ Backward compatible');

// Export the slices for use
module.exports = {
    userSlice,
    legacySlice,
    EndpointType  // Export the enum for others to use
}; 