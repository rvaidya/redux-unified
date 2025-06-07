/**
 * Tests for unified createSlice functionality
 */

import './setup';
import { createSlice, createApiSlice, createSocketSlice } from '../slice';
import { configureStore } from '@reduxjs/toolkit';

describe('createSlice', () => {
    interface TestState {
        count: number;
        data: any;
        loading: boolean;
        error: string | null;
    }

    const initialState: TestState = {
        count: 0,
        data: null,
        loading: false,
        error: null
    };

    describe('Basic slice creation', () => {
        test('should create a slice with regular reducers only', () => {
            const slice = createSlice({
                name: 'test',
                initialState,
                reducers: {
                    increment: (state) => {
                        state.count += 1;
                    },
                    setData: (state, action) => {
                        state.data = action.payload;
                    }
                }
            });

            expect(slice.name).toBe('test');
            expect(slice.actions.increment).toBeDefined();
            expect(slice.actions.setData).toBeDefined();
            expect(slice.reducer).toBeDefined();
            expect(typeof slice.reducer).toBe('function');
        });

        test('should handle initial state as function', () => {
            const slice = createSlice({
                name: 'test',
                initialState: () => ({ count: 0 }),
                reducers: {
                    increment: (state) => {
                        state.count += 1;
                    }
                }
            });

            const state = slice.reducer(undefined, { type: '@@INIT' });
            expect(state).toEqual({ count: 0 });
        });
    });

    describe('HTTP endpoints', () => {
        test('should create HTTP endpoint actions', () => {
            const slice = createSlice({
                name: 'user',
                initialState,
                reducers: {},
                endpoints: {
                    fetchUser: {
                        type: 'rsaa',
                        config: {
                            path: 'users/:id',
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
                                state.error = action.payload.message;
                            }
                        }
                    }
                }
            });

            // Check that endpoint actions are created
            expect(slice.actions.fetchUser).toBeDefined();
            expect(slice.actions.fetchUser.action).toBeDefined();
            expect(slice.actions.fetchUser.request).toBeDefined();
            expect(slice.actions.fetchUser.success).toBeDefined();
            expect(slice.actions.fetchUser.error).toBeDefined();
            expect(slice.actions.fetchUser.type_request).toBe('user/fetchUser_REQUEST');
            expect(slice.actions.fetchUser.type_success).toBe('user/fetchUser_SUCCESS');
            expect(slice.actions.fetchUser.type_error).toBe('user/fetchUser_ERROR');
        });

        test('should handle HTTP endpoint reducers', () => {
            const slice = createSlice({
                name: 'user',
                initialState,
                reducers: {},
                endpoints: {
                    fetchUser: {
                        type: 'rsaa',
                        config: {
                            path: 'users/:id',
                            method: 'GET'
                        },
                        reducers: {
                            request: (state) => {
                                state.loading = true;
                                state.error = null;
                            },
                            success: (state, action) => {
                                state.loading = false;
                                state.data = action.payload;
                            },
                            error: (state, action) => {
                                state.loading = false;
                                state.error = action.payload.message;
                            }
                        }
                    }
                }
            });

            // Test request action
            let state = slice.reducer(initialState, slice.actions.fetchUser.request());
            expect(state.loading).toBe(true);
            expect(state.error).toBe(null);

            // Test success action
            state = slice.reducer(state, slice.actions.fetchUser.success({ id: 1, name: 'John' }));
            expect(state.loading).toBe(false);
            expect(state.data).toEqual({ id: 1, name: 'John' });

            // Test error action
            state = slice.reducer(initialState, slice.actions.fetchUser.error({ message: 'Failed' }));
            expect(state.loading).toBe(false);
            expect(state.error).toBe('Failed');
        });
    });

    describe('WebSocket endpoints', () => {
        test('should create WebSocket endpoint actions', () => {
            const slice = createSlice({
                name: 'chat',
                initialState,
                reducers: {},
                endpoints: {
                    liveUpdates: {
                        type: 'socket',
                        config: {
                            channel: 'updates'
                        },
                        reducers: {
                            update: (state, action) => {
                                state.data = action.payload;
                            }
                        }
                    }
                }
            });

            // Check that endpoint actions are created
            expect(slice.actions.liveUpdates).toBeDefined();
            expect(slice.actions.liveUpdates.action).toBeDefined();
            expect(slice.actions.liveUpdates.request).toBeDefined();
            expect(slice.actions.liveUpdates.update).toBeDefined();
            expect(slice.actions.liveUpdates.success).toBeDefined();
            expect(slice.actions.liveUpdates.error).toBeDefined();
            expect(slice.actions.liveUpdates.type_request).toBe('chat/liveUpdates_REQUEST');
            expect(slice.actions.liveUpdates.type_update).toBe('chat/liveUpdates_UPDATE');
            expect(slice.actions.liveUpdates.type_success).toBe('chat/liveUpdates_SUCCESS');
            expect(slice.actions.liveUpdates.type_error).toBe('chat/liveUpdates_ERROR');
        });

        test('should handle WebSocket endpoint reducers', () => {
            const slice = createSlice({
                name: 'chat',
                initialState,
                reducers: {},
                endpoints: {
                    liveUpdates: {
                        type: 'socket',
                        config: {
                            channel: 'updates'
                        },
                        reducers: {
                            request: (state) => {
                                state.loading = true;
                            },
                            update: (state, action) => {
                                state.data = action.payload;
                            },
                            success: (state) => {
                                state.loading = false;
                            },
                            error: (state, action) => {
                                state.loading = false;
                                state.error = action.payload.message;
                            }
                        }
                    }
                }
            });

            // Test update action
            let state = slice.reducer(initialState, slice.actions.liveUpdates.update({ message: 'Hello' }));
            expect(state.data).toEqual({ message: 'Hello' });

            // Test success action
            state = slice.reducer({ ...initialState, loading: true }, slice.actions.liveUpdates.success());
            expect(state.loading).toBe(false);
        });
    });

    describe('Mixed endpoints', () => {
        test('should handle both HTTP and WebSocket endpoints', () => {
            const slice = createSlice({
                name: 'mixed',
                initialState,
                reducers: {
                    reset: (state) => {
                        state.count = 0;
                        state.data = null;
                        state.error = null;
                    }
                },
                endpoints: {
                    fetchData: {
                        type: 'rsaa',
                        config: {
                            path: 'data',
                            method: 'GET'
                        },
                        reducers: {
                            success: (state, action) => {
                                state.data = action.payload;
                            }
                        }
                    },
                    liveUpdates: {
                        type: 'socket',
                        reducers: {
                            update: (state, action) => {
                                state.count += 1;
                            }
                        }
                    }
                }
            });

            // Regular action
            expect(slice.actions.reset).toBeDefined();
            
            // HTTP endpoint
            expect(slice.actions.fetchData).toBeDefined();
            expect(slice.actions.fetchData.action).toBeDefined();
            
            // WebSocket endpoint
            expect(slice.actions.liveUpdates).toBeDefined();
            expect(slice.actions.liveUpdates.action).toBeDefined();

            // Test that all actions work
            let state = slice.reducer(initialState, slice.actions.reset());
            state = slice.reducer(state, slice.actions.liveUpdates.update());
            expect(state.count).toBe(1);
        });
    });

    describe('Store integration', () => {
        test('should work in a Redux store', () => {
            const slice = createSlice({
                name: 'integration',
                initialState,
                reducers: {
                    increment: (state) => {
                        state.count += 1;
                    }
                },
                endpoints: {
                    fetchData: {
                        type: 'rsaa',
                        config: {
                            path: 'data',
                            method: 'GET'
                        },
                        reducers: {
                            success: (state, action) => {
                                state.data = action.payload;
                            }
                        }
                    }
                }
            });

            const store = configureStore({
                reducer: {
                    integration: slice.reducer
                }
            });

            // Test regular action
            store.dispatch(slice.actions.increment());
            expect((store.getState().integration as TestState).count).toBe(1);

            // Test endpoint action
            store.dispatch(slice.actions.fetchData.success({ test: 'data' }));
            expect((store.getState().integration as TestState).data).toEqual({ test: 'data' });
        });
    });

    describe('Helper functions', () => {
        test('createApiSlice should create slice with only HTTP endpoints', () => {
            const slice = createApiSlice({
                name: 'api',
                initialState,
                reducers: {},
                endpoints: {
                    fetchData: {
                        type: 'rsaa',
                        config: {
                            path: 'data',
                            method: 'GET'
                        },
                        reducers: {}
                    }
                }
            });

            expect(slice.actions.fetchData).toBeDefined();
            expect(slice.actions.fetchData.type_request).toBe('api/fetchData_REQUEST');
        });

        test('createSocketSlice should create slice with only WebSocket endpoints', () => {
            const slice = createSocketSlice({
                name: 'socket',
                initialState,
                reducers: {},
                endpoints: {
                    liveData: {
                        type: 'socket',
                        reducers: {}
                    }
                }
            });

            expect(slice.actions.liveData).toBeDefined();
            expect(slice.actions.liveData.type_update).toBe('socket/liveData_UPDATE');
        });
    });

    describe('Action metadata', () => {
        test('HTTP actions should include correct metadata', () => {
            const slice = createSlice({
                name: 'test',
                initialState,
                reducers: {},
                endpoints: {
                    fetchUser: {
                        type: 'rsaa',
                        config: {
                            path: 'users/:id',
                            method: 'GET'
                        },
                        reducers: {}
                    }
                }
            });

            const action = slice.actions.fetchUser.action({ body: { test: 'data' } });
            expect(action.type).toBe('test/fetchUser');
            expect(action.payload).toEqual({ test: 'data' });
            expect(action.meta).toBeDefined();
            expect(action.meta.endpoint).toEqual({
                path: 'users/:id',
                method: 'GET'
            });
        });

        test('WebSocket actions should include correct metadata', () => {
            const slice = createSlice({
                name: 'test',
                initialState,
                reducers: {},
                endpoints: {
                    liveUpdates: {
                        type: 'socket',
                        config: {
                            channel: 'updates'
                        },
                        reducers: {}
                    }
                }
            });

            const action = slice.actions.liveUpdates.action({ message: 'hello' });
            expect(action.type).toBe('test/liveUpdates');
            expect(action.payload).toEqual({ message: 'hello' });
            expect(action.meta).toBeDefined();
            expect(action.meta.socket).toBeDefined();
            expect(action.meta.socket.types).toContain('test/liveUpdates_REQUEST');
        });
    });
}); 