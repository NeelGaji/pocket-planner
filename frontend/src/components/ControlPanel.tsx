'use client';

import { useState } from 'react';
import {
    Lock,
    Unlock,
    Wand2,
    Paintbrush,
    Trash2,
    ChevronDown,
    ChevronUp,
    Loader2,
    AlertCircle
} from 'lucide-react';
import type { AppState, RoomObject } from '@/lib/types';
import { getObjectIcon } from '@/lib/types';

interface ControlPanelProps {
    state: AppState;
    onAnalyze: () => void;
    onOptimize: () => void;
    onObjectSelect: (id: string) => void;
    onObjectLock: (id: string) => void;
    onMaskModeToggle: () => void;
    onAddEdit: (instruction: string, mask: string) => void;
    onApplyEdits: () => void;
    onRemoveEdit: (index: number) => void;
}

export function ControlPanel({
    state,
    onAnalyze,
    onOptimize,
    onObjectSelect,
    onObjectLock,
    onMaskModeToggle,
    onAddEdit,
    onApplyEdits,
    onRemoveEdit,
}: ControlPanelProps) {
    const [editInstruction, setEditInstruction] = useState('');
    const [explanationOpen, setExplanationOpen] = useState(true);
    const [pendingMask, setPendingMask] = useState<string | null>(null);

    const hasImage = !!state.image;
    const hasObjects = state.objects.length > 0;
    const hasLockedObject = state.lockedObjectIds.length > 0;
    const canOptimize = hasObjects && hasLockedObject && !state.isOptimizing;

    return (
        <div className="h-full flex flex-col gap-4 overflow-y-auto p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            {/* === Analyze Section === */}
            <section>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs">1</span>
                    Analyze Room
                </h3>
                <button
                    onClick={onAnalyze}
                    disabled={!hasImage || state.isAnalyzing}
                    className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                    {state.isAnalyzing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Wand2 className="w-4 h-4" />
                            {hasObjects ? 'Re-Analyze' : 'Analyze Room'}
                        </>
                    )}
                </button>
                {!hasImage && (
                    <p className="text-xs text-slate-500 mt-2">Upload an image first</p>
                )}
            </section>

            {/* === Objects List === */}
            {hasObjects && (
                <section>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs">2</span>
                        Objects ({state.objects.length})
                    </h3>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                        {state.objects.map((obj) => (
                            <ObjectListItem
                                key={obj.id}
                                object={obj}
                                isSelected={obj.id === state.selectedObjectId}
                                isLocked={state.lockedObjectIds.includes(obj.id)}
                                onSelect={() => onObjectSelect(obj.id)}
                                onLock={() => onObjectLock(obj.id)}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        💡 Double-click an object to lock it in place
                    </p>
                </section>
            )}

            {/* === Optimize Section === */}
            {hasObjects && (
                <section>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-xs">3</span>
                        Optimize Layout
                    </h3>
                    {!hasLockedObject && (
                        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-3">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-400">
                                Lock at least one object to keep it in place during optimization
                            </p>
                        </div>
                    )}
                    <button
                        onClick={onOptimize}
                        disabled={!canOptimize}
                        className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {state.isOptimizing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Optimizing...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-4 h-4" />
                                Optimize Layout
                            </>
                        )}
                    </button>
                    {state.layoutScore !== null && (
                        <div className="mt-2 text-center">
                            <span className="text-sm text-slate-400">Layout Score: </span>
                            <span className="text-lg font-bold text-emerald-400">{state.layoutScore.toFixed(1)}</span>
                        </div>
                    )}
                </section>
            )}

            {/* === Surgical Edit Section === */}
            {hasObjects && (
                <section>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs">4</span>
                        Surgical Edits
                    </h3>

                    <label className="flex items-center gap-2 mb-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={state.maskMode}
                            onChange={onMaskModeToggle}
                            className="w-4 h-4 rounded text-purple-600 bg-slate-700 border-slate-600"
                        />
                        <Paintbrush className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-slate-300">Enable mask drawing</span>
                    </label>

                    {state.maskMode && (
                        <div className="space-y-2 mb-3">
                            <input
                                type="text"
                                value={editInstruction}
                                onChange={(e) => setEditInstruction(e.target.value)}
                                placeholder="e.g., Repaint wall navy blue"
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    )}

                    {/* Pending Edits */}
                    {state.editMasks.length > 0 && (
                        <div className="space-y-2 mb-3">
                            <p className="text-xs text-slate-400">Pending edits ({state.editMasks.length}):</p>
                            {state.editMasks.map((edit, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg text-xs">
                                    <span className="text-slate-300 truncate flex-1">{edit.instruction}</span>
                                    <button
                                        onClick={() => onRemoveEdit(i)}
                                        className="p-1 text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={onApplyEdits}
                                disabled={state.isRendering}
                                className="w-full py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium transition-colors"
                            >
                                {state.isRendering ? 'Applying...' : 'Apply All Edits'}
                            </button>
                        </div>
                    )}
                </section>
            )}

            {/* === Explanation === */}
            {state.explanation && (
                <section>
                    <button
                        onClick={() => setExplanationOpen(!explanationOpen)}
                        className="w-full flex items-center justify-between text-sm font-semibold text-slate-300 mb-2"
                    >
                        <span className="flex items-center gap-2">💬 Explanation</span>
                        {explanationOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {explanationOpen && (
                        <div className="p-3 bg-slate-800/50 rounded-lg text-sm text-slate-300 whitespace-pre-wrap">
                            {state.explanation}
                        </div>
                    )}
                </section>
            )}

            {/* === Violations === */}
            {state.violations.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Issues ({state.violations.length})
                    </h3>
                    <div className="space-y-1">
                        {state.violations.map((v, i) => (
                            <div key={i} className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
                                {v}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

// === Object List Item Component ===
interface ObjectListItemProps {
    object: RoomObject;
    isSelected: boolean;
    isLocked: boolean;
    onSelect: () => void;
    onLock: () => void;
}

function ObjectListItem({ object, isSelected, isLocked, onSelect, onLock }: ObjectListItemProps) {
    return (
        <div
            onClick={onSelect}
            className={`
        flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-600/20 border border-blue-500/50' : 'bg-slate-800/50 border border-transparent hover:bg-slate-800'}
      `}
        >
            <span className="text-lg">{getObjectIcon(object.label)}</span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{object.id}</p>
                <p className="text-xs text-slate-500">{object.type}</p>
            </div>
            {object.type === 'movable' && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onLock();
                    }}
                    className={`p-1.5 rounded ${isLocked ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                    title={isLocked ? 'Unlock' : 'Lock'}
                >
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
            )}
        </div>
    );
}
