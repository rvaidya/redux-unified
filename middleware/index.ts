/**
 * Middleware exports for Redux Unified
 */

import { configureStore } from '@reduxjs/toolkit';
import { Middleware } from 'redux';

// Export middleware
export { httpMiddleware, configureHttpMiddleware } from './httpMiddleware';
export { 
    websocketMiddleware, 
    configureWebSocketMiddleware,
    initializeWebSocket,
    sendWebSocketMessage,
    getWebSocketStatus,
    closeWebSocket,
    reconnectWebSocket 
} from './websocketMiddleware';

// Import middleware for store setup
import { httpMiddleware } from './httpMiddleware';
import { websocketMiddleware } from './websocketMiddleware';

/**
 * Create Redux store with unified middleware pre-configured
 * 
 * This is a convenience function that sets up a Redux store with
 * both HTTP and WebSocket middleware included.
 * 
 * @example
 * ```typescript
 * import { createStoreWithUnifiedMiddleware } from 'redux-unified';
 * 
 * const store = createStoreWithUnifiedMiddleware({
 *   reducer: rootReducer,
 *   // ... other store options
 * });
 * ```
 */
export function createStoreWithUnifiedMiddleware<StateType = any>(
    options: {
        reducer: any;
        preloadedState?: StateType;
        middleware?: Middleware[];
        devTools?: boolean;
    }
) {
    const { middleware = [], ...storeOptions } = options;
    
    return configureStore({
        ...storeOptions,
        middleware: (getDefaultMiddleware) => 
            getDefaultMiddleware().concat([
                httpMiddleware,
                websocketMiddleware,
                ...middleware
            ])
    });
}

/**
 * Get array of unified middleware for manual store setup
 * 
 * Use this if you want to manually configure your store but still
 * include the unified middleware.
 * 
 * @example
 * ```typescript
 * import { configureStore } from '@reduxjs/toolkit';
 * import { getUnifiedMiddleware } from 'redux-unified';
 * 
 * const store = configureStore({
 *   reducer: rootReducer,
 *   middleware: (getDefaultMiddleware) => 
 *     getDefaultMiddleware().concat(getUnifiedMiddleware())
 * });
 * ```
 */
export function getUnifiedMiddleware(): Middleware[] {
    return [httpMiddleware, websocketMiddleware];
} 