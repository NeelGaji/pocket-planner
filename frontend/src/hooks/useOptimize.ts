'use client';

import { useState, useCallback } from 'react';
import { optimizeLayout } from '@/lib/api';
import type { OptimizeRequest, OptimizeResponse } from '@/lib/types';

export function useOptimize() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<OptimizeResponse | null>(null);

    const optimize = useCallback(async (request: OptimizeRequest) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await optimizeLayout(request);
            setData(response);
            return response;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Optimization failed';
            setError(message);
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
    }, []);

    return { optimize, isLoading, error, data, reset };
}
