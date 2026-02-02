import { create } from 'zustand';
import { RoomObject, RoomDimensions, AnalyzeResponse, OptimizeResponse } from '@/lib/api';

interface RoomState {
    // Image
    imageFile: File | null;
    imageUrl: string | null;

    // Room data
    roomDimensions: RoomDimensions | null;
    objects: RoomObject[];
    originalObjects: RoomObject[]; // For before/after comparison

    // Selection
    selectedId: string | null;
    lockedIds: string[];

    // UI state
    isLoading: boolean;
    error: string | null;
    detectedIssues: string[];
    explanation: string | null;
    layoutScore: number | null;

    // Actions
    setImage: (file: File) => void;
    setAnalysisResult: (result: AnalyzeResponse) => void;
    setOptimizeResult: (result: OptimizeResponse) => void;
    selectObject: (id: string | null) => void;
    toggleLock: (id: string) => void;
    updateObjectPosition: (id: string, x: number, y: number) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

const initialState = {
    imageFile: null,
    imageUrl: null,
    roomDimensions: null,
    objects: [],
    originalObjects: [],
    selectedId: null,
    lockedIds: [],
    isLoading: false,
    error: null,
    detectedIssues: [],
    explanation: null,
    layoutScore: null,
};

export const useRoomStore = create<RoomState>((set, get) => ({
    ...initialState,

    setImage: (file: File) => {
        const url = URL.createObjectURL(file);
        set({ imageFile: file, imageUrl: url, error: null });
    },

    setAnalysisResult: (result: AnalyzeResponse) => {
        set({
            roomDimensions: result.room_dimensions,
            objects: result.objects,
            originalObjects: [...result.objects],
            detectedIssues: result.detected_issues,
            isLoading: false,
        });
    },

    setOptimizeResult: (result: OptimizeResponse) => {
        set({
            objects: result.new_layout,
            explanation: result.explanation,
            layoutScore: result.layout_score,
            isLoading: false,
        });
    },

    selectObject: (id: string | null) => {
        set({ selectedId: id });
    },

    toggleLock: (id: string) => {
        const { lockedIds, objects } = get();
        const isLocked = lockedIds.includes(id);

        const newLockedIds = isLocked
            ? lockedIds.filter(lockedId => lockedId !== id)
            : [...lockedIds, id];

        // Update object's is_locked property
        const updatedObjects = objects.map(obj =>
            obj.id === id ? { ...obj, is_locked: !isLocked } : obj
        );

        set({ lockedIds: newLockedIds, objects: updatedObjects });
    },

    updateObjectPosition: (id: string, x: number, y: number) => {
        const { objects } = get();
        const updatedObjects = objects.map(obj =>
            obj.id === id
                ? { ...obj, bbox: [x, y, obj.bbox[2], obj.bbox[3]] as [number, number, number, number] }
                : obj
        );
        set({ objects: updatedObjects });
    },

    setLoading: (loading: boolean) => set({ isLoading: loading }),

    setError: (error: string | null) => set({ error, isLoading: false }),

    reset: () => set(initialState),
}));
