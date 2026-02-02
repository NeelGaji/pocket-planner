'use client';

import dynamic from 'next/dynamic';
import { ImageUpload } from '@/components/ImageUpload';
import { ControlPanel } from '@/components/ControlPanel';
import { useRoomStore } from '@/store/roomStore';

// Dynamic import for react-konva (no SSR)
const RoomCanvas = dynamic(
  () => import('@/components/RoomCanvas').then(mod => ({ default: mod.RoomCanvas })),
  { ssr: false }
);

export default function Home() {
  const { imageUrl, error, objects } = useRoomStore();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏠</span>
            <h1 className="text-xl font-semibold text-[var(--text)]">
              Pocket Planner
            </h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            AI-Powered Room Optimization
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-[var(--error)] bg-opacity-10 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm">
            {error}
          </div>
        )}

        {!imageUrl ? (
          /* Upload State */
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h2 className="text-2xl font-medium text-[var(--text)] mb-2">
              Upload a Room Image
            </h2>
            <p className="text-[var(--text-muted)] mb-8 text-center max-w-md">
              Our AI will detect furniture and suggest optimizations.
              <br />
              <span className="text-xs">Top-down or isometric views work best.</span>
            </p>
            <ImageUpload />
          </div>
        ) : (
          /* Canvas + Controls */
          <div className="flex gap-6 flex-wrap lg:flex-nowrap">
            <div className="flex-1 min-w-0">
              {/* Canvas container */}
              <div className="mb-4">
                <RoomCanvas />
              </div>

              {/* Object count */}
              <div className="text-sm text-[var(--text-muted)]">
                Detected {objects.length} objects •
                {objects.filter(o => o.type === 'movable').length} movable •
                {objects.filter(o => o.type === 'structural').length} structural
              </div>
            </div>

            <ControlPanel />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-4 mt-auto">
        <div className="max-w-7xl mx-auto text-center text-xs text-[var(--text-muted)]">
          Built for the Gemini Hackathon • Powered by Gemini 2.5 Flash
        </div>
      </footer>
    </div>
  );
}
