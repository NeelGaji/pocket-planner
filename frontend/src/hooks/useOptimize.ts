'use client';

import { useState } from 'react';
import { useRoomStore } from '@/store/roomStore';
import { optimizeLayout, OptimizeRequest } from '@/lib/api';

export function useOptimize() {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const { objects, lockedIds, roomDimensions, setOptimizeResult, setError, setLoading } = useRoomStore();

    const optimize = async (maxIterations: number = 5) => {
        if (!roomDimensions) {
            setError('No room data available. Please analyze an image first.');
            return;
        }

        try {
            setIsOptimizing(true);
            setLoading(true);

            const request: OptimizeRequest = {
                current_layout: objects,
                locked_ids: lockedIds,
                room_dimensions: roomDimensions,
                max_iterations: maxIterations,
            };

            const result = await optimizeLayout(request);
            setOptimizeResult(result);

            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Optimization failed';
            setError(message);
            throw error;
        } finally {
            setIsOptimizing(false);
        }
    };

    return { optimize, isOptimizing };
}
