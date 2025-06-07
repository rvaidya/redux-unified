/**
 * Configuration for Redux Unified package
 */

import {
    IHttpMiddlewareConfig,
    IWebSocketMiddlewareConfig,
    IAuthConfig
} from '../types';

import { configureHttpMiddleware } from '../middleware/httpMiddleware';
import { configureWebSocketMiddleware } from '../middleware/websocketMiddleware';

/**
 * Global configuration state
 */
const globalConfig = {
    http: {} as Partial<IHttpMiddlewareConfig>,
    websocket: {} as Partial<IWebSocketMiddlewareConfig>,
    auth: {} as Partial<IAuthConfig>
};

/**
 * Configure authentication
 */
export function configureAuth(config: Partial<IAuthConfig>): void {
    globalConfig.auth = { ...globalConfig.auth, ...config };
    
    // Update HTTP middleware with auth config
    if (globalConfig.http) {
        configureHttpMiddleware({
            ...globalConfig.http,
            auth: globalConfig.auth as IAuthConfig
        });
    }
}

/**
 * Configure HTTP client
 */
export function configureHttp(config: Partial<IHttpMiddlewareConfig>): void {
    globalConfig.http = { ...globalConfig.http, ...config };
    
    // Include auth config if available
    const httpConfig = {
        ...globalConfig.http,
        auth: globalConfig.auth as IAuthConfig
    };
    
    configureHttpMiddleware(httpConfig);
}

/**
 * Configure WebSocket client
 */
export function configureWebSocket(config: Partial<IWebSocketMiddlewareConfig>): void {
    globalConfig.websocket = { ...globalConfig.websocket, ...config };
    configureWebSocketMiddleware(globalConfig.websocket);
}

/**
 * Get default configuration
 */
export function getDefaultConfig() {
    return {
        http: {
            baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            },
            cache: {
                enabled: true,
                ttl: 300000, // 5 minutes
                storage: 'localStorage' as const
            }
        } as IHttpMiddlewareConfig,
        
        websocket: {
            url: process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws',
            reconnect: {
                enabled: true,
                maxAttempts: 5,
                delay: 1000,
                backoff: true
            },
            heartbeat: {
                enabled: true,
                interval: 30000
            },
            eventNames: {
                action: 'redux_action',
                response: 'redux_response'
            }
        } as IWebSocketMiddlewareConfig,
        
        auth: {
            type: 'bearer' as const,
            tokenPrefix: 'Bearer',
            tokenKey: 'Authorization'
        } as IAuthConfig
    };
}

/**
 * Initialize with default configuration
 */
export function initializeWithDefaults(): void {
    const defaults = getDefaultConfig();
    configureHttp(defaults.http);
    configureWebSocket(defaults.websocket);
    configureAuth(defaults.auth);
} 