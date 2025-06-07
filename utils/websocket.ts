/**
 * WebSocket utilities for Redux Unified
 */

import { IWebSocketConfig } from '../types';
import { envWebSocket } from './environment';

/**
 * Create WebSocket client with configuration
 */
export function createWebSocketClient(config: IWebSocketConfig): WebSocket {
    let url = config.url;

    // Add authentication if configured
    if (config.auth?.type === 'token' && config.auth.getToken) {
        const token = config.auth.getToken();
        if (token) {
            const param = config.auth.tokenParam || 'token';
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}${param}=${encodeURIComponent(token)}`;
        }
    }

    const ws = envWebSocket(url, config.protocols);

    // Setup heartbeat if configured
    if (config.heartbeat?.enabled) {
        const interval = config.heartbeat.interval || 30000;
        const message = config.heartbeat.message || JSON.stringify({ type: 'ping' });
        
        const heartbeatTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(typeof message === 'string' ? message : JSON.stringify(message));
            }
        }, interval);

        ws.addEventListener('close', () => {
            clearInterval(heartbeatTimer);
        });
    }

    // Setup reconnection if configured
    if (config.reconnect?.enabled) {
        let reconnectAttempts = 0;
        const maxAttempts = config.reconnect.maxAttempts || 5;
        const delay = config.reconnect.delay || 1000;
        const backoff = config.reconnect.backoff || false;

        ws.addEventListener('close', (event) => {
            if (reconnectAttempts < maxAttempts && !event.wasClean) {
                const reconnectDelay = backoff 
                    ? delay * Math.pow(2, reconnectAttempts)
                    : delay;

                setTimeout(() => {
                    reconnectAttempts++;
                    return createWebSocketClient(config);
                }, reconnectDelay);
            }
        });

        ws.addEventListener('open', () => {
            reconnectAttempts = 0; // Reset on successful connection
        });
    }

    return ws;
} 