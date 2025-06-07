import { createSlice, EndpointType } from '../index';

interface TestState {
    data: any;
}

interface MessagesState {
    messages: any[];
}

interface CombinedState {
    data: any;
    messages: any[];
}

describe('EndpointType Enum', () => {
    test('should accept EndpointType.HTTP for HTTP endpoints', () => {
        const slice = createSlice({
            name: 'test',
            initialState: { data: null } as TestState,
            endpoints: {
                fetchData: {
                    type: EndpointType.HTTP,
                    config: {
                        path: 'test',
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

        expect(slice.endpoints.fetchData).toBeDefined();
        expect(slice.endpoints.fetchData.action).toBeInstanceOf(Function);
    });

    test('should accept EndpointType.WEBSOCKET for WebSocket endpoints', () => {
        const slice = createSlice({
            name: 'test',
            initialState: { messages: [] } as MessagesState,
            endpoints: {
                liveUpdates: {
                    type: EndpointType.WEBSOCKET,
                    reducers: {
                        update: (state, action) => {
                            state.messages.push(action.payload);
                        }
                    }
                }
            }
        });

        expect(slice.endpoints.liveUpdates).toBeDefined();
        expect(slice.endpoints.liveUpdates.action).toBeInstanceOf(Function);
    });

    test('should still accept legacy string values for backward compatibility', () => {
        const slice = createSlice({
            name: 'test',
            initialState: { data: null, messages: [] } as CombinedState,
            endpoints: {
                httpEndpoint: {
                    type: 'rsaa', // Legacy string
                    config: {
                        path: 'test',
                        method: 'GET'
                    },
                    reducers: {
                        success: (state, action) => {
                            state.data = action.payload;
                        }
                    }
                },
                socketEndpoint: {
                    type: 'socket', // Legacy string
                    reducers: {
                        update: (state, action) => {
                            state.messages.push(action.payload);
                        }
                    }
                }
            }
        });

        expect(slice.endpoints.httpEndpoint).toBeDefined();
        expect(slice.endpoints.socketEndpoint).toBeDefined();
    });

    test('should have correct enum values', () => {
        expect(EndpointType.HTTP).toBe('rsaa');
        expect(EndpointType.WEBSOCKET).toBe('socket');
    });

    test('should be exported from main index', () => {
        expect(EndpointType).toBeDefined();
        expect(typeof EndpointType).toBe('object');
    });
}); 