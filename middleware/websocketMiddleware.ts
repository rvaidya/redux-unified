/**
 * WebSocket Middleware for Redux Unified
 * 
 * This middleware handles WebSocket connections with authentication, reconnection, and heartbeat
 */

import { Middleware, MiddlewareAPI, Dispatch, Action } from 'redux';
import { createAction } from '@reduxjs/toolkit';

import {
    IWebSocketAction,
    IWebSocketActionCreators,
    IWebSocketMiddlewareConfig,
    IWebSocketConfig
} from '../types';

import { createWebSocketClient } from '../utils';
import { envWebSocket } from '../utils/environment';

// WebSocket middleware symbol
export const WEBSOCKET_ACTION = Symbol('WEBSOCKET_ACTION');

/**
 * Create WebSocket action creator
 */
export function createWebSocketAction<RequestPayload = void, ResponsePayload = void, ErrorPayload = any>(
    config: {
        type: string;
        room?: string;
        channel?: string;
        [key: string]: any;
    }
): IWebSocketActionCreators<RequestPayload, ResponsePayload, ErrorPayload> {
    const type_request = `${config.type}_REQUEST`;
    const type_update = `${config.type}_UPDATE`;
    const type_success = `${config.type}_SUCCESS`;
    const type_error = `${config.type}_ERROR`;

    const actionCreator = (payload?: RequestPayload): IWebSocketAction<RequestPayload> => ({
        type: config.type,
        payload,
        meta: {
            socket: {
                types: [type_request, type_update, type_success, type_error],
                room: config.room,
                channel: config.channel
            }
        }
    });

    return {
        action: actionCreator,
        request: createAction(type_request),
        update: createAction(type_update),
        success: createAction(type_success),
        error: createAction(type_error),
        type_request,
        type_update,
        type_success,
        type_error
    };
}

/**
 * WebSocket middleware configuration
 */
let middlewareConfig: IWebSocketMiddlewareConfig = {
    url: '',
    eventNames: {
        action: 'redux_action',
        response: 'redux_response'
    }
};

/**
 * WebSocket connection instance
 */
let wsConnection: WebSocket | null = null;
let store: MiddlewareAPI | null = null;

/**
 * Configure WebSocket middleware
 */
export function configureWebSocketMiddleware(config: Partial<IWebSocketMiddlewareConfig>): void {
    middlewareConfig = { ...middlewareConfig, ...config };
}

/**
 * Initialize WebSocket connection
 */
export function initializeWebSocket(storeInstance: MiddlewareAPI): void {
    store = storeInstance;
    
    if (!middlewareConfig.url) {
        console.warn('Redux Unified: WebSocket URL not configured');
        return;
    }

    // Close existing connection
    if (wsConnection) {
        wsConnection.close();
    }

    // Create new WebSocket connection
    wsConnection = createWebSocketClient(middlewareConfig);
    
    // Setup event listeners
    wsConnection.onopen = () => {
        console.log('Redux Unified: WebSocket connected');
        if (middlewareConfig.onConnect) {
            middlewareConfig.onConnect();
        }
    };

    wsConnection.onclose = (event) => {
        console.log('Redux Unified: WebSocket disconnected', event);
        if (middlewareConfig.onDisconnect) {
            middlewareConfig.onDisconnect();
        }
    };

    wsConnection.onerror = (event) => {
        console.error('Redux Unified: WebSocket error', event);
        if (middlewareConfig.onError) {
            middlewareConfig.onError(event);
        }
    };

    wsConnection.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            
            // Check if this is a Redux response
            if (message.type && (message.type.includes('_SUCCESS') || 
                message.type.includes('_ERROR') || 
                message.type.includes('_UPDATE'))) {
                store?.dispatch(message);
            }
            
            if (middlewareConfig.onMessage) {
                middlewareConfig.onMessage(event);
            }
        } catch (error) {
            console.error('Redux Unified: WebSocket message parse error', error);
        }
    };
}

/**
 * WebSocket middleware implementation
 */
export const websocketMiddleware: any = 
    (storeInstance: MiddlewareAPI) => (next: Dispatch) => (action: any) => {
        // Initialize WebSocket if not already done
        if (!wsConnection && middlewareConfig.url) {
            initializeWebSocket(storeInstance);
        }

        // Check if this is a WebSocket action
        if (!action || !('meta' in action) || !(action as any).meta?.socket) {
            return next(action);
        }

        const wsAction = action as IWebSocketAction;
        const socketMeta = wsAction.meta!.socket;
        
        // Dispatch request action
        storeInstance.dispatch({ 
            type: socketMeta.types[0], 
            payload: undefined 
        });

        // Check if WebSocket is connected
        if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
            // Dispatch error if not connected
            storeInstance.dispatch({
                type: socketMeta.types[3], // error type
                payload: {
                    message: 'WebSocket not connected',
                    code: 'CONNECTION_ERROR',
                    timestamp: Date.now()
                },
                error: true
            });
            return;
        }

        try {
            // Get current state for token
            const state = storeInstance.getState() as any;
            
            // Get auth token using configured auth function
            let authToken = null;
            if (middlewareConfig.auth?.getToken) {
                authToken = middlewareConfig.auth.getToken();
            } else {
                // Fallback to legacy token lookup
                authToken = state.user?.socket_token || state.auth?.token;
            }
            
            // Prepare WebSocket message
            const message: any = {
                type: wsAction.type,
                response_types: socketMeta.types,
                payload: wsAction.payload !== undefined && wsAction.payload !== null 
                    ? JSON.stringify(wsAction.payload) 
                    : undefined,
                room: socketMeta.room,
                channel: socketMeta.channel,
                timestamp: Date.now()
            };

            // Add auth token if available
            if (authToken) {
                const tokenParam = middlewareConfig.auth?.tokenParam || 'token';
                message[tokenParam] = authToken;
            }

            // Send message
            wsConnection.send(JSON.stringify(message));
            
        } catch (error: any) {
            // Dispatch error action
            storeInstance.dispatch({
                type: socketMeta.types[3], // error type
                payload: {
                    message: error.message || 'WebSocket send error',
                    code: 'SEND_ERROR',
                    data: error,
                    timestamp: Date.now()
                },
                error: true
            });
        }

        return next(action);
    };

/**
 * Send WebSocket message directly
 */
export function sendWebSocketMessage(message: any): boolean {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
        console.warn('Redux Unified: WebSocket not connected');
        return false;
    }

    try {
        wsConnection.send(typeof message === 'string' ? message : JSON.stringify(message));
        return true;
    } catch (error) {
        console.error('Redux Unified: WebSocket send error', error);
        return false;
    }
}

/**
 * Get WebSocket connection status
 */
export function getWebSocketStatus(): {
    connected: boolean;
    readyState: number | null;
    url: string;
} {
    return {
        connected: wsConnection?.readyState === WebSocket.OPEN || false,
        readyState: wsConnection?.readyState || null,
        url: middlewareConfig.url
    };
}

/**
 * Close WebSocket connection
 */
export function closeWebSocket(): void {
    if (wsConnection) {
        wsConnection.close();
        wsConnection = null;
    }
}

/**
 * Reconnect WebSocket
 */
export function reconnectWebSocket(): void {
    closeWebSocket();
    if (store) {
        initializeWebSocket(store);
    }
} 