/**
 * WebSocket Message Format and Type Validation Tests
 * 
 * These tests validate that WebSocket messages coming back from the server
 * are properly formatted as Redux actions with types that match what was sent.
 */

import { configureStore } from '@reduxjs/toolkit';
import { createSlice } from '../index';
import { 
    websocketMiddleware, 
    configureWebSocketMiddleware, 
    initializeWebSocket,
    sendWebSocketMessage,
    getWebSocketStatus 
} from '../middleware/websocketMiddleware';

// Mock WebSocket with detailed event simulation
class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.CONNECTING;
    url: string;
    protocols?: string | string[];
    
    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    sentMessages: string[] = [];

    constructor(url: string, protocols?: string | string[]) {
        this.url = url;
        this.protocols = protocols;
        
        // Simulate connection opening
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            if (this.onopen) {
                this.onopen(new Event('open'));
            }
        }, 10);
    }

    send(data: string): void {
        if (this.readyState !== MockWebSocket.OPEN) {
            throw new Error('WebSocket is not open');
        }
        this.sentMessages.push(data);
    }

    close(): void {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) {
            this.onclose(new CloseEvent('close'));
        }
    }

    // Test helper to simulate receiving a message
    simulateMessage(data: any): void {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { 
                data: typeof data === 'string' ? data : JSON.stringify(data) 
            }));
        }
    }

    addEventListener = jest.fn();
    removeEventListener = jest.fn();
}

// Track instances for testing
const instances: MockWebSocket[] = [];

// Replace global WebSocket with our mock
(global as any).WebSocket = class extends MockWebSocket {
    constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        instances.push(this);
    }
};

(global as any).WebSocket.instances = instances;

