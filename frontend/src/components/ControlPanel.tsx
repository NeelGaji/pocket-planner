'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRoomStore } from '@/store/roomStore';
import { useOptimize } from '@/hooks/useOptimize';

export function ControlPanel() {
    const {
        objects,
        selectedId,
        lockedIds,
        toggleLock,
        detectedIssues,
        explanation,
        layoutScore,
        reset,
        isLoading,
    } = useRoomStore();
    const { optimize, isOptimizing } = useOptimize();

    const selectedObject = objects.find(obj => obj.id === selectedId);
    const movableObjects = objects.filter(obj => obj.type === 'movable');

    const handleOptimize = async () => {
        try {
            await optimize();
        } catch (error) {
            console.error('Optimization failed:', error);
        }
    };

    return (
        <div className="flex flex-col gap-4 w-80">
            {/* Selected Object Info */}
            {selectedObject && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Selected Object</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="capitalize font-medium">{selectedObject.label}</span>
                            <span className="text-xs text-[var(--text-muted)]">{selectedObject.id}</span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                            Type: {selectedObject.type}
                        </div>
                        {selectedObject.type === 'movable' && (
                            <Button
                                variant={lockedIds.includes(selectedObject.id) ? 'default' : 'outline'}
                                size="sm"
                                className="w-full"
                                onClick={() => toggleLock(selectedObject.id)}
                            >
                                {lockedIds.includes(selectedObject.id) ? '🔓 Unlock' : '🔒 Lock Position'}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Locked Objects */}
            {lockedIds.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Locked Objects ({lockedIds.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {lockedIds.map(id => {
                                const obj = objects.find(o => o.id === id);
                                return (
                                    <span
                                        key={id}
                                        className="px-2 py-1 bg-[var(--success)] text-white text-xs rounded cursor-pointer"
                                        onClick={() => toggleLock(id)}
                                        title="Click to unlock"
                                    >
                                        {obj?.label || id} ✕
                                    </span>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Issues */}
            {detectedIssues.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-[var(--warning)]">
                            ⚠️ Issues ({detectedIssues.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-xs space-y-1 text-[var(--text-muted)]">
                            {detectedIssues.slice(0, 5).map((issue, i) => (
                                <li key={i}>• {issue}</li>
                            ))}
                            {detectedIssues.length > 5 && (
                                <li className="text-[var(--accent)]">...and {detectedIssues.length - 5} more</li>
                            )}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Explanation */}
            {explanation && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-[var(--success)]">
                            ✨ Optimization Result
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-[var(--text-muted)]">{explanation}</p>
                        {layoutScore && (
                            <p className="text-sm font-medium mt-2">
                                Score: {layoutScore.toFixed(1)}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
                <Button
                    onClick={handleOptimize}
                    disabled={isOptimizing || isLoading || movableObjects.length === 0}
                    className="w-full"
                >
                    {isOptimizing ? (
                        <>
                            <span className="spinner mr-2 w-4 h-4" />
                            Optimizing...
                        </>
                    ) : (
                        '✨ Optimize Layout'
                    )}
                </Button>

                <Button variant="outline" onClick={reset} className="w-full">
                    🔄 Start Over
                </Button>
            </div>
        </div>
    );
}
