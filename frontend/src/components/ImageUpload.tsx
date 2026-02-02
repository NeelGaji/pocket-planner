'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRoomStore } from '@/store/roomStore';
import { useAnalyze } from '@/hooks/useAnalyze';
import { Card, CardContent } from '@/components/ui/card';

export function ImageUpload() {
    const { imageUrl, isLoading } = useRoomStore();
    const { analyze, isAnalyzing } = useAnalyze();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            await analyze(file);
        }
    }, [analyze]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
        },
        maxFiles: 1,
        disabled: isLoading || isAnalyzing,
    });

    if (imageUrl) {
        return null; // Hide upload when image is loaded
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardContent className="p-0">
                <div
                    {...getRootProps()}
                    className={`
            upload-zone p-12 text-center cursor-pointer
            ${isDragActive ? 'active' : ''}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
                >
                    <input {...getInputProps()} />

                    {isAnalyzing ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="spinner" />
                            <p className="text-[var(--text-muted)]">Analyzing room...</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-6xl mb-4">🏠</div>
                            <p className="text-lg font-medium mb-2">
                                {isDragActive ? 'Drop the image here' : 'Drop a room image here'}
                            </p>
                            <p className="text-sm text-[var(--text-muted)]">
                                or click to select a file
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-4">
                                Supports: PNG, JPG, JPEG, WebP • Top-down or isometric views work best
                            </p>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
