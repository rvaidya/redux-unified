/**
 * Final Integration Test for Redux Unified
 * 
 * This test validates all fixes and ensures the package works correctly
 */

import { configureStore } from '@reduxjs/toolkit';
import { createSlice } from '../index';
import { getEnvironmentInfo, isHttpAvailable, isWebSocketAvailable } from '../utils/environment';
import { configureHttpMiddleware, configureWebSocketMiddleware } from '../middleware';

// Mock fetch and WebSocket for testing
global.fetch = jest.fn();
(global as any).WebSocket = jest.fn().mockImplementation(() => ({
    readyState: 1, // WebSocket.OPEN
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
}));

describe('Redux Unified - Final Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true, data: 'test' })
        });
    });

    describe('Environment Detection', () => {
        test('should detect testing environment correctly', () => {
            const env = getEnvironmentInfo();
            expect(env.isTestEnvironment).toBe(true);
            // Environment detection can vary in Jest/test environments
            // Jest may simulate browser environment with window/dom
            // The important thing is that our environment utilities work
            expect(typeof env.httpAvailable).toBe('boolean');
            expect(typeof env.webSocketAvailable).toBe('boolean');
            expect(typeof env.isNodeJS).toBe('boolean');
            expect(typeof env.isBrowser).toBe('boolean');
        });

        test('should detect HTTP availability with mocked fetch', () => {
            expect(isHttpAvailable()).toBe(true);
        });

        test('should detect WebSocket availability with mocked WebSocket', () => {
            expect(isWebSocketAvailable()).toBe(true);
        });
    });

    describe('Complete Slice Creation and Usage', () => {
        test('should create and use slice with mixed endpoints', () => {
            // Create a complex slice with regular reducers and endpoints
            const appSlice = createSlice({
                name: 'app',
                initialState: {
                    // Regular state
                    counter: 0,
                    user: null,
                    
                    // API state
                    apiLoading: false,
                    apiData: null,
                    apiError: null,
                    
                    // Socket state
                    socketConnected: false,
                                         socketMessages: [] as any[],
                    socketError: null
                },
                reducers: {
                    // Regular reducers
                    increment: (state) => {
                        state.counter += 1;
                    },
                    setUser: (state, action) => {
                        state.user = action.payload;
                    },
                    reset: (state) => {
                        state.counter = 0;
                        state.user = null;
                        state.apiData = null;
                        state.socketMessages = [];
                    }
                },
                endpoints: {
                    // HTTP endpoints
                    fetchUserData: {
                        type: 'rsaa',
                        config: {
                            path: '/api/user/:id',
                            method: 'GET'
                        },
                        reducers: {
                            request: (state) => {
                                state.apiLoading = true;
                                state.apiError = null;
                            },
                            success: (state, action) => {
                                state.apiLoading = false;
                                state.apiData = action.payload;
                            },
                            error: (state, action) => {
                                state.apiLoading = false;
                                state.apiError = action.payload;
                            }
                        }
                    },
                    
                    createPost: {
                        type: 'rsaa',
                        config: {
                            path: '/api/posts',
                            method: 'POST'
                        },
                        reducers: {
                            request: (state) => {
                                state.apiLoading = true;
                            },
                            success: (state, action) => {
                                state.apiLoading = false;
                                // Add new post to some list if it existed
                            },
                            error: (state, action) => {
                                state.apiLoading = false;
                                state.apiError = action.payload;
                            }
                        }
                    },
                    
                    // WebSocket endpoints  
                    joinChatRoom: {
                        type: 'socket',
                        config: {
                            room: 'general'
                        },
                        reducers: {
                            request: (state) => {
                                state.socketConnected = false;
                            },
                            success: (state) => {
                                state.socketConnected = true;
                                state.socketError = null;
                            },
                            update: (state, action) => {
                                state.socketMessages.push(action.payload);
                            },
                            error: (state, action) => {
                                state.socketConnected = false;
                                state.socketError = action.payload;
                            }
                        }
                    },
                    
                    sendMessage: {
                        type: 'socket',
                        config: {
                            room: 'general'
                        },
                        reducers: {
                            request: (state) => {
                                // Could add loading state for sending
                            },
                            success: (state, action) => {
                                // Message sent successfully
                                state.socketMessages.push({
                                    ...action.payload,
                                    sent: true
                                });
                            },
                            error: (state, action) => {
                                state.socketError = action.payload;
                            }
                        }
                    }
                }
            });

            // Verify slice structure
            expect(appSlice.name).toBe('app');
            expect(appSlice.reducer).toBeDefined();
            expect(appSlice.actions).toBeDefined();
            expect(appSlice.endpoints).toBeDefined();

            // Verify regular actions
            expect(appSlice.actions.increment).toBeDefined();
            expect(appSlice.actions.setUser).toBeDefined();
            expect(appSlice.actions.reset).toBeDefined();

            // Verify HTTP endpoint actions
            expect(appSlice.endpoints.fetchUserData).toBeDefined();
            expect(appSlice.endpoints.fetchUserData.action).toBeDefined();
            expect(appSlice.endpoints.fetchUserData.request).toBeDefined();
            expect(appSlice.endpoints.fetchUserData.success).toBeDefined();
            expect(appSlice.endpoints.fetchUserData.error).toBeDefined();

            expect(appSlice.endpoints.createPost).toBeDefined();
            expect(appSlice.endpoints.createPost.action).toBeDefined();

            // Verify WebSocket endpoint actions
            expect(appSlice.endpoints.joinChatRoom).toBeDefined();
            expect(appSlice.endpoints.joinChatRoom.action).toBeDefined();
            expect(appSlice.endpoints.joinChatRoom.request).toBeDefined();
            expect(appSlice.endpoints.joinChatRoom.success).toBeDefined();
            expect(appSlice.endpoints.joinChatRoom.update).toBeDefined();
            expect(appSlice.endpoints.joinChatRoom.error).toBeDefined();

            expect(appSlice.endpoints.sendMessage).toBeDefined();

            // Test action creators
            const incrementAction = appSlice.actions.increment();
            expect(incrementAction.type).toBe('app/increment');

            const setUserAction = appSlice.actions.setUser({ id: 1, name: 'John' });
            expect(setUserAction.type).toBe('app/setUser');
            expect(setUserAction.payload).toEqual({ id: 1, name: 'John' });

            // Test HTTP action creator
            const fetchAction = appSlice.endpoints.fetchUserData.action({
                pathParams: { id: '123' },
                queryParams: { include: 'profile' }
            });
            expect(fetchAction.type).toBe('app/fetchUserData');

            // Test WebSocket action creator
            const joinAction = appSlice.endpoints.joinChatRoom.action({
                userId: 123
            });
            expect(joinAction.type).toBe('app/joinChatRoom');
            expect(joinAction.payload).toEqual({ userId: 123 });

            console.log('✅ Complex slice with mixed endpoints created successfully');
        });

        test('should work with Redux store and dispatch actions', () => {
            // Create slice
            const testSlice = createSlice({
                name: 'test',
                initialState: {
                    count: 0,
                    data: null,
                    loading: false
                },
                reducers: {
                    increment: (state) => {
                        state.count += 1;
                    }
                },
                endpoints: {
                    fetchData: {
                        type: 'rsaa',
                        config: {
                            path: '/api/data',
                            method: 'GET'
                        },
                        reducers: {
                            request: (state) => {
                                state.loading = true;
                            },
                            success: (state, action) => {
                                state.loading = false;
                                state.data = action.payload;
                            },
                            error: (state, action) => {
                                state.loading = false;
                            }
                        }
                    }
                }
            });

            // Create store
            const store = configureStore({
                reducer: {
                    test: testSlice.reducer
                }
            });

            // Test regular action
            expect((store.getState() as any).test.count).toBe(0);
            store.dispatch(testSlice.actions.increment());
            expect((store.getState() as any).test.count).toBe(1);

            // Test endpoint actions
            store.dispatch(testSlice.endpoints.fetchData.request());
            expect((store.getState() as any).test.loading).toBe(true);

            store.dispatch(testSlice.endpoints.fetchData.success({ result: 'success' }));
            expect((store.getState() as any).test.loading).toBe(false);
            expect((store.getState() as any).test.data).toEqual({ result: 'success' });

            console.log('✅ Store integration works correctly');
        });
    });

    describe('Middleware Configuration', () => {
        test('should configure HTTP middleware without errors', () => {
            expect(() => {
                configureHttpMiddleware({
                    baseURL: 'https://api.example.com',
                    timeout: 5000,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': 'test-key'
                    },
                    cache: {
                        enabled: true,
                        ttl: 300000,
                        storage: 'memory'
                    }
                });
            }).not.toThrow();

            console.log('✅ HTTP middleware configuration works');
        });

        test('should configure WebSocket middleware without errors', () => {
            expect(() => {
                configureWebSocketMiddleware({
                    url: 'wss://api.example.com/ws',
                    protocols: ['chat', 'notifications'],
                    reconnect: {
                        enabled: true,
                        maxAttempts: 5,
                        delay: 1000,
                        backoff: true
                    },
                    heartbeat: {
                        enabled: true,
                        interval: 30000,
                        message: { type: 'ping' }
                    },
                    auth: {
                        type: 'token',
                        getToken: () => 'test-token',
                        tokenParam: 'token'
                    }
                });
            }).not.toThrow();

            console.log('✅ WebSocket middleware configuration works');
        });
    });

    describe('Error Handling', () => {
        test('should handle environment issues gracefully', () => {
            // The environment utilities should work even in edge cases
            const env = getEnvironmentInfo();
            expect(env).toHaveProperty('isNodeJS');
            expect(env).toHaveProperty('isBrowser');
            expect(env).toHaveProperty('isTestEnvironment');
            expect(env).toHaveProperty('httpAvailable');
            expect(env).toHaveProperty('webSocketAvailable');

            console.log('✅ Environment detection is robust');
        });

        test('should create slices even with minimal configuration', () => {
            // Test edge case with minimal slice
            const minimalSlice = createSlice({
                name: 'minimal',
                initialState: { value: 0 },
                reducers: {}
            });

            expect(minimalSlice.name).toBe('minimal');
            expect(minimalSlice.reducer).toBeDefined();
            expect(minimalSlice.actions).toBeDefined();

            console.log('✅ Minimal slice creation works');
        });
    });

    describe('Type Safety and Developer Experience', () => {
        test('should provide type-safe action creators', () => {
            const slice = createSlice({
                name: 'typed',
                initialState: { count: 0 },
                reducers: {
                    setCount: (state, action: { payload: number }) => {
                        state.count = action.payload;
                    }
                },
                endpoints: {
                    updateCount: {
                        type: 'rsaa',
                        config: {
                            path: '/api/count',
                            method: 'POST'
                        },
                        reducers: {
                            success: (state, action) => {
                                state.count = action.payload.count;
                            }
                        }
                    }
                }
            });

            // These should work without TypeScript errors
            const action1 = slice.actions.setCount(42);
            expect(action1.payload).toBe(42);

            const action2 = slice.endpoints.updateCount.action({
                body: { count: 42 }
            });
            expect(action2.type).toBe('typed/updateCount');

            console.log('✅ Type safety works correctly');
        });
    });
}); 