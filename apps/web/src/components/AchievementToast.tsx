'use client';

import { useEffect, useState } from 'react';

interface Toast {
  id: string;
  title: string;
  category: string;
}

export function AchievementToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__showAchievementToast = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__showAchievementToast;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-[var(--rpg-surface)] border border-[var(--rpg-gold)] rounded-lg px-4 py-3 shadow-lg animate-[slideIn_0.3s_ease-out] min-w-[250px]"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">&#x1F3C6;</span>
            <div>
              <p className="text-xs text-[var(--rpg-text-secondary)] uppercase tracking-wider">
                Achievement Unlocked
              </p>
              <p className="text-sm font-medium text-[var(--rpg-gold)]">
                {toast.title}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
