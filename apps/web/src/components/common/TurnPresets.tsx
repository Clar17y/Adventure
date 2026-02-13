interface Preset {
  label: string;
  turns: number;
  disabled?: boolean;
}

interface TurnPresetsProps {
  presets: Preset[];
  currentValue: number;
  onChange: (turns: number) => void;
  className?: string;
}

export function TurnPresets({ presets, currentValue, onChange, className = '' }: TurnPresetsProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => !p.disabled && onChange(p.turns)}
          disabled={p.disabled}
          className={`flex-1 px-3 py-1.5 text-sm rounded border transition-colors ${
            p.disabled
              ? 'opacity-40 cursor-not-allowed bg-[var(--rpg-background)] border-[var(--rpg-border)] text-[var(--rpg-text-secondary)]'
              : currentValue === p.turns
                ? 'bg-[var(--rpg-gold)] border-[var(--rpg-gold)] text-[var(--rpg-background)] font-bold'
                : 'bg-[var(--rpg-background)] border-[var(--rpg-border)] hover:border-[var(--rpg-gold)] text-[var(--rpg-text-primary)]'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
