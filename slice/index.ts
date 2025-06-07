/**
 * Unified Redux Slice Creator
 * 
 * This module provides the main createSlice function that works with HTTP and WebSocket endpoints
 */

import { 
    createSlice as rtk_createSlice, 
    SliceCaseReducers,
    PayloadAction,
    createAction,
    current,
    original
} from "@reduxjs/toolkit";
import { produce } from "immer";
import { EndpointType } from '../types';

/**
 * Simplified unified slice options
 */
export interface UnifiedSliceOptions<State, CaseReducers extends SliceCaseReducers<State>, Name extends string = string> {
    name: Name;
    initialState: State | (() => State);
    reducers?: CaseReducers;
    endpoints?: {
        [K: string]: {
            type: EndpointType.HTTP | EndpointType.WEBSOCKET | 'rsaa' | 'socket';
            config?: {
                path?: string;
                method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
                cache?: boolean;
                [key: string]: any;
            };
            reducers?: {
                request?: (state: State, action: PayloadAction<any>) => State | void;
                update?: (state: State, action: PayloadAction<any>) => State | void;
                success?: (state: State, action: PayloadAction<any>) => State | void;
                error?: (state: State, action: PayloadAction<any>) => State | void;
            };
        };
    };
}

/**
 * Action creator for HTTP endpoints
 */
export interface HttpActionCreators {
    action: (args?: { body?: any; pathParams?: any; queryParams?: any; headers?: any }) => any;
    request: any;
    success: any;
    error: any;
    type_request: string;
    type_success: string;
    type_error: string;
}

/**
 * Action creator for WebSocket endpoints  
 */
export interface SocketActionCreators {
    action: (payload?: any) => any;
    request: any;
    update: any;
    success: any;
    error: any;
    type_request: string;
    type_update: string;
    type_success: string;
    type_error: string;
}



/**
 * Creates a unified Redux slice that handles regular actions, HTTP endpoints, and WebSocket endpoints
 * 
 * This extends Redux Toolkit's createSlice with support for HTTP and WebSocket endpoints
 * while maintaining all the benefits and familiar API of Redux Toolkit.
 */
export function createSlice<
    State,
    CaseReducers extends SliceCaseReducers<State>,
    Name extends string = string
