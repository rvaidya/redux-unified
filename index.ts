/**
 * Redux Unified - A comprehensive Redux extension for HTTP, WebSocket, and regular actions
 * 
 * This package provides a unified interface for handling:
 * - Regular Redux Toolkit actions
 * - HTTP API calls with authentication
 * - WebSocket connections with real-time updates
 * 
 * @author Your Team
 * @version 1.0.0
 */

// Main slice creator
export { 
    createSlice, 
    createApiSlice, 
    createSocketSlice
} from './slice';

// Export types
export type { 
    UnifiedSliceOptions,
    HttpActionCreators,
    SocketActionCreators
} from './slice';

// Export endpoint types and enums
export { 
    EndpointType 
} from './types';

export type {
    IEndpoint,
    IRsaaEndpoint,
    ISocketEndpoint,
    IUnifiedSliceOptions,
    IHttpConfig,
    IWebSocketConfig,
    ICacheEntry,
    ICacheConfig
} from './types';

// Utility functions
export {
    pathToUrl,
    getApiPath,
    createHttpClient,
    getAuthHeader,
    createWebSocketClient,
    getCacheKey,
    getCachedResponse,
    setCachedResponse,
    clearCachedResponse,
    clearAllCachedResponses,
    getCacheStats,
    cleanupMemoryCache,
    configureMemoryCache,
    getMemoryCacheLRUStats,
    getWebStorageLRUStats,
    evictLRUFromWebStorage
} from './utils';

// Middleware
export { 
    websocketMiddleware,
    createWebSocketAction,
    configureWebSocketMiddleware,
    initializeWebSocket,
    sendWebSocketMessage,
    getWebSocketStatus,
    closeWebSocket,
    reconnectWebSocket
} from './middleware/websocketMiddleware';

// Re-export Redux Toolkit types for convenience
export type { 
    PayloadAction, 
    CaseReducer, 
    SliceCaseReducers 
} from "@reduxjs/toolkit"; 