describe('WebSocket Message Format and Type Validation', () => {
    let mockWs: MockWebSocket;
    let store: any;
    let slice: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        instances.length = 0; // Clear instances array
        
        // Configure WebSocket middleware
        configureWebSocketMiddleware({
            url: 'wss://test.example.com/ws',
            eventNames: {
                action: 'redux_action',
                response: 'redux_response'
            }
        });

        // Create test slice with WebSocket endpoints
        slice = createSlice({
            name: 'chat',
            initialState: {
                messages: [] as any[],
                users: [] as any[],
                connected: false,
                error: null
            },
            reducers: {
                clearMessages: (state) => {
                    state.messages = [];
                }
            },
            endpoints: {
                sendMessage: {
                    type: 'socket',
                    config: {
                        room: 'general'
                    },
                    reducers: {
                        request: (state) => {
                            state.connected = true;
                        },
                        success: (state, action) => {
                            // Message was sent successfully
                            console.log('Message sent:', action.payload);
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
                            state.users = action.payload.users || [];
                        },
                        update: (state, action) => {
                            // User joined/left updates
                            if (action.payload.type === 'user_joined') {
                                state.users.push(action.payload.user);
                            } else if (action.payload.type === 'user_left') {
                                state.users = state.users.filter(u => u.id !== action.payload.user.id);
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

        // Create store with WebSocket middleware
        store = configureStore({
            reducer: {
                chat: slice.reducer
            },
            middleware: (getDefaultMiddleware) =>
                getDefaultMiddleware().concat(websocketMiddleware)
        });

        // Initialize WebSocket connection
        initializeWebSocket(store);
        
        // Wait for WebSocket to be created and get the instance
        await new Promise(resolve => setTimeout(resolve, 15));
        mockWs = instances[0];
    });

    describe('Outgoing Message Format', () => {
        test('should send WebSocket messages with correct format and type information', async () => {
            await new Promise(resolve => setTimeout(resolve, 20)); // Wait for connection

            const messagePayload = { text: 'Hello World', user: 'Alice' };
            
            // Dispatch WebSocket action
            store.dispatch(slice.endpoints.sendMessage.action(messagePayload));

            // Wait a bit for async processing
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify message was sent
            expect(mockWs.sentMessages).toHaveLength(1);
            
            const sentMessage = JSON.parse(mockWs.sentMessages[0]);
            
            // Validate outgoing message format
            expect(sentMessage).toMatchObject({
                type: 'chat/sendMessage',
                response_types: [
                    'chat/sendMessage_REQUEST',
                    'chat/sendMessage_UPDATE', 
                    'chat/sendMessage_SUCCESS',
                    'chat/sendMessage_ERROR'
                ],
                payload: JSON.stringify(messagePayload),
                room: 'general',
                timestamp: expect.any(Number)
            });

            console.log('✅ Outgoing message format is correct');
        });

        test('should include correct type arrays for different endpoints', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            // Test sendMessage endpoint
            store.dispatch(slice.endpoints.sendMessage.action({ text: 'test' }));
            const sendMessageTypes = JSON.parse(mockWs.sentMessages[0]).response_types;
            
            expect(sendMessageTypes).toEqual([
                'chat/sendMessage_REQUEST',
                'chat/sendMessage_UPDATE',
                'chat/sendMessage_SUCCESS', 
                'chat/sendMessage_ERROR'
            ]);

            // Test joinRoom endpoint
            store.dispatch(slice.endpoints.joinRoom.action({ userId: 123 }));
            const joinRoomTypes = JSON.parse(mockWs.sentMessages[1]).response_types;
            
            expect(joinRoomTypes).toEqual([
                'chat/joinRoom_REQUEST',
                'chat/joinRoom_UPDATE',
                'chat/joinRoom_SUCCESS',
                'chat/joinRoom_ERROR'
            ]);

            console.log('✅ Type arrays are correctly generated for each endpoint');
        });
    });

    describe('Incoming Message Validation', () => {
        test('should accept and dispatch valid Redux action format messages', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            const initialState = store.getState();
            expect(initialState.chat.messages).toHaveLength(0);

            // Simulate receiving a properly formatted Redux action
            const incomingMessage = {
                type: 'chat/sendMessage_UPDATE',
                payload: {
                    id: 1,
                    text: 'Hello from server',
                    user: 'Bob',
                    timestamp: Date.now()
                }
            };

            mockWs.simulateMessage(incomingMessage);

            // Verify the action was dispatched and state updated
            const newState = store.getState();
            expect(newState.chat.messages).toHaveLength(1);
            expect(newState.chat.messages[0]).toEqual(incomingMessage.payload);

            console.log('✅ Valid Redux action messages are properly dispatched');
        });

        test('should handle success responses with correct types', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            // Simulate join room success response
            const successMessage = {
                type: 'chat/joinRoom_SUCCESS',
                payload: {
                    room: 'general',
                    users: [
                        { id: 1, name: 'Alice' },
                        { id: 2, name: 'Bob' }
                    ]
                }
            };

            mockWs.simulateMessage(successMessage);

            const state = store.getState();
            expect(state.chat.connected).toBe(true);
            expect(state.chat.users).toHaveLength(2);
            expect(state.chat.users).toEqual(successMessage.payload.users);

            console.log('✅ Success messages update state correctly');
        });

        test('should handle error responses with correct types', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            // Simulate error response
            const errorMessage = {
                type: 'chat/sendMessage_ERROR',
                payload: {
                    message: 'Message failed to send',
                    code: 'SEND_FAILED',
                    timestamp: Date.now()
                },
                error: true
            };

            mockWs.simulateMessage(errorMessage);

            const state = store.getState();
            expect(state.chat.error).toEqual(errorMessage.payload);

            console.log('✅ Error messages are handled correctly');
        });

        test('should handle update messages (live data streams)', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            // Simulate multiple update messages
            const updates = [
                {
                    type: 'chat/sendMessage_UPDATE',
                    payload: { id: 1, text: 'Message 1', user: 'Alice' }
                },
                {
                    type: 'chat/sendMessage_UPDATE', 
                    payload: { id: 2, text: 'Message 2', user: 'Bob' }
                },
                {
                    type: 'chat/joinRoom_UPDATE',
                    payload: { type: 'user_joined', user: { id: 3, name: 'Charlie' } }
                }
            ];

            updates.forEach(update => mockWs.simulateMessage(update));

            const state = store.getState();
            expect(state.chat.messages).toHaveLength(2);
            expect(state.chat.users).toHaveLength(1);
            expect(state.chat.users[0].name).toBe('Charlie');

            console.log('✅ Update messages (live streams) work correctly');
        });

        test('should ignore non-Redux action messages', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            const initialState = store.getState();

            // Simulate various non-Redux messages that should be ignored
            const nonReduxMessages = [
                { data: 'plain string' },
                { type: 'invalid_type', payload: 'test' },
                { message: 'No type field' },
                { type: 'chat/invalid' }, // Doesn't match expected patterns
            ];

            nonReduxMessages.forEach(msg => mockWs.simulateMessage(msg));

            // State should remain unchanged
            const finalState = store.getState();
            expect(finalState).toEqual(initialState);

            console.log('✅ Non-Redux messages are properly ignored');
        });

        test('should handle malformed JSON gracefully', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Simulate malformed JSON
            mockWs.simulateMessage('invalid json {');

            // Should not crash, just log error
            expect(consoleSpy).toHaveBeenCalledWith(
                'Redux Unified: WebSocket message parse error',
                expect.any(Error)
            );

            consoleSpy.mockRestore();

            console.log('✅ Malformed JSON is handled gracefully');
        });
    });

    describe('Type Matching Validation', () => {
        test('should accept messages with valid Redux action type patterns', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            const initialState = store.getState();

            // These should be dispatched (valid patterns)
            const validResponses = [
                { type: 'chat/sendMessage_SUCCESS', payload: { success: true } },
                { type: 'chat/sendMessage_UPDATE', payload: { text: 'response' } },
                { type: 'chat/sendMessage_ERROR', payload: { error: 'failed' } },
                { type: 'other/action_UPDATE', payload: { data: 'test' } } // Also valid pattern
            ];

            // These should be ignored (invalid patterns)
            const invalidResponses = [
                { type: 'random_action', payload: { data: 'test' } }, // No _SUCCESS/_ERROR/_UPDATE
                { type: 'invalid', payload: 'test' },
                { type: 'chat/invalid', payload: 'test' }
            ];

            // Valid responses should be dispatched
            validResponses.forEach(response => mockWs.simulateMessage(response));
            
            // Check that valid success/error responses updated state
            const stateAfterValid = store.getState();
            expect(stateAfterValid.chat.error).toEqual({ error: 'failed' }); // Last error

            // Invalid responses should be ignored (no additional state changes)
            invalidResponses.forEach(response => mockWs.simulateMessage(response));
            
            const finalState = store.getState();
            expect(finalState.chat.error).toEqual({ error: 'failed' }); // No change from invalid messages

            console.log('✅ Message type pattern validation works correctly');
        });

        test('should validate complete action format requirements', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            const validAction = {
                type: 'chat/sendMessage_UPDATE',
                payload: { text: 'valid message' }
            };

            const initialMessageCount = store.getState().chat.messages.length;

            // Valid action should work
            mockWs.simulateMessage(validAction);
            expect(store.getState().chat.messages.length).toBe(initialMessageCount + 1);

            // Test actions without payload (should still work for valid types)
            const actionWithoutPayload = { type: 'chat/sendMessage_UPDATE' };
            mockWs.simulateMessage(actionWithoutPayload);
            expect(store.getState().chat.messages.length).toBe(initialMessageCount + 2);

            // Invalid actions should be ignored
            const invalidActions = [
                { payload: { text: 'no type' } }, // Missing type (should be ignored)
                null, // Null (should be ignored)
                undefined, // Undefined (should be ignored)
                { type: 'invalid_type', payload: 'test' } // Wrong type pattern
            ];

            const messageCountBeforeInvalid = store.getState().chat.messages.length;
            
            invalidActions.forEach(action => {
                mockWs.simulateMessage(action);
            });
            
            // Count should not change for invalid actions
            expect(store.getState().chat.messages.length).toBe(messageCountBeforeInvalid);

            console.log('✅ Action format validation is robust');
        });
    });

    describe('Real-world Scenarios', () => {
        test('should handle chat room simulation with multiple message types', async () => {
            await new Promise(resolve => setTimeout(resolve, 20));

            // Simulate a complete chat room interaction
            const scenario = [
                // 1. Join room
                {
                    action: slice.endpoints.joinRoom.action({ userId: 1, username: 'Alice' }),
                    responses: [
                        { type: 'chat/joinRoom_SUCCESS', payload: { users: [{ id: 1, name: 'Alice' }] } }
                    ]
                },
                // 2. Send message
                {
                    action: slice.endpoints.sendMessage.action({ text: 'Hello everyone!' }),
                    responses: [
                        { type: 'chat/sendMessage_SUCCESS', payload: { messageId: 'msg_1' } },
                        { type: 'chat/sendMessage_UPDATE', payload: { id: 'msg_1', text: 'Hello everyone!', user: 'Alice' } }
                    ]
                },
                // 3. Another user joins
                {
                    responses: [
                        { type: 'chat/joinRoom_UPDATE', payload: { type: 'user_joined', user: { id: 2, name: 'Bob' } } }
                    ]
                },
                // 4. Receive message from other user
                {
                    responses: [
                        { type: 'chat/sendMessage_UPDATE', payload: { id: 'msg_2', text: 'Hi Alice!', user: 'Bob' } }
                    ]
                }
            ];

            for (const step of scenario) {
                if (step.action) {
                    store.dispatch(step.action);
                }
                
                step.responses.forEach(response => {
                    mockWs.simulateMessage(response);
                });
            }

            const finalState = store.getState();
            
            // Validate final state
            expect(finalState.chat.connected).toBe(true);
            expect(finalState.chat.users).toHaveLength(2);
            expect(finalState.chat.messages).toHaveLength(2);
            expect(finalState.chat.messages[0].text).toBe('Hello everyone!');
            expect(finalState.chat.messages[1].text).toBe('Hi Alice!');

            console.log('✅ Real-world chat scenario works perfectly');
        });
    });
}); 