/**
 * Authentication Integration Tests
 * 
 * Tests custom authentication including CSRF tokens for HTTP calls
 * and socket tokens for WebSocket calls, both pulled from Redux state
 */

import { configureStore } from '@reduxjs/toolkit';
import { createSlice } from '../index';
import { 
    httpMiddleware, 
    configureHttpMiddleware,
    websocketMiddleware, 
    configureWebSocketMiddleware, 
    initializeWebSocket
} from '../middleware';
import { envFetch } from '../utils/environment';

// Mock fetch for HTTP tests
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;
jest.mock('../utils/environment', () => ({
    ...jest.requireActual('../utils/environment'),
    envFetch: jest.fn()
}));
const mockedEnvFetch = envFetch as jest.MockedFunction<typeof envFetch>;

// Mock WebSocket for socket tests
class MockWebSocket {
    static OPEN = 1;
    readyState = MockWebSocket.OPEN;
    sentMessages: string[] = [];
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    
    constructor() {
        setTimeout(() => this.onopen?.(new Event('open')), 10);
    }
    
    send(data: string) {
        this.sentMessages.push(data);
    }
    
    close() {}
}

(global as any).WebSocket = MockWebSocket;

describe('Enhanced Authentication Integration', () => {
    let store: any;
    let mockWs: MockWebSocket;

    beforeEach(() => {
        jest.clearAllMocks();
        mockedEnvFetch.mockImplementation(mockFetch);
        
        // Create auth slice to manage tokens
        const authSlice = createSlice({
            name: 'auth',
            initialState: {
                bearerToken: null as string | null,
                csrfToken: null as string | null,
                socketToken: null as string | null,
                userId: null as string | null
            },
            reducers: {
                setTokens: (state, action) => {
                    state.bearerToken = action.payload.bearerToken;
                    state.csrfToken = action.payload.csrfToken;
                    state.socketToken = action.payload.socketToken;
                    state.userId = action.payload.userId;
                },
                clearAuth: (state) => {
                    state.bearerToken = null;
                    state.csrfToken = null;
                    state.socketToken = null;
                    state.userId = null;
                }
            }
        });

                 // Create API slice with HTTP endpoints
        const apiSlice = createSlice({
            name: 'api',
            initialState: {
                users: [] as any[],
                loading: false,
                error: null as any
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
                            (state.users as any[]).push(action.payload);
                        },
                        error: (state, action) => {
                            state.loading = false;
                            state.error = action.payload;
                        }
                    }
                },
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
                            const users = state.users as any[];
                            const index = users.findIndex((u: any) => u.id === action.payload.id);
                            if (index >= 0) users[index] = action.payload;
                        },
                        error: (state, action) => {
                            state.loading = false;
                            state.error = action.payload;
                        }
                    }
                }
            }
        });

                 // Create chat slice with WebSocket endpoints
        const chatSlice = createSlice({
            name: 'chat',
            initialState: {
                messages: [] as any[],
                connected: false,
                error: null as any
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
                            console.log('Message sent successfully:', action.payload);
                        },
                        update: (state, action) => {
                            state.messages.push(action.payload);
                        },
                        error: (state, action) => {
                            state.error = action.payload;
                        }
                    }
                },
                joinRoom: {
                    type: 'socket',
                    config: {
                        room: 'general'
                    },
                    reducers: {
                        request: (state) => { state.connected = false; },
                        success: (state, action) => {
                            state.connected = true;
                        },
                        error: (state, action) => {
                            state.connected = false;
                            state.error = action.payload;
                        }
                    }
                }
            }
        });

        // Configure HTTP middleware with custom auth
        configureHttpMiddleware({
            baseURL: 'https://api.example.com',
            auth: {
                type: 'custom',
                getToken: () => {
                    const state = store.getState();
                    return state.auth.bearerToken;
                }
            },
            // Custom request interceptor to add CSRF token
            interceptors: {
                request: (config: any) => {
                    const state = store.getState();
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

        // Configure WebSocket middleware with custom auth
        configureWebSocketMiddleware({
            url: 'wss://api.example.com/ws',
            auth: {
                type: 'custom',
                getToken: () => {
                    const state = store.getState();
                    return state.auth.socketToken;
                },
                tokenParam: 'auth_token'
            }
        });

        // Create store
        store = configureStore({
            reducer: {
                auth: authSlice.reducer,
                api: apiSlice.reducer,
                chat: chatSlice.reducer
            },
            middleware: (getDefaultMiddleware) =>
                getDefaultMiddleware().concat(httpMiddleware, websocketMiddleware)
        });

        // Store slices for access in tests
        store._slices = {
            auth: authSlice,
            api: apiSlice,
            chat: chatSlice
        };

        // Initialize WebSocket
        initializeWebSocket(store);
        mockWs = new MockWebSocket();
    });

    describe('HTTP Authentication with CSRF Tokens', () => {
        test('should add bearer token and CSRF token to HTTP requests', async () => {
            // Set up authentication tokens
            store.dispatch(store._slices.auth.actions.setTokens({
                bearerToken: 'bearer-token-123',
                csrfToken: 'csrf-token-456',
                socketToken: 'socket-token-789',
                userId: 'user-123'
            }));

            // Mock successful response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 1, name: 'John Doe' })
            });

            // Make API call
            await store.dispatch(store._slices.api.endpoints.createUser.action({
                body: { name: 'John Doe', email: 'john@example.com' }
            }));

            // Verify request was made with correct headers
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/users',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer bearer-token-123',
                        'X-CSRF-Token': 'csrf-token-456'
                    }),
                    body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' })
                })
            );

            console.log('✅ HTTP request includes both bearer token and CSRF token');
        });

        test('should handle requests without tokens gracefully', async () => {
            // No tokens set in state
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 2, name: 'Jane Doe' })
            });

            await store.dispatch(store._slices.api.endpoints.createUser.action({
                body: { name: 'Jane Doe' }
            }));

            // Should still make request but without auth headers
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/users',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                        // No Authorization or X-CSRF-Token headers
                    })
                })
            );

            // Verify no auth headers were added
            const callArgs = mockFetch.mock.calls[0][1];
            expect(callArgs.headers).not.toHaveProperty('Authorization');
            expect(callArgs.headers).not.toHaveProperty('X-CSRF-Token');

            console.log('✅ Requests without tokens work correctly');
        });

        test('should handle dynamic CSRF token updates', async () => {
            // Start with one CSRF token
            store.dispatch(store._slices.auth.actions.setTokens({
                bearerToken: 'bearer-123',
                csrfToken: 'csrf-initial',
                socketToken: 'socket-123',
                userId: 'user-123'
            }));

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 1 })
            });

            await store.dispatch(store._slices.api.endpoints.createUser.action({
                body: { name: 'User 1' }
            }));

            expect(mockFetch).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-CSRF-Token': 'csrf-initial'
                    })
                })
            );

            // Update CSRF token
            store.dispatch(store._slices.auth.actions.setTokens({
                bearerToken: 'bearer-123',
                csrfToken: 'csrf-updated',
                socketToken: 'socket-123',
                userId: 'user-123'
            }));

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 2 })
            });

            await store.dispatch(store._slices.api.endpoints.updateUser.action({
                body: { name: 'Updated User' },
                pathParams: { id: '1' }
            }));

            expect(mockFetch).toHaveBeenLastCalledWith(
                expect.stringContaining('/users/1'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-CSRF-Token': 'csrf-updated'
                    })
                })
            );

            console.log('✅ Dynamic CSRF token updates work correctly');
        });
    });

    describe('WebSocket Authentication with Socket Tokens', () => {
        test('should include socket token in WebSocket messages', async () => {
            await new Promise(resolve => setTimeout(resolve, 20)); // Wait for connection

            // Set authentication tokens
            store.dispatch(store._slices.auth.actions.setTokens({
                bearerToken: 'bearer-token-123',
                csrfToken: 'csrf-token-456',
                socketToken: 'socket-token-789',
                userId: 'user-123'
            }));

            // Send WebSocket message
            store.dispatch(store._slices.chat.endpoints.sendMessage.action({
                text: 'Hello WebSocket!',
                userId: 'user-123'
            }));

            // Verify socket message was sent with token
            expect(mockWs.sentMessages).toHaveLength(1);
            const sentMessage = JSON.parse(mockWs.sentMessages[0]);
            
            expect(sentMessage).toMatchObject({
                type: 'chat/sendMessage',
                auth_token: 'socket-token-789',
                payload: expect.stringContaining('Hello WebSocket'),
                room: 'general',
                timestamp: expect.any(Number)
            });

            console.log('✅ WebSocket messages include socket token');
        });

        test('should handle socket messages without token', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            // No tokens in state
            store.dispatch(store._slices.chat.endpoints.joinRoom.action({
                userId: 'user-456'
            }));

            expect(mockWs.sentMessages).toHaveLength(1);
            const sentMessage = JSON.parse(mockWs.sentMessages[0]);
            
            // Should still send message but without token
            expect(sentMessage).toMatchObject({
                type: 'chat/joinRoom',
                room: 'general'
            });
            
            // Token field should be null/undefined
            expect(sentMessage.auth_token).toBeUndefined();

            console.log('✅ WebSocket messages without tokens work correctly');
        });

        test('should handle dynamic socket token updates', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            // Send message with first token
            store.dispatch(store._slices.auth.actions.setTokens({
                bearerToken: 'bearer-123',
                csrfToken: 'csrf-123',
                socketToken: 'socket-v1',
                userId: 'user-123'
            }));

            store.dispatch(store._slices.chat.endpoints.sendMessage.action({
                text: 'Message 1'
            }));

            let sentMessage = JSON.parse(mockWs.sentMessages[0]);
            expect(sentMessage.auth_token).toBe('socket-v1');

            // Update socket token
            store.dispatch(store._slices.auth.actions.setTokens({
                bearerToken: 'bearer-123',
                csrfToken: 'csrf-123', 
                socketToken: 'socket-v2',
                userId: 'user-123'
            }));

            store.dispatch(store._slices.chat.endpoints.sendMessage.action({
                text: 'Message 2'
            }));

            sentMessage = JSON.parse(mockWs.sentMessages[1]);
            expect(sentMessage.auth_token).toBe('socket-v2');

            console.log('✅ Dynamic socket token updates work correctly');
        });
    });

    describe('Combined Authentication Scenarios', () => {
        test('should handle concurrent HTTP and WebSocket auth', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            // Set up all tokens
            store.dispatch(store._slices.auth.actions.setTokens({
                bearerToken: 'http-bearer-token',
                csrfToken: 'http-csrf-token',
                socketToken: 'ws-socket-token',
                userId: 'user-multi-auth'
            }));

            // Make HTTP request
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 1, name: 'HTTP User' })
            });

            await store.dispatch(store._slices.api.endpoints.createUser.action({
                body: { name: 'HTTP User' }
            }));

            // Send WebSocket message
            store.dispatch(store._slices.chat.endpoints.sendMessage.action({
                text: 'WebSocket message'
            }));

            // Verify HTTP auth
            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer http-bearer-token',
                        'X-CSRF-Token': 'http-csrf-token'
                    })
                })
            );

            // Verify WebSocket auth
            const wsMessage = JSON.parse(mockWs.sentMessages[0]);
            expect(wsMessage.auth_token).toBe('ws-socket-token');

            console.log('✅ Concurrent HTTP and WebSocket auth works correctly');
        });

        test('should handle auth token expiration and refresh', async () => {
            // Simulate token expiration scenario
            store.dispatch(store._slices.auth.actions.setTokens({
                bearerToken: 'expired-token',
                csrfToken: 'valid-csrf',
                socketToken: 'valid-socket',
                userId: 'user-refresh'
            }));

            // Mock 401 response
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ message: 'Token expired' })
            });

            await store.dispatch(store._slices.api.endpoints.createUser.action({
                body: { name: 'Test User' }
            }));

            // Verify error was handled
            const state = store.getState();
            expect(state.api.error).toMatchObject({
                status: 401,
                message: expect.stringContaining('401')
            });

            // Simulate token refresh
            store.dispatch(store._slices.auth.actions.setTokens({
                bearerToken: 'refreshed-token',
                csrfToken: 'new-csrf',
                socketToken: 'new-socket',
                userId: 'user-refresh'
            }));

            // Retry request with new token
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 1, name: 'Test User' })
            });

            await store.dispatch(store._slices.api.endpoints.createUser.action({
                body: { name: 'Test User' }
            }));

            expect(mockFetch).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer refreshed-token',
                        'X-CSRF-Token': 'new-csrf'
                    })
                })
            );

            console.log('✅ Token refresh scenario handled correctly');
        });
    });
}); 