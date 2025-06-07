/**
 * Tests for main index exports
 */

import * as ReduxUnified from '../index';

// Mock the individual modules
jest.mock('../slice', () => ({
    createSlice: jest.fn(() => ({ name: 'testSlice', reducer: jest.fn() })),
    createApiSlice: jest.fn(() => ({ name: 'apiSlice', reducer: jest.fn() })),
    createSocketSlice: jest.fn(() => ({ name: 'socketSlice', reducer: jest.fn() }))
}));

jest.mock('../middleware/websocketMiddleware', () => ({
    websocketMiddleware: jest.fn(),
    createWebSocketAction: jest.fn(),
    configureWebSocketMiddleware: jest.fn(),
    initializeWebSocket: jest.fn(),
    sendWebSocketMessage: jest.fn(),
    getWebSocketStatus: jest.fn(() => 'connected'),
    closeWebSocket: jest.fn(),
    reconnectWebSocket: jest.fn()
}));

describe('Index Exports', () => {
    test('should export createSlice function', () => {
        expect(typeof ReduxUnified.createSlice).toBe('function');
        
        // Test that it can be called
        const slice = ReduxUnified.createSlice({
            name: 'test',
            initialState: {},
            reducers: {}
        });
        
        expect(slice).toBeDefined();
        expect(slice.name).toBe('testSlice');
    });

    test('should export createApiSlice function', () => {
        expect(typeof ReduxUnified.createApiSlice).toBe('function');
        
        // Test that it can be called
        const slice = ReduxUnified.createApiSlice({
            name: 'api',
            initialState: {},
            endpoints: {}
        });
        
        expect(slice).toBeDefined();
        expect(slice.name).toBe('apiSlice');
    });

    test('should export createSocketSlice function', () => {
        expect(typeof ReduxUnified.createSocketSlice).toBe('function');
        
        // Test that it can be called
        const slice = ReduxUnified.createSocketSlice({
            name: 'socket',
            initialState: {},
            endpoints: {}
        });
        
        expect(slice).toBeDefined();
        expect(slice.name).toBe('socketSlice');
    });

    test('should export websocket middleware functions', () => {
        expect(typeof ReduxUnified.websocketMiddleware).toBe('function');
        expect(typeof ReduxUnified.createWebSocketAction).toBe('function');
        expect(typeof ReduxUnified.configureWebSocketMiddleware).toBe('function');
        expect(typeof ReduxUnified.initializeWebSocket).toBe('function');
        expect(typeof ReduxUnified.sendWebSocketMessage).toBe('function');
        expect(typeof ReduxUnified.getWebSocketStatus).toBe('function');
        expect(typeof ReduxUnified.closeWebSocket).toBe('function');
        expect(typeof ReduxUnified.reconnectWebSocket).toBe('function');
    });

    test('should be able to call websocket functions', () => {
        // Test websocket status function
        const status = ReduxUnified.getWebSocketStatus();
        expect(status).toBe('connected');

        // Test other websocket functions don't throw
        expect(() => ReduxUnified.initializeWebSocket('ws://test')).not.toThrow();
        expect(() => ReduxUnified.sendWebSocketMessage({ type: 'test' })).not.toThrow();
        expect(() => ReduxUnified.closeWebSocket()).not.toThrow();
        expect(() => ReduxUnified.reconnectWebSocket()).not.toThrow();
        expect(() => ReduxUnified.configureWebSocketMiddleware({})).not.toThrow();
        expect(() => ReduxUnified.createWebSocketAction({ type: 'test' })).not.toThrow();
    });

    test('should allow creating middleware instance', () => {
        const middleware = ReduxUnified.websocketMiddleware;
        expect(typeof middleware).toBe('function');
    });

    test('should provide all expected exports', () => {
        const expectedExports = [
            // Slice creators
            'createSlice',
            'createApiSlice', 
            'createSocketSlice',
            
            // WebSocket middleware
            'websocketMiddleware',
            'createWebSocketAction',
            'configureWebSocketMiddleware',
            'initializeWebSocket',
            'sendWebSocketMessage',
            'getWebSocketStatus',
            'closeWebSocket',
            'reconnectWebSocket'
        ];

        expectedExports.forEach(exportName => {
            expect(ReduxUnified).toHaveProperty(exportName);
            expect(typeof (ReduxUnified as any)[exportName]).toBe('function');
        });
    });

    test('should have consistent API structure', () => {
        // Test that exported functions maintain expected signatures
        expect(ReduxUnified.createSlice).toBeDefined();
        expect(ReduxUnified.createApiSlice).toBeDefined();
        expect(ReduxUnified.createSocketSlice).toBeDefined();
        
        // All should be functions
        expect(typeof ReduxUnified.createSlice).toBe('function');
        expect(typeof ReduxUnified.createApiSlice).toBe('function');
        expect(typeof ReduxUnified.createSocketSlice).toBe('function');
    });

    test('should not expose internal implementation details', () => {
        // These should not be exported in the public API
        expect(ReduxUnified).not.toHaveProperty('globalConfig');
        expect(ReduxUnified).not.toHaveProperty('internalState');
        expect(ReduxUnified).not.toHaveProperty('__internal__');
    });
}); 