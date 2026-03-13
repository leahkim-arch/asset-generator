"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { GridSize } from "@/types";
import { GRID_COUNTS } from "@/types";

interface GridSectionProps {
  grid: GridSize;
  onGridChange: (grid: GridSize) => void;
}

const GRID_OPTIONS: { value: GridSize; label: string }[] = [
  { value: "3x3", label: "3×3" },
  { value: "4x4", label: "4×4" },
  { value: "5x5", label: "5×5" },
  { value: "6x6", label: "6×6" },
];

export function GridSection({ grid, onGridChange }: GridSectionProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">그리드</h2>
      <div className="grid grid-cols-4 gap-3">
        {GRID_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onGridChange(opt.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border-2 p-4 transition-all",
              grid === opt.value
                ? "border-primary bg-primary/5 text-primary"
                : "border-muted hover:border-muted-foreground/30"
            )}
          >
            <span className="text-lg font-semibold">{opt.label}</span>
            <span className="text-xs text-muted-foreground">
              {GRID_COUNTS[opt.value]}개
            </span>
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        <strong>{GRID_COUNTS[grid]}개</strong>의 에셋이 주제에 맞춰 자동 생성됩니다
      </p>
    </div>
  );
}
