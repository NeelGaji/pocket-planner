/**
 * API Client for Pocket Planner Backend
 */

import axios, { AxiosError } from 'axios';
import type {
    AnalyzeRequest,
    AnalyzeResponse,
    OptimizeRequest,
    OptimizeResponse,
    RenderRequest,
    RenderResponse,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000, // 60 second timeout for vision processing
});

// Error handler
function handleApiError(error: unknown): never {
    if (error instanceof AxiosError) {
        const message = error.response?.data?.detail || error.message;
        throw new Error(message);
    }
    throw error;
}

/**
 * Analyze a room image and extract furniture objects
 */
export async function analyzeRoom(imageBase64: string): Promise<AnalyzeResponse> {
    try {
        const response = await api.post<AnalyzeResponse>('/analyze', {
            image_base64: imageBase64,
        } satisfies AnalyzeRequest);
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * Optimize room layout while respecting locked objects
 */
export async function optimizeLayout(request: OptimizeRequest): Promise<OptimizeResponse> {
    try {
        const response = await api.post<OptimizeResponse>('/optimize', request);
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * Render the optimized layout as an edited image
 */
export async function renderLayout(request: RenderRequest): Promise<RenderResponse> {
    try {
        const response = await api.post<RenderResponse>('/render', request);
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<{ status: string; version: string }> {
    try {
        const response = await axios.get(`${API_URL}/health`);
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}
