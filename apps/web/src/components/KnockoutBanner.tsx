import { AlertTriangle } from 'lucide-react';

interface KnockoutBannerProps {
  action: string;
  recoveryCost?: number | null;
  title?: string;
}

export function KnockoutBanner({ action, recoveryCost, title = 'Knocked Out' }: KnockoutBannerProps) {
  return (
    <div className="bg-[var(--rpg-red)]/20 border border-[var(--rpg-red)] rounded-lg p-4">
      <div className="flex items-center gap-3">
        <AlertTriangle size={24} className="text-[var(--rpg-red)] flex-shrink-0" />
        <div>
          <div className="font-bold text-[var(--rpg-red)]">{title}</div>
          <div className="text-sm text-[var(--rpg-text-secondary)]">
            You must recover before {action}.
            {typeof recoveryCost === 'number' && (
              <>
                {' '}
                Cost: {recoveryCost.toLocaleString()} turns
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

