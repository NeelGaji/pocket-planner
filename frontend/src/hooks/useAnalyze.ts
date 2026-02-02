'use client';

import { useState } from 'react';
import { useRoomStore } from '@/store/roomStore';
import { analyzeImage } from '@/lib/api';

export function useAnalyze() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const { setImage, setAnalysisResult, setError, setLoading } = useRoomStore();

    const analyze = async (file: File) => {
        try {
            setIsAnalyzing(true);
            setLoading(true);
            setImage(file);

            const result = await analyzeImage(file);
            setAnalysisResult(result);

            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Analysis failed';
            setError(message);
            throw error;
        } finally {
            setIsAnalyzing(false);
        }
    };

    return { analyze, isAnalyzing };
}
