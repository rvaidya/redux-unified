/**
 * Type definitions for Redux Unified package
 */

import { 
    PayloadAction, 
    CaseReducer, 
    SliceCaseReducers,
    CreateSliceOptions,
    ActionCreatorWithPayload,
    ActionCreatorWithoutPayload,
    ActionCreatorWithOptionalPayload
} from "@reduxjs/toolkit";

// ===================================
// SLICE TYPES
// ===================================

/**
 * Friendly endpoint type enum
 */
export enum EndpointType {
    /** HTTP/REST API endpoint for web requests */
    HTTP = 'rsaa',
    /** WebSocket endpoint for real-time connections */
    WEBSOCKET = 'socket'
}

/**
 * Reducer case handlers for endpoints
 */
export interface IEndpointCaseReducers<State> {
    request?: CaseReducer<State, PayloadAction<any>>;
    update?: CaseReducer<State, PayloadAction<any>>;
    success?: CaseReducer<State, PayloadAction<any>>;
    error?: CaseReducer<State, PayloadAction<any>>;
}

/**
 * HTTP endpoint configuration
 */
export interface IHttpEndpointConfig<RequestPayload = void, ResponsePayload = void, ErrorPayload = any> {
    path: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    meta?: (payload?: RequestPayload) => any;
    cache?: boolean;
    cache_key?: string;
    headers?: Record<string, string>;
    timeout?: number;
}

/**
 * WebSocket endpoint configuration
 */
export interface IWebSocketEndpointConfig {
    room?: string;
    channel?: string;
    [key: string]: any;
}

/**
 * HTTP endpoint definition
 */
export interface IRsaaEndpoint<State, RequestPayload = void, ResponsePayload = void, ErrorPayload = any> {
    type: EndpointType.HTTP | "rsaa"; // Support both enum and legacy string
    config: IHttpEndpointConfig<RequestPayload, ResponsePayload, ErrorPayload>;
    reducers?: IEndpointCaseReducers<State>;
}

/**
 * WebSocket endpoint definition
 */
export interface ISocketEndpoint<State, RequestPayload = void, ResponsePayload = void, ErrorPayload = any> {
    type: EndpointType.WEBSOCKET | "socket"; // Support both enum and legacy string
    config?: IWebSocketEndpointConfig;
    reducers?: IEndpointCaseReducers<State>;
}

/**
 * All endpoint types
 */
export type IEndpoint<State, RequestPayload = void, ResponsePayload = void, ErrorPayload = any> =
    | IRsaaEndpoint<State, RequestPayload, ResponsePayload, ErrorPayload>
    | ISocketEndpoint<State, RequestPayload, ResponsePayload, ErrorPayload>;

/**
 * Enhanced slice configuration that extends Redux Toolkit's CreateSliceOptions
 */
export interface IUnifiedSliceOptions<
    State,
    CaseReducers extends SliceCaseReducers<State>,
    Name extends string = string
> extends CreateSliceOptions<State, CaseReducers, Name> {
    /**
     * HTTP and WebSocket endpoint definitions
     */
    endpoints?: Record<string, IEndpoint<State, any, any, any>>;
}

/**
 * HTTP action creators
 */
export interface IHttpActionCreators<RequestPayload = void, ResponsePayload = void, ErrorPayload = any> {
    action: (args?: IHttpActionArgs<RequestPayload>) => IHttpAction<RequestPayload>;
    request: any; // Simplified to avoid complex Redux Toolkit type issues
    success: any;
    error: any;
    type_request: string;
    type_success: string;
    type_error: string;
}

/**
 * WebSocket action creators
 */
export interface IWebSocketActionCreators<RequestPayload = void, ResponsePayload = void, ErrorPayload = any> {
    action: (payload?: RequestPayload) => IWebSocketAction<RequestPayload>;
    request: any; // Simplified to avoid complex Redux Toolkit type issues
    update: any;
    success: any;
    error: any;
    type_request: string;
    type_update: string;
    type_success: string;
    type_error: string;
}

/**
 * Endpoint actions (HTTP and WebSocket)
 */
