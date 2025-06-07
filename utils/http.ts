/**
 * HTTP client and authentication utilities for Redux Unified
 */

import { IAuthConfig, IHttpConfig } from '../types';
import { envFetch } from './environment';
import { getApiPath } from './url';

/**
 * Get authentication header based on configuration
 */
export function getAuthHeader(authConfig?: IAuthConfig): Record<string, string> {
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
 * Create HTTP client with configuration
 */
export function createHttpClient(config: IHttpConfig) {
    return {
        get: (url: string, options = {}) => 
            envFetch(getApiPath(url, config.baseURL), {
                method: 'GET',
                headers: { ...config.headers, ...getAuthHeader(config.auth) },
                ...options
            }),
        
        post: (url: string, data?: any, options = {}) =>
            envFetch(getApiPath(url, config.baseURL), {
                method: 'POST',
                headers: { 
                    ...config.headers, 
                    ...getAuthHeader(config.auth),
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : undefined,
                ...options
            }),
        
        put: (url: string, data?: any, options = {}) =>
            envFetch(getApiPath(url, config.baseURL), {
                method: 'PUT',
                headers: { 
                    ...config.headers, 
                    ...getAuthHeader(config.auth),
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : undefined,
                ...options
            }),
        
        patch: (url: string, data?: any, options = {}) =>
            envFetch(getApiPath(url, config.baseURL), {
                method: 'PATCH',
                headers: { 
                    ...config.headers, 
                    ...getAuthHeader(config.auth),
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : undefined,
                ...options
            }),
        
        delete: (url: string, options = {}) =>
            envFetch(getApiPath(url, config.baseURL), {
                method: 'DELETE',
                headers: { ...config.headers, ...getAuthHeader(config.auth) },
                ...options
            })
    };
} 