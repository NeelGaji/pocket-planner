'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Line, Image as KonvaImage, Group } from 'react-konva';
import type { RoomObject, ClearanceZone } from '@/lib/types';

interface CanvasOverlayProps {
    imageUrl: string;
    objects: RoomObject[];
    selectedObjectId: string | null;
    lockedObjectIds: string[];
    overlays?: {
        clearance_zones?: ClearanceZone[];
        walking_paths?: number[][];
    };
    onObjectSelect: (id: string) => void;
    onObjectLock: (id: string) => void;
    maskMode?: boolean;
    onMaskComplete?: (maskBase64: string) => void;
}

// Color scheme for object states
const COLORS = {
    locked: { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.1)' },
    selected: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.1)' },
    movable: { stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.05)' },
    structural: { stroke: '#6b7280', fill: 'rgba(107, 114, 128, 0.05)' },
    clearance: { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.1)' },
    walkingPath: { stroke: '#22c55e' },
    mask: { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.3)' },
};

export function CanvasOverlay({
    imageUrl,
    objects,
    selectedObjectId,
    lockedObjectIds,
    overlays,
    onObjectSelect,
    onObjectLock,
    maskMode = false,
    onMaskComplete,
}: CanvasOverlayProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [scale, setScale] = useState(1);
    const [maskLines, setMaskLines] = useState<number[][]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Load image
    useEffect(() => {
        const img = new window.Image();
        img.src = imageUrl;
        img.onload = () => {
            setImage(img);

            // Calculate scale to fit container
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = Math.min(600, window.innerHeight * 0.6);
                const scaleX = containerWidth / img.width;
                const scaleY = containerHeight / img.height;
                const newScale = Math.min(scaleX, scaleY, 1);

                setScale(newScale);
                setDimensions({
                    width: img.width * newScale,
                    height: img.height * newScale,
                });
            }
        };
    }, [imageUrl]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && image) {
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = Math.min(600, window.innerHeight * 0.6);
                const scaleX = containerWidth / image.width;
                const scaleY = containerHeight / image.height;
                const newScale = Math.min(scaleX, scaleY, 1);

                setScale(newScale);
                setDimensions({
                    width: image.width * newScale,
                    height: image.height * newScale,
                });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [image]);

    // Get object color based on state
    const getObjectColor = (obj: RoomObject) => {
        if (lockedObjectIds.includes(obj.id)) return COLORS.locked;
        if (obj.id === selectedObjectId) return COLORS.selected;
        if (obj.type === 'structural') return COLORS.structural;
        return COLORS.movable;
    };

    // Get stroke width based on state
    const getStrokeWidth = (obj: RoomObject) => {
        const isHovered = hoveredId === obj.id;
        const isSelected = obj.id === selectedObjectId;
        const isLocked = lockedObjectIds.includes(obj.id);

        if (isLocked) return isHovered ? 4 : 3;
        if (isSelected) return isHovered ? 3 : 2;
        return isHovered ? 2 : 1;
    };

    // Mask drawing handlers
    const handleMouseDown = useCallback((e: any) => {
        if (!maskMode) return;
        setIsDrawing(true);
        const pos = e.target.getStage().getPointerPosition();
        setMaskLines([...maskLines, [pos.x, pos.y]]);
    }, [maskMode, maskLines]);

    const handleMouseMove = useCallback((e: any) => {
        if (!maskMode || !isDrawing) return;
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        const lastLine = maskLines[maskLines.length - 1];
        const newLine = [...lastLine, pos.x, pos.y];
        setMaskLines([...maskLines.slice(0, -1), newLine]);
    }, [maskMode, isDrawing, maskLines]);

    const handleMouseUp = useCallback(() => {
        setIsDrawing(false);
    }, []);

    // Export mask
    const exportMask = useCallback(() => {
        if (maskLines.length === 0 || !image) return;

        // Create a canvas for the mask
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            // White background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw mask lines in black
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 30 / scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            maskLines.forEach(line => {
                if (line.length >= 4) {
                    ctx.beginPath();
                    ctx.moveTo(line[0] / scale, line[1] / scale);
                    for (let i = 2; i < line.length; i += 2) {
                        ctx.lineTo(line[i] / scale, line[i + 1] / scale);
                    }
                    ctx.stroke();
                }
            });

            const maskBase64 = canvas.toDataURL('image/png').split(',')[1];
            onMaskComplete?.(maskBase64);
            setMaskLines([]);
        }
    }, [maskLines, image, scale, onMaskComplete]);

    // Clear mask
    const clearMask = () => setMaskLines([]);

    if (!image) {
        return (
            <div ref={containerRef} className="w-full h-[400px] flex items-center justify-center bg-slate-800/50 rounded-xl">
                <div className="text-slate-400">Loading image...</div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full relative">
            <Stage
                width={dimensions.width}
                height={dimensions.height}
                className="border border-slate-700 rounded-xl overflow-hidden"
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <Layer>
                    {/* Background Image */}
                    <KonvaImage
                        image={image}
                        width={dimensions.width}
                        height={dimensions.height}
                    />

                    {/* Clearance Zones */}
                    {overlays?.clearance_zones?.map((zone, i) => (
                        <Rect
                            key={`clearance-${i}`}
                            x={zone.bounds[0] * scale}
                            y={zone.bounds[1] * scale}
                            width={(zone.bounds[2] - zone.bounds[0]) * scale}
                            height={(zone.bounds[3] - zone.bounds[1]) * scale}
                            stroke={COLORS.clearance.stroke}
                            fill={COLORS.clearance.fill}
                            strokeWidth={1}
                            dash={[5, 5]}
                        />
                    ))}

                    {/* Walking Paths */}
                    {overlays?.walking_paths?.map((path, i) => (
                        <Line
                            key={`path-${i}`}
                            points={path.map((p, idx) => p * scale)}
                            stroke={COLORS.walkingPath.stroke}
                            strokeWidth={2}
                            dash={[10, 5]}
                            opacity={0.7}
                        />
                    ))}

                    {/* Object Bounding Boxes */}
                    {objects.map((obj) => {
                        const colors = getObjectColor(obj);
                        const strokeWidth = getStrokeWidth(obj);
                        const [x, y, width, height] = obj.bbox;

                        return (
                            <Group key={obj.id}>
                                <Rect
                                    x={x * scale}
                                    y={y * scale}
                                    width={width * scale}
                                    height={height * scale}
                                    stroke={colors.stroke}
                                    fill={colors.fill}
                                    strokeWidth={strokeWidth}
                                    dash={obj.type === 'structural' ? [5, 5] : undefined}
                                    onClick={() => onObjectSelect(obj.id)}
                                    onDblClick={() => onObjectLock(obj.id)}
                                    onMouseEnter={() => setHoveredId(obj.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    cursor="pointer"
                                />
                                <Text
                                    x={x * scale}
                                    y={y * scale - 18}
                                    text={`${obj.label}${lockedObjectIds.includes(obj.id) ? ' 🔒' : ''}`}
                                    fontSize={12}
                                    fill={colors.stroke}
                                    fontStyle="bold"
                                />
                            </Group>
                        );
                    })}

                    {/* Mask Drawing Lines */}
                    {maskMode && maskLines.map((line, i) => (
                        <Line
                            key={`mask-line-${i}`}
                            points={line}
                            stroke={COLORS.mask.stroke}
                            strokeWidth={20}
                            lineCap="round"
                            lineJoin="round"
                            opacity={0.5}
                        />
                    ))}
                </Layer>
            </Stage>

            {/* Mask Mode Controls */}
            {maskMode && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    <button
                        onClick={clearMask}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        Clear Mask
                    </button>
                    <button
                        onClick={exportMask}
                        disabled={maskLines.length === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Complete Mask
                    </button>
                </div>
            )}

            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs text-slate-400 justify-center flex-wrap">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-green-500 rounded"></span> Locked
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-blue-500 rounded"></span> Selected
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-yellow-500 rounded"></span> Movable
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-gray-500 rounded border-dashed"></span> Structural
                </span>
            </div>
        </div>
    );
}