export interface IEndpointActions {
    [key: string]: IHttpActionCreators<any, any, any> | IWebSocketActionCreators<any, any, any>;
}

/**
 * Combined actions from regular reducers and endpoints
 */
export interface ICombinedActions {
    [key: string]: any;
}

/**
 * Enhanced slice result that includes endpoints
 */
export interface IUnifiedSlice<
    State,
    CaseReducers extends SliceCaseReducers<State>,
    Name extends string = string
> {
    name: Name;
    reducer: any;
    actions: ICombinedActions;
    actionTypes: Record<string, string>;
    endpoints: IEndpointActions;
    caseReducers: any;
    getInitialState: () => State;
}

// ===================================
// HTTP TYPES
// ===================================

/**
 * HTTP action arguments
 */
export interface IHttpActionArgs<P = void> {
    body?: P;
    pathParams?: Record<string, string | number>;
    queryParams?: Record<string, string | number>;
    headers?: Record<string, string>;
}

/**
 * HTTP action structure
 */
export interface IHttpAction<P = void> {
    type: string;
    payload?: P;
    meta?: any;
    [key: symbol]: any; // Allow additional symbol properties for middleware
}

/**
 * Authentication configuration
 */
export interface IAuthConfig {
    type: 'bearer' | 'basic' | 'custom';
    tokenKey?: string;
    tokenPrefix?: string;
    getToken?: () => string | null;
    setToken?: (token: string) => void;
    clearToken?: () => void;
    refreshEndpoint?: string;
    onAuthError?: (error: any) => void;
}

/**
 * HTTP client configuration
 */
export interface IHttpConfig {
    baseURL: string;
    timeout?: number;
    headers?: Record<string, string>;
    auth?: IAuthConfig;
    interceptors?: {
        request?: (config: any) => any;
        response?: (response: any) => any;
        error?: (error: any) => any;
    };
}

/**
 * HTTP middleware configuration
 */
export interface IHttpMiddlewareConfig extends IHttpConfig {
    cache?: {
        enabled: boolean;
        ttl?: number;
        storage?: 'memory' | 'localStorage' | 'sessionStorage';
    };
}

// ===================================
// WEBSOCKET TYPES
// ===================================

/**
 * WebSocket action structure
 */
export interface IWebSocketAction<P = void> {
    type: string;
    payload?: P;
    meta?: {
        socket: {
            types: string[];
            room?: string;
            channel?: string;
        };
    };
}

/**
 * WebSocket configuration
 */
export interface IWebSocketConfig {
    url: string;
    protocols?: string[];
    reconnect?: {
        enabled: boolean;
        maxAttempts?: number;
        delay?: number;
        backoff?: boolean;
    };
    heartbeat?: {
        enabled: boolean;
        interval?: number;
        message?: any;
    };
    auth?: {
        type: 'token' | 'custom';
        getToken?: () => string | null;
        tokenParam?: string;
    };
}

/**
 * WebSocket middleware configuration
 */
export interface IWebSocketMiddlewareConfig extends IWebSocketConfig {
    eventNames?: {
        action: string;
        response: string;
    };
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
    onMessage?: (message: MessageEvent) => void;
}

// ===================================
// API ERROR TYPES
// ===================================

/**
 * API error structure
 */
export interface IApiError<T = any> {
    message: string;
    status?: number;
    code?: string;
    data?: T;
    timestamp?: number;
}

/**
 * HTTP API error action
 */
export interface IHttpApiErrorAction<T = any> extends PayloadAction<IApiError<T>> {
    error: true;
}

// ===================================
// UTILITY TYPES
// ===================================

/**
 * Request parameters for path substitution
 */
export interface IRequestParams {
    [key: string | number]: string | number;
}

/**
 * Cache entry structure
 */
export interface ICacheEntry<T = any> {
    data: T;
    timestamp: number;
    ttl: number;
    accessCount?: number;
    lastAccessed?: number;
}

/**
 * Cache configuration
 */
export interface ICacheConfig {
    maxSize?: number;
    ttl?: number;
    storage?: 'memory' | 'localStorage' | 'sessionStorage';
    enableLRU?: boolean;
} 