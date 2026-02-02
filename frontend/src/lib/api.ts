import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Types matching backend Pydantic models
export interface RoomDimensions {
    width_estimate: number;
    height_estimate: number;
}

export interface RoomObject {
    id: string;
    label: string;
    bbox: [number, number, number, number]; // [x, y, width, height]
    type: 'movable' | 'structural';
    orientation: number;
    is_locked?: boolean;
}

export interface AnalyzeResponse {
    room_dimensions: RoomDimensions;
    objects: RoomObject[];
    detected_issues: string[];
    message: string;
}

export interface OptimizeRequest {
    current_layout: RoomObject[];
    locked_ids: string[];
    room_dimensions: RoomDimensions;
    max_iterations?: number;
}

export interface OptimizeResponse {
    new_layout: RoomObject[];
    explanation: string;
    layout_score: number;
    iterations: number;
    improvement: number;
}

// API functions
export async function analyzeImage(file: File): Promise<AnalyzeResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<AnalyzeResponse>('/analyze/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data;
}

export async function optimizeLayout(request: OptimizeRequest): Promise<OptimizeResponse> {
    const response = await api.post<OptimizeResponse>('/optimize', request);
    return response.data;
}
