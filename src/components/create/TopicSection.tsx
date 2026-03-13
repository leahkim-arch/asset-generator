"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TopicSectionProps {
  topic: string;
  onTopicChange: (topic: string) => void;
}

export function TopicSection({ topic, onTopicChange }: TopicSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="topic" className="text-base font-semibold">
        주제 / 테마
      </Label>
      <Input
        id="topic"
        placeholder="예: 귀여운 동물 캐릭터, 음식 이모티콘, 오피스 생활 등"
        value={topic}
        onChange={(e) => onTopicChange(e.target.value)}
        className="h-12 text-base"
      />
    </div>
  );
}
