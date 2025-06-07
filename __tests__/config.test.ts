/**
 * Tests for Configuration module
 */

import {
    configureAuth,
    configureHttp,
    configureWebSocket,
    getDefaultConfig,
    initializeWithDefaults
} from '../config/index';

// Mock the middleware functions
jest.mock('../middleware/httpMiddleware', () => ({
    configureHttpMiddleware: jest.fn()
}));

jest.mock('../middleware/websocketMiddleware', () => ({
    configureWebSocketMiddleware: jest.fn()
}));

import { configureHttpMiddleware } from '../middleware/httpMiddleware';
import { configureWebSocketMiddleware } from '../middleware/websocketMiddleware';

const mockConfigureHttpMiddleware = configureHttpMiddleware as jest.MockedFunction<typeof configureHttpMiddleware>;
const mockConfigureWebSocketMiddleware = configureWebSocketMiddleware as jest.MockedFunction<typeof configureWebSocketMiddleware>;

describe('Config Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset environment variables
        delete process.env.REACT_APP_API_URL;
        delete process.env.REACT_APP_WS_URL;
    });

    describe('getDefaultConfig', () => {
        test('should return default configuration with environment variables', () => {
            process.env.REACT_APP_API_URL = 'https://api.example.com';
            process.env.REACT_APP_WS_URL = 'wss://api.example.com/ws';

            const config = getDefaultConfig();

            expect(config.http.baseURL).toBe('https://api.example.com');
            expect(config.websocket.url).toBe('wss://api.example.com/ws');
            expect(config.http.timeout).toBe(10000);
            expect(config.http.headers).toEqual({
                'Content-Type': 'application/json'
            });
        });

        test('should return default configuration without environment variables', () => {
            const config = getDefaultConfig();

            expect(config.http.baseURL).toBe('http://localhost:8000');
            expect(config.websocket.url).toBe('ws://localhost:8000/ws');
            expect(config.http.cache?.enabled).toBe(true);
            expect(config.http.cache?.ttl).toBe(300000);
            expect(config.websocket.reconnect?.enabled).toBe(true);
            expect(config.websocket.reconnect?.maxAttempts).toBe(5);
        });

        test('should return correct auth configuration', () => {
            const config = getDefaultConfig();

            expect(config.auth.type).toBe('bearer');
            expect(config.auth.tokenPrefix).toBe('Bearer');
            expect(config.auth.tokenKey).toBe('Authorization');
        });

        test('should return correct websocket configuration', () => {
            const config = getDefaultConfig();

            expect(config.websocket.reconnect?.delay).toBe(1000);
            expect(config.websocket.reconnect?.backoff).toBe(true);
            expect(config.websocket.heartbeat?.enabled).toBe(true);
            expect(config.websocket.heartbeat?.interval).toBe(30000);
            expect(config.websocket.eventNames?.action).toBe('redux_action');
            expect(config.websocket.eventNames?.response).toBe('redux_response');
        });
    });

    describe('configureAuth', () => {
        test('should configure authentication and update HTTP middleware', () => {
            const authConfig = {
                type: 'bearer' as const,
                tokenPrefix: 'Bearer',
                getToken: () => 'test-token'
            };

            configureAuth(authConfig);

            // Should have called HTTP middleware configuration
            expect(mockConfigureHttpMiddleware).toHaveBeenCalledWith(
                expect.objectContaining({
                    auth: expect.objectContaining(authConfig)
                })
            );
        });

        test('should merge auth configuration with existing config', () => {
            const initialAuth = {
                type: 'bearer' as const,
                tokenPrefix: 'Bearer'
            };

            const updateAuth = {
                getToken: () => 'new-token'
            };

            configureAuth(initialAuth);
            configureAuth(updateAuth);

            expect(mockConfigureHttpMiddleware).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    auth: expect.objectContaining({
                        type: 'bearer',
                        tokenPrefix: 'Bearer',
                        getToken: expect.any(Function)
                    })
                })
            );
        });

        test('should handle empty auth configuration', () => {
            configureAuth({});

            expect(mockConfigureHttpMiddleware).toHaveBeenCalledWith(
                expect.objectContaining({
                    auth: expect.any(Object)
                })
            );
        });
    });

    describe('configureHttp', () => {
        test('should configure HTTP middleware with provided config', () => {
            const httpConfig = {
                baseURL: 'https://api.example.com',
                timeout: 5000,
                headers: {
                    'X-API-Key': 'test-key'
                }
            };

            configureHttp(httpConfig);

            expect(mockConfigureHttpMiddleware).toHaveBeenCalledWith(
                expect.objectContaining(httpConfig)
            );
        });

        test('should merge HTTP configuration with existing config', () => {
            const initialConfig = {
                baseURL: 'https://api.example.com',
                timeout: 5000
            };

            const updateConfig = {
                headers: {
                    'X-Custom': 'header'
                }
            };

            configureHttp(initialConfig);
            configureHttp(updateConfig);

            expect(mockConfigureHttpMiddleware).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    baseURL: 'https://api.example.com',
                    timeout: 5000,
                    headers: {
                        'X-Custom': 'header'
                    }
                })
            );
        });

        test('should include auth config with HTTP config', () => {
            const authConfig = {
                type: 'bearer' as const,
                getToken: () => 'auth-token'
            };

            const httpConfig = {
                baseURL: 'https://api.example.com'
            };

            configureAuth(authConfig);
            configureHttp(httpConfig);

            expect(mockConfigureHttpMiddleware).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    baseURL: 'https://api.example.com',
                    auth: expect.objectContaining(authConfig)
                })
            );
        });
    });

    describe('configureWebSocket', () => {
        test('should configure WebSocket middleware with provided config', () => {
            const wsConfig = {
                url: 'wss://api.example.com/ws',
                reconnect: {
                    enabled: false
                }
            };

            configureWebSocket(wsConfig);

            expect(mockConfigureWebSocketMiddleware).toHaveBeenCalledWith(
                expect.objectContaining(wsConfig)
            );
        });

        test('should merge WebSocket configuration with existing config', () => {
            const initialConfig = {
                url: 'wss://api.example.com/ws',
                reconnect: {
                    enabled: true,
                    maxAttempts: 3
                }
            };

            const updateConfig = {
                heartbeat: {
                    enabled: true,
                    interval: 10000
                }
            };

            configureWebSocket(initialConfig);
            configureWebSocket(updateConfig);

            expect(mockConfigureWebSocketMiddleware).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    url: 'wss://api.example.com/ws',
                    reconnect: {
                        enabled: true,
                        maxAttempts: 3
                    },
                    heartbeat: {
                        enabled: true,
                        interval: 10000
                    }
                })
            );
        });

        test('should handle empty WebSocket configuration', () => {
            configureWebSocket({});

            expect(mockConfigureWebSocketMiddleware).toHaveBeenCalledWith({});
        });
    });

    describe('initializeWithDefaults', () => {
        test('should initialize all modules with default configuration', () => {
            initializeWithDefaults();

            // Should have called all configuration functions
            expect(mockConfigureHttpMiddleware).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: 'http://localhost:8000',
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
            );

            expect(mockConfigureWebSocketMiddleware).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'ws://localhost:8000/ws',
                    reconnect: {
                        enabled: true,
                        maxAttempts: 5,
                        delay: 1000,
                        backoff: true
                    }
                })
            );
        });

        test('should use environment variables when available', () => {
            process.env.REACT_APP_API_URL = 'https://prod.api.com';
            process.env.REACT_APP_WS_URL = 'wss://prod.api.com/ws';

            initializeWithDefaults();

            expect(mockConfigureHttpMiddleware).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: 'https://prod.api.com'
                })
            );

            expect(mockConfigureWebSocketMiddleware).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'wss://prod.api.com/ws'
                })
            );
        });
    });
}); 