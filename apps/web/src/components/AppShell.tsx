'use client';

import Image from 'next/image';
import { uiIconSrc } from '@/lib/assets';

interface AppShellProps {
  children: React.ReactNode;
  turns?: number;
  username?: string;
}

export function AppShell({ children, turns = 0, username }: AppShellProps) {
  return (
    <div className="min-h-dvh w-full bg-[var(--rpg-background)] flex flex-col safe-area-top">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-[var(--rpg-surface)] border-b border-[var(--rpg-border)] z-40 pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[var(--rpg-gold)]">Adventure</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Image
                src={uiIconSrc('turn')}
                alt="Turns"
                width={24}
                height={24}
                className="image-rendering-pixelated"
              />
              <span className="font-mono text-[var(--rpg-gold)]">{turns.toLocaleString()}</span>
            </div>
            {username && (
              <span className="text-sm text-[var(--rpg-text-secondary)]">{username}</span>
            )}
          </div>
        </div>
      </header>

      {/* Spacer to push content below fixed header */}
      <div className="h-14 shrink-0 mt-[env(safe-area-inset-top)]" />

      {/* Main Content */}
      <main className="w-full max-w-lg mx-auto px-4 py-4 pb-24 flex-1">
        {children}
      </main>
    </div>
  );
}
