'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
    onImageSelect: (base64: string) => void;
    currentImage?: string | null;
    disabled?: boolean;
}

export function ImageUpload({
    onImageSelect,
    currentImage,
    disabled = false,
}: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentImage || null);

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                setPreview(result);
                // Extract base64 part (remove data:image/...;base64, prefix)
                const base64 = result.split(',')[1];
                onImageSelect(base64);
            };
            reader.readAsDataURL(file);
        },
        [onImageSelect]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
        },
        maxSize: 10 * 1024 * 1024, // 10MB
        disabled,
        multiple: false,
    });

    const clearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
    };

    return (
        <div
            {...getRootProps()}
            className={`
        relative min-h-[300px] rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isDragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : preview
                        ? 'border-slate-600 bg-slate-800/50'
                        : 'border-slate-600 hover:border-blue-400 bg-slate-800/30 hover:bg-slate-800/50'
                }
      `}
        >
            <input {...getInputProps()} />

            {preview ? (
                <div className="relative w-full h-full min-h-[300px] group">
                    <img
                        src={preview}
                        alt="Room preview"
                        className="w-full h-full object-contain rounded-lg"
                    />
                    {!disabled && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <div className="text-center">
                                <ImageIcon className="w-10 h-10 mx-auto mb-2 text-white" />
                                <p className="text-white font-medium">Click or drop to change image</p>
                            </div>
                        </div>
                    )}
                    {!disabled && (
                        <button
                            onClick={clearImage}
                            className="absolute top-2 right-2 p-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8">
                    <div className={`p-4 rounded-full mb-4 ${isDragActive ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
                        <Upload className={`w-10 h-10 ${isDragActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    </div>
                    <p className="text-lg font-medium text-slate-200 mb-2">
                        {isDragActive ? 'Drop your bedroom image here' : 'Drop bedroom image here'}
                    </p>
                    <p className="text-sm text-slate-400">
                        or click to browse (JPEG, PNG, WebP • Max 10MB)
                    </p>
                </div>
            )}
        </div>
    );
}
