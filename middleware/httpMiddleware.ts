/**
 * HTTP Middleware for Redux Unified
 * 
 * This middleware handles HTTP API calls with authentication, caching, and error handling
 */

import { Middleware, MiddlewareAPI, Dispatch, Action } from 'redux';
import { createAction, PayloadActionCreator } from '@reduxjs/toolkit';

import {
    IHttpAction,
    IHttpActionArgs,
    IHttpActionCreators,
    IHttpMiddlewareConfig,
    IAuthConfig,
    IApiError,
    ICacheEntry
} from '../types';

import { 
    pathToUrl, 
    getApiPath, 
    createHttpClient
} from '../utils';

import { envFetch } from '../utils/environment';

// HTTP middleware symbol (similar to RSAA symbol)
export const HTTP_ACTION = Symbol('HTTP_ACTION');

/**
 * Create HTTP action creator
 */
export function createHttpAction<RequestPayload = void, ResponsePayload = void, ErrorPayload = any>(
    config: {
        path: string;
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        type: string;
        meta?: (payload?: RequestPayload) => any;
        cache?: boolean;
        cache_key?: string;
        headers?: Record<string, string>;
        timeout?: number;
    }
): IHttpActionCreators<RequestPayload, ResponsePayload, ErrorPayload> {
    const type_request = `${config.type}_REQUEST`;
    const type_success = `${config.type}_SUCCESS`;
    const type_error = `${config.type}_ERROR`;

    const actionCreator = (args: IHttpActionArgs<RequestPayload> = {}): IHttpAction<RequestPayload> => {
        const action: any = {
            type: config.type,
            payload: args.body
        };
        
        // Add HTTP-specific metadata using symbol
        action[HTTP_ACTION] = {
            endpoint: pathToUrl(config.path, args.pathParams, args.queryParams),
            method: config.method,
            body: args.body,
            headers: { ...config.headers, ...args.headers },
            types: [type_request, type_success, type_error],
            meta: config.meta ? config.meta(args.body) : undefined,
            cache: config.cache,
            cache_key: config.cache_key,
            timeout: config.timeout
        };
        
        return action;
    };

    return {
        action: actionCreator,
        request: createAction(type_request),
        success: createAction(type_success),
        error: createAction(type_error),
        type_request,
        type_success,
        type_error
    };
}

/**
 * HTTP middleware configuration
 */
let middlewareConfig: IHttpMiddlewareConfig = {
    baseURL: '',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
};

/**
 * Configure HTTP middleware
 */
export function configureHttpMiddleware(config: Partial<IHttpMiddlewareConfig>): void {
    middlewareConfig = { ...middlewareConfig, ...config };
}

/**
 * HTTP middleware implementation
 */
export const httpMiddleware: any = 
    (store: MiddlewareAPI) => (next: Dispatch) => async (action: any) => {
        // Check if this is an HTTP action
        if (!action || !(HTTP_ACTION in action)) {
            return next(action);
        }

        const httpAction = action as IHttpAction;
        const config = (httpAction as any)[HTTP_ACTION];
        
        // Dispatch request action
        store.dispatch({ type: config.types[0], payload: undefined });

        try {
            // Check cache first
            if (config.cache && config.method === 'GET') {
                const cacheKey = getCacheKey(config.endpoint, config.cache_key);
                const cached = getCachedResponse(cacheKey);
                
                if (cached) {
                    store.dispatch({ 
                        type: config.types[1], 
                        payload: cached.data,
                        meta: { ...config.meta, fromCache: true }
                    });
                    return;
                }
            }

            // Prepare request
            let requestConfig = {
                method: config.method,
                headers: {
                    ...middlewareConfig.headers,
                    ...config.headers,
                    ...getAuthHeader(middlewareConfig.auth)
                },
                timeout: config.timeout || middlewareConfig.timeout
            };

            // Apply request interceptor if configured
            if (middlewareConfig.interceptors?.request) {
                requestConfig = middlewareConfig.interceptors.request(requestConfig);
            }

            // Add body for non-GET requests
            if (config.method !== 'GET' && config.body) {
                (requestConfig as any).body = JSON.stringify(config.body);
            }

            // Make HTTP request
            const url = getApiPath(config.endpoint, middlewareConfig.baseURL);
            const response = await envFetch(url, requestConfig);

            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const apiError: IApiError = {
                    message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
                    status: response.status,
                    code: errorData.code,
                    data: errorData,
                    timestamp: Date.now()
                };

                store.dispatch({ 
                    type: config.types[2], 
                    payload: apiError,
                    error: true,
                    meta: config.meta
                });
                return;
            }

            // Parse response
            const responseData = await response.json();

            // Cache successful GET responses
            if (config.cache && config.method === 'GET' && middlewareConfig.cache?.enabled) {
                const cacheKey = getCacheKey(config.endpoint, config.cache_key);
                setCachedResponse(cacheKey, responseData, middlewareConfig.cache.ttl);
            }

            // Dispatch success action
            store.dispatch({ 
                type: config.types[1], 
                payload: responseData,
                meta: config.meta
            });

        } catch (error: any) {
            // Handle network errors
            const apiError: IApiError = {
                message: error.message || 'Network request failed',
                status: 0,
                code: 'NETWORK_ERROR',
                data: error,
                timestamp: Date.now()
            };

            store.dispatch({ 
                type: config.types[2], 
                payload: apiError,
                error: true,
                meta: config.meta
            });

            // Handle authentication errors
            if (error.status === 401 && middlewareConfig.auth?.onAuthError) {
                middlewareConfig.auth.onAuthError(apiError);
            }
        }
    };

/**
 * Get authentication header based on configuration
 */
function getAuthHeader(authConfig?: IAuthConfig): Record<string, string> {
    if (!authConfig || !authConfig.getToken) {
        return {};
    }

    const token = authConfig.getToken();
    if (!token) {
        return {};
    }

    switch (authConfig.type) {
        case 'bearer':
            return {
                'Authorization': `${authConfig.tokenPrefix || 'Bearer'} ${token}`
            };
        case 'basic':
            return {
                'Authorization': `Basic ${token}`
            };
        case 'custom':
            return {
                [authConfig.tokenKey || 'Authorization']: token
            };
        default:
            return {};
    }
}

/**
 * Create cache key for request
 */
function getCacheKey(endpoint: string, customKey?: string): string {
    return customKey || `http_cache_${endpoint}`;
}

/**
 * Get cached response
 */
function getCachedResponse(key: string): ICacheEntry | null {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const entry: ICacheEntry = JSON.parse(cached);
        
        // Check if cache entry is expired
        if (Date.now() > entry.timestamp + entry.ttl) {
            localStorage.removeItem(key);
            return null;
        }

        return entry;
    } catch {
        return null;
    }
}

/**
 * Set cached response
 */
function setCachedResponse(key: string, data: any, ttl: number = 300000): void {
    try {
        const entry: ICacheEntry = {
            data,
            timestamp: Date.now(),
            ttl
        };
        localStorage.setItem(key, JSON.stringify(entry));
    } catch {
        // Ignore cache write errors
    }
} 