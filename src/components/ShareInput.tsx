import { Input } from "@/components/ui/input";

export function ShareInput({
  value,
  onChange,
  label,
  max = 100,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  max?: number;
}) {
  return (
    <div className="relative ml-auto w-[6.75rem] shrink-0">
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={0.1}
        value={Number(value.toFixed(1))}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(0, next)));
        }}
        aria-label={label}
        className="num h-10 pr-6 text-right font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
    </div>
  );
}