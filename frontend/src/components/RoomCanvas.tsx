'use client';

import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import { useRoomStore } from '@/store/roomStore';
import { ObjectRect } from './ObjectRect';

export function RoomCanvas() {
    const stageRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

    const { imageUrl, objects, roomDimensions, selectedId, selectObject } = useRoomStore();

    // Load image when URL changes
    useEffect(() => {
        if (imageUrl) {
            const img = new window.Image();
            img.src = imageUrl;
            img.onload = () => {
                setImage(img);
                // Scale canvas to fit image while maintaining aspect ratio
                const maxWidth = 800;
                const maxHeight = 600;
                const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
                setStageSize({
                    width: img.width * scale,
                    height: img.height * scale,
                });
            };
        }
    }, [imageUrl]);

    // Update transformer when selection changes
    useEffect(() => {
        if (selectedId && transformerRef.current && stageRef.current) {
            const selectedNode = stageRef.current.findOne(`#${selectedId}`);
            if (selectedNode) {
                transformerRef.current.nodes([selectedNode]);
                transformerRef.current.getLayer()?.batchDraw();
            }
        } else if (transformerRef.current) {
            transformerRef.current.nodes([]);
        }
    }, [selectedId]);

    const handleStageClick = (e: any) => {
        // Deselect when clicking on empty area
        if (e.target === e.target.getStage()) {
            selectObject(null);
        }
    };

    if (!imageUrl) return null;

    // Calculate scale for object positions
    const scaleX = image ? stageSize.width / (roomDimensions?.width_estimate || image.width) : 1;
    const scaleY = image ? stageSize.height / (roomDimensions?.height_estimate || image.height) : 1;

    return (
        <div className="canvas-container inline-block">
            <Stage
                ref={stageRef}
                width={stageSize.width}
                height={stageSize.height}
                onClick={handleStageClick}
                onTap={handleStageClick}
            >
                {/* Background image layer */}
                <Layer>
                    {image && (
                        <KonvaImage
                            image={image}
                            width={stageSize.width}
                            height={stageSize.height}
                        />
                    )}
                </Layer>

                {/* Objects layer */}
                <Layer>
                    {objects.map((obj) => (
                        <ObjectRect
                            key={obj.id}
                            object={{
                                ...obj,
                                bbox: [
                                    obj.bbox[0] * scaleX,
                                    obj.bbox[1] * scaleY,
                                    obj.bbox[2] * scaleX,
                                    obj.bbox[3] * scaleY,
                                ],
                            }}
                            isSelected={selectedId === obj.id}
                            onSelect={() => selectObject(obj.id)}
                        />
                    ))}

                    {/* Transformer for selected object */}
                    <Transformer
                        ref={transformerRef}
                        rotateEnabled={false}
                        enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                        boundBoxFunc={(oldBox, newBox) => {
                            // Limit minimum size
                            if (newBox.width < 20 || newBox.height < 20) {
                                return oldBox;
                            }
                            return newBox;
                        }}
                    />
                </Layer>
            </Stage>
        </div>
    );
}