>(
    options: UnifiedSliceOptions<State, CaseReducers, Name>
): any {
    const { endpoints = {}, ...rtkOptions } = options;
    
    // Create the base Redux Toolkit slice
    const baseSlice = rtk_createSlice(rtkOptions as any);
    
    // Generate endpoint actions
    const endpointActions: any = {};
    
    // Process endpoints to create actions
    Object.entries(endpoints).forEach(([endpointName, endpoint]) => {
        const actionType = `${options.name}/${endpointName}`;
        
        // Check for HTTP endpoint (both enum and legacy string)
        const isHttpEndpoint = (endpoint.type as string) === EndpointType.HTTP || (endpoint.type as string) === 'rsaa';
        // Check for WebSocket endpoint (both enum and legacy string)  
        const isWebSocketEndpoint = (endpoint.type as string) === EndpointType.WEBSOCKET || (endpoint.type as string) === 'socket';
        
        if (isHttpEndpoint) {
            // Create HTTP action creators (simplified)
            const type_request = `${actionType}_REQUEST`;
            const type_success = `${actionType}_SUCCESS`;
            const type_error = `${actionType}_ERROR`;
            
            endpointActions[endpointName] = {
                action: (args: any = {}) => {
                    // Create action compatible with existing RSAA middleware
                    const action: any = {
                        type: actionType,
                        payload: args.body,
                        meta: { 
                            cache: endpoint.config?.cache,
                            cache_key: endpoint.config?.cache ? `${endpoint.config.path}|${JSON.stringify(args.body)}` : undefined,
                            ...endpoint.config
                        }
                    };
                    
                    // Add RSAA symbol for compatibility with existing middleware
                    const RSAA_SYMBOL = '@@redux-api-middleware/RSAA';
                    action[RSAA_SYMBOL] = {
                        endpoint: endpoint.config?.path || '',
                        method: endpoint.config?.method || 'GET',
                        body: args.body,
                        types: [type_request, type_success, type_error]
                    };
                    
                    return action;
                },
                request: createAction(type_request),
                success: createAction(type_success),
                error: createAction(type_error),
                type_request,
                type_success,
                type_error
            };
        } else if (isWebSocketEndpoint) {
            // Create WebSocket action creators
            const type_request = `${actionType}_REQUEST`;
            const type_update = `${actionType}_UPDATE`;
            const type_success = `${actionType}_SUCCESS`;
            const type_error = `${actionType}_ERROR`;
            
            endpointActions[endpointName] = {
                action: (payload?: any) => ({
                    type: actionType,
                    payload,
                    meta: {
                        socket: {
                            types: [type_request, type_update, type_success, type_error],
                            room: endpoint.config?.room,
                            channel: endpoint.config?.channel
                        }
                    }
                }),
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
    });
    
    // Get the actual initial state value
    const actualInitialState = typeof options.initialState === 'function' 
        ? (options.initialState as any)() 
        : options.initialState;

    // Create enhanced reducer that handles both regular actions and endpoints
    const enhancedReducer = (state = actualInitialState, action: any) => {
        // Handle regular Redux Toolkit actions first
        const regularResult = baseSlice.reducer(state, action);
        if (regularResult !== state) {
            return regularResult;
        }
        
        // Handle endpoint actions manually
        for (const [endpointName, endpoint] of Object.entries(endpoints)) {
            const endpointAction = endpointActions[endpointName];
            
            if (endpoint.reducers) {
                // Handle request actions
                if (endpoint.reducers.request && action.type === endpointAction.type_request) {
                    return produce(state, (draft: any) => {
                        const result = endpoint.reducers!.request!(draft, action);
                        return result !== undefined ? result : draft;
                    });
                }
                
                // Handle update actions (WebSocket)
                if (endpoint.reducers.update && action.type === endpointAction.type_update) {
                    return produce(state, (draft: any) => {
                        const result = endpoint.reducers!.update!(draft, action);
                        return result !== undefined ? result : draft;
                    });
                }
                
                // Handle success actions
                if (endpoint.reducers.success && action.type === endpointAction.type_success) {
                    return produce(state, (draft: any) => {
                        const result = endpoint.reducers!.success!(draft, action);
                        return result !== undefined ? result : draft;
                    });
                }
                
                // Handle error actions
                if (endpoint.reducers.error && action.type === endpointAction.type_error) {
                    return produce(state, (draft: any) => {
                        const result = endpoint.reducers!.error!(draft, action);
                        return result !== undefined ? result : draft;
                    });
                }
            }
        }
        
        return state;
    };
    
    // Combine regular actions with endpoint actions
    const combinedActions = {
        ...baseSlice.actions,
        ...endpointActions
    };
    
    return {
        name: baseSlice.name,
        reducer: enhancedReducer,
        actions: combinedActions,
        endpoints: endpointActions,
        caseReducers: baseSlice.caseReducers,
        getInitialState: baseSlice.getInitialState
    };
}

/**
 * Helper function to create a slice with only HTTP endpoints (extends Redux Toolkit)
 */
export function createApiSlice<
    State,
    CaseReducers extends SliceCaseReducers<State>,
    Name extends string = string
>(
    options: UnifiedSliceOptions<State, CaseReducers, Name>
): any {
    return createSlice(options);
}

/**
 * Helper function to create a slice with only WebSocket endpoints (extends Redux Toolkit)
 */
export function createSocketSlice<
    State,
    CaseReducers extends SliceCaseReducers<State>,
    Name extends string = string
>(
    options: UnifiedSliceOptions<State, CaseReducers, Name>
): any {
    return createSlice(options);
} 