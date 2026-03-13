"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StyleConfig } from "@/types";
import { getApiAdapter } from "@/lib/api-adapter";

interface StyleSectionProps {
  style: StyleConfig;
  topic: string;
  onStyleChange: (updates: Partial<StyleConfig>) => void;
}

const MATERIALS = [
  { value: "clay", label: "클레이 / 3D" },
  { value: "flat", label: "플랫 일러스트" },
  { value: "watercolor", label: "수채화" },
  { value: "pixel", label: "픽셀아트" },
  { value: "line-art", label: "라인아트" },
  { value: "cartoon", label: "카툰" },
  { value: "realistic", label: "사실적" },
  { value: "paper-cut", label: "페이퍼 컷" },
];

const LIGHTINGS = [
  { value: "studio", label: "스튜디오" },
  { value: "natural", label: "자연광" },
  { value: "soft", label: "소프트" },
  { value: "dramatic", label: "드라마틱" },
  { value: "flat", label: "플랫" },
  { value: "neon", label: "네온" },
];

const OUTLINES = [
  { value: "none", label: "없음" },
  { value: "thin", label: "얇은 외곽선" },
  { value: "thick", label: "두꺼운 외곽선" },
  { value: "white", label: "흰색 외곽선" },
  { value: "shadow", label: "그림자 외곽" },
];

const RENDER_TYPES = [
  { value: "sticker", label: "스티커" },
  { value: "icon", label: "아이콘" },
  { value: "emoji", label: "이모지" },
  { value: "badge", label: "뱃지" },
  { value: "mascot", label: "마스코트" },
];

export function StyleSection({ style, topic, onStyleChange }: StyleSectionProps) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAutoGenerate = async () => {
    if (!topic.trim()) return;
    setAnalyzing(true);
    try {
      const adapter = getApiAdapter();
      const result = await adapter.analyzeDocument(topic);
      if (result.suggestedStylePrompt) {
        onStyleChange({ stylePrompt: result.suggestedStylePrompt });
      }
    } catch {
      // silently fail
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">스타일</h2>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="style-prompt" className="text-sm font-medium">
            스타일 프롬프트 <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAutoGenerate}
            disabled={!topic.trim() || analyzing}
            className="h-7 text-xs"
          >
            {analyzing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" />
            )}
            기획안 기반 자동 생성
          </Button>
        </div>
        <Textarea
          id="style-prompt"
          placeholder="예: cute kawaii style, pastel colors, round shapes, transparent background, die-cut sticker, single object centered"
          value={style.stylePrompt}
          onChange={(e) => onStyleChange({ stylePrompt: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="neg-prompt" className="text-sm font-medium">
          네거티브 프롬프트
        </Label>
        <Textarea
          id="neg-prompt"
          placeholder="예: blurry, low quality, text, watermark, multiple objects, busy background"
          value={style.negativePrompt}
          onChange={(e) => onStyleChange({ negativePrompt: e.target.value })}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="재질"
          value={style.material}
          options={MATERIALS}
          onChange={(v) => onStyleChange({ material: v })}
        />
        <SelectField
          label="조명"
          value={style.lighting}
          options={LIGHTINGS}
          onChange={(v) => onStyleChange({ lighting: v })}
        />
        <SelectField
          label="외곽선"
          value={style.outline}
          options={OUTLINES}
          onChange={(v) => onStyleChange({ outline: v })}
        />
        <SelectField
          label="렌더 타입"
          value={style.renderType}
          options={RENDER_TYPES}
          onChange={(v) => onStyleChange({ renderType: v })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="palette" className="text-sm font-medium">
          팔레트 (hex, 쉼표 구분)
        </Label>
        <Input
          id="palette"
          placeholder="예: #FF6B6B, #4ECDC4, #45B7D1"
          value={style.palette.join(", ")}
          onChange={(e) =>
            onStyleChange({
              palette: e.target.value
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean),
            })
          }
        />
        {style.palette.length > 0 && (
          <div className="flex gap-1.5">
            {style.palette.map((color, idx) => (
              <div
                key={idx}
                className="h-6 w-6 rounded-md border"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">부드러움</Label>
          <span className="text-sm text-muted-foreground">
            {style.softness.toFixed(1)}
          </span>
        </div>
        <Slider
          value={[style.softness]}
          onValueChange={(values) =>
            onStyleChange({ softness: Array.isArray(values) ? values[0] : values })
          }
          min={0}
          max={1}
          step={0.1}
          className="w-full"
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={(v) => { if (v !== null) onChange(v); }}>
        <SelectTrigger>
          <SelectValue placeholder={`${label} 선택`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
