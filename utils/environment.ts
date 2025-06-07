/**
 * Environment Detection and Polyfills for Redux Unified
 * 
 * This module handles cross-environment compatibility between Node.js and Browser
 */

// Check if we're in Node.js environment
export const isNodeJS = typeof window === 'undefined' && (typeof global !== 'undefined' || typeof process !== 'undefined');

// Check if we're in Browser environment
export const isBrowser = typeof window !== 'undefined';

// Check if we're in test environment
export const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

/**
 * Get fetch implementation
 * - Browser: native fetch
 * - Node.js: requires 'node-fetch' or similar polyfill
 * - Test: needs to be mocked
 */
export function getFetch(): typeof fetch {
    if (isBrowser && typeof fetch !== 'undefined') {
        return fetch;
    }
    
    if (isNodeJS) {
        try {
            // Try to import node-fetch if available
            const nodeFetch = require('node-fetch');
            return nodeFetch.default || nodeFetch;
        } catch (error) {
            // Try native Node.js fetch (Node 18+)
            if (typeof globalThis.fetch !== 'undefined') {
                return globalThis.fetch;
            }
            
            throw new Error(
                'Redux Unified: fetch is not available. ' +
                'Please install node-fetch or use Node.js 18+ for native fetch support. ' +
                'For testing, ensure fetch is properly mocked.'
            );
        }
    }
    
    throw new Error('Redux Unified: fetch is not available in this environment');
}

/**
 * Get WebSocket implementation
 * - Browser: native WebSocket
 * - Node.js: requires 'ws' package
 * - Test: needs to be mocked
 */
export function getWebSocket(): typeof WebSocket {
    if (isBrowser && typeof WebSocket !== 'undefined') {
        return WebSocket;
    }
    
    if (isNodeJS) {
        try {
            // Try to import ws package
            const WS = require('ws');
            return WS.WebSocket || WS.default || WS;
        } catch (error) {
            throw new Error(
                'Redux Unified: WebSocket is not available. ' +
                'Please install the "ws" package for Node.js WebSocket support. ' +
                'For testing, ensure WebSocket is properly mocked.'
            );
        }
    }
    
    throw new Error('Redux Unified: WebSocket is not available in this environment');
}

/**
 * Environment-safe fetch wrapper
 */
export async function envFetch(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    const fetchImpl = getFetch();
    return fetchImpl(input, init);
}

/**
 * Environment-safe WebSocket constructor
 */
export function envWebSocket(
    url: string | URL,
    protocols?: string | string[]
): WebSocket {
    const WebSocketImpl = getWebSocket();
    return new WebSocketImpl(url, protocols);
}

/**
 * Check if HTTP functionality is available
 */
export function isHttpAvailable(): boolean {
    try {
        getFetch();
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if WebSocket functionality is available
 */
export function isWebSocketAvailable(): boolean {
    try {
        getWebSocket();
        return true;
    } catch {
        return false;
    }
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
    return {
        isNodeJS,
        isBrowser,
        isTestEnvironment,
        httpAvailable: isHttpAvailable(),
        webSocketAvailable: isWebSocketAvailable(),
        userAgent: isBrowser ? navigator.userAgent : 'Node.js',
        nodeVersion: isNodeJS ? process.version : undefined
    };
} 