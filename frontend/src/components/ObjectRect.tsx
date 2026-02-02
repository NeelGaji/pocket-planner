'use client';

import { Rect, Text, Group } from 'react-konva';
import { RoomObject } from '@/lib/api';
import { useRoomStore } from '@/store/roomStore';

interface ObjectRectProps {
    object: RoomObject;
    isSelected: boolean;
    onSelect: () => void;
}

// Color scheme for object borders
const COLORS = {
    movable: '#3b82f6',      // Blue
    structural: '#f59e0b',   // Orange
    locked: '#22c55e',       // Green
    selected: '#a855f7',     // Purple
};

export function ObjectRect({ object, isSelected, onSelect }: ObjectRectProps) {
    const { lockedIds, updateObjectPosition } = useRoomStore();
    const isLocked = lockedIds.includes(object.id);

    const [x, y, width, height] = object.bbox;

    // Determine border color based on state
    const getBorderColor = () => {
        if (isLocked) return COLORS.locked;
        if (isSelected) return COLORS.selected;
        return object.type === 'structural' ? COLORS.structural : COLORS.movable;
    };

    const handleDragEnd = (e: any) => {
        const newX = e.target.x();
        const newY = e.target.y();
        updateObjectPosition(object.id, newX, newY);
    };

    return (
        <Group
            x={x}
            y={y}
            draggable={!isLocked && object.type === 'movable'}
            onClick={onSelect}
            onTap={onSelect}
            onDragEnd={handleDragEnd}
        >
            {/* Border rectangle (not filled) */}
            <Rect
                width={width}
                height={height}
                stroke={getBorderColor()}
                strokeWidth={isSelected ? 3 : 2}
                fill="transparent"
                cornerRadius={4}
                shadowColor={isSelected ? getBorderColor() : undefined}
                shadowBlur={isSelected ? 10 : 0}
                shadowOpacity={0.5}
            />

            {/* Label */}
            <Text
                text={object.label}
                x={4}
                y={4}
                fontSize={12}
                fontStyle="bold"
                fill={getBorderColor()}
            />

            {/* Lock indicator */}
            {isLocked && (
                <Text
                    text="🔒"
                    x={width - 20}
                    y={4}
                    fontSize={14}
                />
            )}
        </Group>
    );
}
