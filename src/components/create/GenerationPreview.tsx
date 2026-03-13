"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import type { AssetItem, GridSize, BgColor } from "@/types";
import { BG_COLOR_MAP } from "@/types";
import { cn } from "@/lib/utils";

interface GenerationPreviewProps {
  items: AssetItem[];
  grid: GridSize;
  bgColor: BgColor;
  isGenerating: boolean;
  onBgColorChange: (color: BgColor) => void;
  onDownloadAll: () => void;
  onRegenerate: (id: string) => void;
}

export function GenerationPreview({
  items,
  grid,
  bgColor,
  isGenerating,
  onBgColorChange,
  onDownloadAll,
  onRegenerate,
}: GenerationPreviewProps) {
  const gridCols = parseInt(grid.split("x")[0]);
  const doneCount = items.filter((i) => i.status === "done").length;
  const totalCount = items.length;

  const handleDownloadSingle = useCallback(async (item: AssetItem) => {
    if (!item.imageUrl) return;

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 720, 720);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${item.label}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = item.imageUrl;
  }, []);

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <BgColorSelector bgColor={bgColor} onChange={onBgColorChange} />
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-20">
          <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            생성된 에셋이 여기에 표시됩니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">생성 결과</h2>
          <Badge variant={doneCount === totalCount ? "default" : "secondary"}>
            {doneCount} / {totalCount}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadAll}
          disabled={doneCount === 0 || isGenerating}
        >
          <Download className="mr-1.5 h-4 w-4" />
          ZIP 다운로드
        </Button>
      </div>

      <BgColorSelector bgColor={bgColor} onChange={onBgColorChange} />

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square overflow-hidden rounded-lg border"
            style={{ backgroundColor: BG_COLOR_MAP[bgColor].hex }}
          >
            {item.status === "done" && item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.label}
                className="h-full w-full object-contain p-1"
              />
            ) : item.status === "generating" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">생성 중...</span>
              </div>
            ) : item.status === "error" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <span className="text-xs text-destructive">오류</span>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                <span className="text-xs text-muted-foreground">대기 중</span>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
              <p className="truncate text-xs text-white">{item.label}</p>
            </div>

            {item.status === "done" && (
              <div className="absolute right-1 top-1">
                <CheckCircle2 className="h-4 w-4 text-green-400 drop-shadow" />
              </div>
            )}

            {/* Hover actions */}
            {(item.status === "done" || item.status === "error") && (
              <div className="absolute left-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onRegenerate(item.id)}
                  className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                  title="다시 생성"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
                {item.status === "done" && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(item)}
                    className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                    title="개별 다운로드 (720x720 PNG)"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BgColorSelector({
  bgColor,
  onChange,
}: {
  bgColor: BgColor;
  onChange: (color: BgColor) => void;
}) {
  const colors: BgColor[] = ["black", "gray", "white", "blue", "yellow"];
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">배경:</span>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          title={BG_COLOR_MAP[color].label}
          className={cn(
            "h-6 w-6 rounded-full border-2 transition-all",
            bgColor === color
              ? "border-primary ring-2 ring-primary/30"
              : "border-muted-foreground/30 hover:border-muted-foreground/60"
          )}
          style={{ backgroundColor: BG_COLOR_MAP[color].hex }}
        />
      ))}
    </div>
  );
}
