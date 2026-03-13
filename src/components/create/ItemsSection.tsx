"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Sparkles, Loader2 } from "lucide-react";
import type { AssetItem, GridSize } from "@/types";
import { GRID_COUNTS } from "@/types";
import { getApiAdapter } from "@/lib/api-adapter";

interface ItemsSectionProps {
  items: AssetItem[];
  grid: GridSize;
  topic: string;
  onSetItems: (items: AssetItem[]) => void;
  onAddItem: (label: string) => void;
  onRemoveItem: (id: string) => void;
}

export function ItemsSection({
  items,
  grid,
  topic,
  onSetItems,
  onAddItem,
  onRemoveItem,
}: ItemsSectionProps) {
  const [newItemLabel, setNewItemLabel] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const targetCount = GRID_COUNTS[grid];

  const handleAdd = useCallback(() => {
    const label = newItemLabel.trim();
    if (!label) return;
    onAddItem(label);
    setNewItemLabel("");
  }, [newItemLabel, onAddItem]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  const handleAiSuggest = useCallback(async () => {
    if (!topic.trim()) return;
    setSuggesting(true);
    try {
      const adapter = getApiAdapter();
      const result = await adapter.analyzeDocument(topic);
      const suggested = result.suggestedItems.slice(0, targetCount);
      const newItems: AssetItem[] = suggested.map((label, i) => ({
        id: `suggested-${Date.now()}-${i}`,
        label,
        status: "pending" as const,
      }));
      onSetItems(newItems);
    } catch {
      // silently fail
    } finally {
      setSuggesting(false);
    }
  }, [topic, targetCount, onSetItems]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">아이템</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAiSuggest}
          disabled={!topic.trim() || suggesting}
        >
          {suggesting ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4" />
          )}
          AI 추천
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="아이템 이름 입력"
          value={newItemLabel}
          onChange={(e) => setNewItemLabel(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={!newItemLabel.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="gap-1 py-1.5 pl-3 pr-1.5 text-sm"
            >
              {item.label}
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          아이템을 수동으로 추가하거나 AI 추천을 사용하세요.
          <br />
          비워두면 주제에 맞춰 자동 생성됩니다.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {items.length} / {targetCount}개
      </p>
    </div>
  );
}
