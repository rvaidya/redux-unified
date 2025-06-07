/**
 * Tests for WebSocket middleware functionality
 */

import './setup';
import { 
    websocketMiddleware, 
    configureWebSocketMiddleware,
    initializeWebSocket,
    sendWebSocketMessage,
    getWebSocketStatus,
    closeWebSocket,
    reconnectWebSocket
} from '../middleware/websocketMiddleware';
import { configureStore } from '@reduxjs/toolkit';
import { waitFor, flushPromises } from './setup';

describe('WebSocket Middleware', () => {
    let store: any;
    let dispatch: jest.Mock;
    let next: jest.Mock;

    beforeEach(() => {
        dispatch = jest.fn();
        next = jest.fn();
        store = {
            dispatch,
            getState: jest.fn(() => ({
                user: { socket_token: 'test-token' }
            }))
        };

        // Reset WebSocket middleware configuration
        configureWebSocketMiddleware({
            url: 'ws://localhost:8000/ws',
            eventNames: {
                action: 'redux_action',
                response: 'redux_response'
            }
        });
    });

    afterEach(() => {
        closeWebSocket();
    });

    describe('Basic middleware functionality', () => {
        test('should pass through non-WebSocket actions', () => {
            const action = { type: 'REGULAR_ACTION', payload: 'test' };
            const middleware = websocketMiddleware(store)(next);

            middleware(action);

            expect(next).toHaveBeenCalledWith(action);
            expect(dispatch).not.toHaveBeenCalled();
        });

        test('should handle WebSocket actions', async () => {
            const wsAction = {
                type: 'SEND_MESSAGE',
                payload: { message: 'Hello' },
                meta: {
                    socket: {
                        types: ['SEND_MESSAGE_REQUEST', 'SEND_MESSAGE_UPDATE', 'SEND_MESSAGE_SUCCESS', 'SEND_MESSAGE_ERROR']
                    }
                }
            };

            const middleware = websocketMiddleware(store)(next);
            
            // Wait for WebSocket to initialize
            await waitFor(20);
            
            middleware(wsAction);

            // Should dispatch request action immediately
            expect(dispatch).toHaveBeenCalledWith({
                type: 'SEND_MESSAGE_REQUEST',
                payload: undefined
            });
        });

        test('should dispatch error when WebSocket not connected', () => {
            configureWebSocketMiddleware({ url: '' }); // No URL to prevent connection

            const wsAction = {
                type: 'SEND_MESSAGE',
                payload: { message: 'Hello' },
                meta: {
                    socket: {
                        types: ['REQUEST', 'UPDATE', 'SUCCESS', 'ERROR']
                    }
                }
            };

            const middleware = websocketMiddleware(store)(next);
            middleware(wsAction);

            expect(dispatch).toHaveBeenCalledWith({
                type: 'ERROR',
                payload: {
                    message: 'WebSocket not connected',
                    code: 'CONNECTION_ERROR',
                    timestamp: expect.any(Number)
                },
                error: true
            });
        });
    });

    describe('WebSocket connection management', () => {
        test('should initialize WebSocket connection', async () => {
            initializeWebSocket(store);
            
            await waitFor(20);
            
            const status = getWebSocketStatus();
            expect(status.connected).toBe(true);
            expect(status.url).toBe('ws://localhost:8000/ws');
        });

        test('should handle WebSocket connection events', async () => {
            const onConnect = jest.fn();
            const onDisconnect = jest.fn();
            const onError = jest.fn();

            configureWebSocketMiddleware({
                url: 'ws://localhost:8000/ws',
                onConnect,
                onDisconnect,
                onError
            });

            initializeWebSocket(store);
            
            await waitFor(20);
            
            expect(onConnect).toHaveBeenCalled();

            closeWebSocket();
            await waitFor(10);
            
            expect(onDisconnect).toHaveBeenCalled();
        });

        test('should handle incoming WebSocket messages', async () => {
            const onMessage = jest.fn();
            
            configureWebSocketMiddleware({
                url: 'ws://localhost:8000/ws',
                onMessage
            });

            initializeWebSocket(store);
            await waitFor(20);

            // Simulate incoming message
            const mockMessage = new MessageEvent('message', {
                data: JSON.stringify({
                    type: 'TEST_SUCCESS',
                    payload: { result: 'success' }
                })
            });

            // Get the WebSocket instance and trigger message
            const wsInstance = (global as any).WebSocket.mock.instances[0];
            if (wsInstance.onmessage) {
                wsInstance.onmessage(mockMessage);
            }

            expect(dispatch).toHaveBeenCalledWith({
                type: 'TEST_SUCCESS',
                payload: { result: 'success' }
            });
            
            expect(onMessage).toHaveBeenCalledWith(mockMessage);
        });

        test('should handle malformed WebSocket messages', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            initializeWebSocket(store);
            await waitFor(20);

            // Simulate malformed message
            const mockMessage = new MessageEvent('message', {
                data: 'invalid json'
            });

            const wsInstance = (global as any).WebSocket.mock.instances[0];
            if (wsInstance.onmessage) {
                wsInstance.onmessage(mockMessage);
            }

            expect(consoleSpy).toHaveBeenCalledWith(
                'Redux Unified: WebSocket message parse error',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Message sending', () => {
        test('should send WebSocket messages with proper format', async () => {
            initializeWebSocket(store);
            await waitFor(20);

            const wsAction = {
                type: 'SEND_MESSAGE',
                payload: { message: 'Hello World' },
                meta: {
                    socket: {
                        types: ['REQUEST', 'UPDATE', 'SUCCESS', 'ERROR'],
                        room: 'chat-room',
                        channel: 'general'
                    }
                }
            };

            const middleware = websocketMiddleware(store)(next);
            middleware(wsAction);

            const wsInstance = (global as any).WebSocket.mock.instances[0];
            
            expect(wsInstance.send).toHaveBeenCalledWith(
                JSON.stringify({
                    type: 'SEND_MESSAGE',
                    response_types: ['REQUEST', 'UPDATE', 'SUCCESS', 'ERROR'],
                    token: 'test-token',
                    payload: JSON.stringify({ message: 'Hello World' }),
                    room: 'chat-room',
                    channel: 'general',
                    timestamp: expect.any(Number)
                })
            );
        });

        test('should handle send errors', async () => {
            initializeWebSocket(store);
            await waitFor(20);

            const wsInstance = (global as any).WebSocket.mock.instances[0];
            wsInstance.send.mockImplementation(() => {
                throw new Error('Send failed');
            });

            const wsAction = {
                type: 'SEND_MESSAGE',
                payload: { message: 'Hello' },
                meta: {
                    socket: {
                        types: ['REQUEST', 'UPDATE', 'SUCCESS', 'ERROR']
                    }
                }
            };

            const middleware = websocketMiddleware(store)(next);
            middleware(wsAction);

            expect(dispatch).toHaveBeenCalledWith({
                type: 'ERROR',
                payload: {
                    message: 'Send failed',
                    code: 'SEND_ERROR',
                    data: expect.any(Error),
                    timestamp: expect.any(Number)
                },
                error: true
            });
        });

        test('should send direct messages via sendWebSocketMessage', async () => {
            initializeWebSocket(store);
            await waitFor(20);

            const message = { type: 'PING', data: 'test' };
            const result = sendWebSocketMessage(message);

            expect(result).toBe(true);

            const wsInstance = (global as any).WebSocket.mock.instances[0];
            expect(wsInstance.send).toHaveBeenCalledWith(JSON.stringify(message));
        });

        test('should return false when sending message without connection', () => {
            const result = sendWebSocketMessage({ type: 'PING' });
            expect(result).toBe(false);
        });
    });

    describe('Authentication', () => {
        test('should include token from state in messages', async () => {
            store.getState.mockReturnValue({
                user: { socket_token: 'user-token' },
                auth: { token: 'auth-token' }
            });

            initializeWebSocket(store);
            await waitFor(20);

            const wsAction = {
                type: 'SEND_MESSAGE',
                payload: { message: 'Hello' },
                meta: {
                    socket: {
                        types: ['REQUEST', 'UPDATE', 'SUCCESS', 'ERROR']
                    }
                }
            };

            const middleware = websocketMiddleware(store)(next);
            middleware(wsAction);

            const wsInstance = (global as any).WebSocket.mock.instances[0];
            const sentMessage = JSON.parse(wsInstance.send.mock.calls[0][0]);
            
            expect(sentMessage.token).toBe('user-token');
        });

        test('should fallback to auth token when socket token not available', async () => {
            store.getState.mockReturnValue({
                auth: { token: 'auth-token' }
            });

            initializeWebSocket(store);
            await waitFor(20);

            const wsAction = {
                type: 'SEND_MESSAGE',
                payload: { message: 'Hello' },
                meta: {
                    socket: {
                        types: ['REQUEST', 'UPDATE', 'SUCCESS', 'ERROR']
                    }
                }
            };

            const middleware = websocketMiddleware(store)(next);
            middleware(wsAction);

            const wsInstance = (global as any).WebSocket.mock.instances[0];
            const sentMessage = JSON.parse(wsInstance.send.mock.calls[0][0]);
            
            expect(sentMessage.token).toBe('auth-token');
        });
    });

    describe('Configuration', () => {
        test('should apply configuration settings', () => {
            const config = {
                url: 'ws://example.com/ws',
                eventNames: {
                    action: 'custom_action',
                    response: 'custom_response'
                },
                onConnect: jest.fn(),
                onDisconnect: jest.fn(),
                onError: jest.fn(),
                onMessage: jest.fn()
            };

            configureWebSocketMiddleware(config);

            const status = getWebSocketStatus();
            expect(status.url).toBe('ws://example.com/ws');
        });
    });

    describe('Utility functions', () => {
        test('getWebSocketStatus should return connection status', async () => {
            let status = getWebSocketStatus();
            expect(status.connected).toBe(false);
            expect(status.readyState).toBe(null);

            initializeWebSocket(store);
            await waitFor(20);

            status = getWebSocketStatus();
            expect(status.connected).toBe(true);
            expect(status.readyState).toBe(WebSocket.OPEN);
        });

        test('closeWebSocket should close connection', async () => {
            initializeWebSocket(store);
            await waitFor(20);

            expect(getWebSocketStatus().connected).toBe(true);

            closeWebSocket();

            expect(getWebSocketStatus().connected).toBe(false);
        });

        test('reconnectWebSocket should reconnect', async () => {
            initializeWebSocket(store);
            await waitFor(20);

            const firstStatus = getWebSocketStatus();
            expect(firstStatus.connected).toBe(true);

            reconnectWebSocket();
            await waitFor(20);

            const secondStatus = getWebSocketStatus();
            expect(secondStatus.connected).toBe(true);
        });
    });

    describe('Store integration', () => {
        test('should work with real Redux store', async () => {
            const initialState = { messages: [], connected: false };
            const reducer = (state = initialState, action: any) => {
                switch (action.type) {
                    case 'SEND_MESSAGE_REQUEST':
                        return { ...state, connected: true };
                    case 'SEND_MESSAGE_SUCCESS':
                        return { ...state, messages: [...state.messages, action.payload] };
                    default:
                        return state;
                }
            };

            const realStore = configureStore({
                reducer: { chat: reducer },
                middleware: (getDefaultMiddleware) => 
                    getDefaultMiddleware().concat(websocketMiddleware)
            });

            const wsAction = {
                type: 'SEND_MESSAGE',
                payload: { message: 'Hello World' },
                meta: {
                    socket: {
                        types: ['SEND_MESSAGE_REQUEST', 'SEND_MESSAGE_UPDATE', 'SEND_MESSAGE_SUCCESS', 'SEND_MESSAGE_ERROR']
                    }
                }
            };

            await waitFor(20); // Wait for WebSocket to initialize

            realStore.dispatch(wsAction);

            // Check request state
            expect(realStore.getState().chat.connected).toBe(true);

            // Simulate success response
            realStore.dispatch({
                type: 'SEND_MESSAGE_SUCCESS',
                payload: { message: 'Hello World', id: 1 }
            });

            expect(realStore.getState().chat.messages).toContainEqual({
                message: 'Hello World',
                id: 1
            });
        });
    });
}); 