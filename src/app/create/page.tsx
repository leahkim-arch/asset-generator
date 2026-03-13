"use client";

import { useCallback, useState, useRef } from "react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft, Loader2, Square, Eye } from "lucide-react";
import { TopicSection } from "@/components/create/TopicSection";
import { ImageUploadSection } from "@/components/create/ImageUploadSection";
import { StyleSection } from "@/components/create/StyleSection";
import { GridSection } from "@/components/create/GridSection";
import { ItemsSection } from "@/components/create/ItemsSection";
import { GenerationPreview } from "@/components/create/GenerationPreview";
import { useAssetProject } from "@/hooks/useAssetProject";
import { getApiAdapter } from "@/lib/api-adapter";
import { GRID_COUNTS } from "@/types";

export default function CreatePage() {
  const {
    project,
    setTopic,
    setSpecFile,
    addReferenceFile,
    removeReferenceFile,
    updateStyle,
    setGrid,
    setBgColor,
    setItems,
    addItem,
    removeItem,
    updateItemStatus,
    setStatus,
    abortGeneration,
    getAbortSignal,
  } = useAssetProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedStyle, setAnalyzedStyle] = useState<string>("");

  const handleSpecFileChange = useCallback(
    async (file: File | null) => {
      setSpecFile(file);

      if (file && file.type.startsWith("image/")) {
        setIsAnalyzing(true);
        try {
          const adapter = getApiAdapter();
          const result = await adapter.analyzeWithImages(
            project.topic,
            file,
            project.referenceFiles
          );

          if (result.analyzedStyle) {
            setAnalyzedStyle(result.analyzedStyle);
          }
          if (result.suggestedStylePrompt) {
            updateStyle({ stylePrompt: result.suggestedStylePrompt });
          }
          if (result.suggestedItems?.length > 0 && project.items.length === 0) {
            const newItems = result.suggestedItems
              .slice(0, GRID_COUNTS[project.grid])
              .map((label, i) => ({
                id: `analyzed-${Date.now()}-${i}`,
                label,
                status: "pending" as const,
              }));
            setItems(newItems);
          }
        } catch (e) {
          console.error("Auto-analysis failed:", e);
        } finally {
          setIsAnalyzing(false);
        }
      }
    },
    [project.topic, project.referenceFiles, project.items.length, project.grid, setSpecFile, updateStyle, setItems]
  );

  const handleAddReference = useCallback(
    async (file: File) => {
      addReferenceFile(file);

      if (file.type.startsWith("image/") && project.specFile) {
        setIsAnalyzing(true);
        try {
          const adapter = getApiAdapter();
          const result = await adapter.analyzeWithImages(
            project.topic,
            project.specFile,
            [...project.referenceFiles, file]
          );

          if (result.analyzedStyle) {
            setAnalyzedStyle(result.analyzedStyle);
          }
          if (result.suggestedStylePrompt) {
            updateStyle({ stylePrompt: result.suggestedStylePrompt });
          }
        } catch {
          // silently fail
        } finally {
          setIsAnalyzing(false);
        }
      }
    },
    [project.topic, project.specFile, project.referenceFiles, addReferenceFile, updateStyle]
  );

  const buildSingleAssetPrompt = (itemLabel: string): string => {
    const parts: string[] = [];

    // PRIORITY 1: Analyzed style from planning doc / reference images
    if (analyzedStyle) {
      parts.push(`STYLE REFERENCE (follow this exactly): ${analyzedStyle}`);
    }

    parts.push(
      `Subject: A single "${itemLabel}" asset, centered, isolated on transparent background`
    );
    parts.push("Only one object, no other elements, clean isolated asset");

    // PRIORITY 2: User's style prompt (secondary to analyzed style)
    if (project.style.stylePrompt) {
      parts.push(`Additional style notes: ${project.style.stylePrompt}`);
    }

    if (project.style.material) parts.push(`${project.style.material} material`);
    if (project.style.lighting) parts.push(`${project.style.lighting} lighting`);
    if (project.style.renderType) parts.push(`${project.style.renderType} style`);
    if (project.style.outline && project.style.outline !== "none") {
      parts.push(`${project.style.outline} outline`);
    }
    if (project.style.palette.length > 0) {
      parts.push(`color palette: ${project.style.palette.join(", ")}`);
    }

    return parts.join(". ");
  };

  const handleGenerate = useCallback(async () => {
    if (!project.topic.trim() && !project.style.stylePrompt.trim() && !analyzedStyle) return;

    setIsGenerating(true);
    setStatus("generating");

    const signal = getAbortSignal();
    const adapter = getApiAdapter();
    const targetCount = GRID_COUNTS[project.grid];

    let currentItems = [...project.items];

    // If no items and no analysis done yet, analyze now
    if (currentItems.length === 0) {
      try {
        const result = await adapter.analyzeWithImages(
          project.topic,
          project.specFile,
          project.referenceFiles
        );

        if (result.analyzedStyle && !analyzedStyle) {
          setAnalyzedStyle(result.analyzedStyle);
        }

        const suggested = result.suggestedItems.slice(0, targetCount);
        currentItems = suggested.map((label) => ({
          id: uuidv4(),
          label,
          status: "pending" as const,
        }));

        if (result.suggestedStylePrompt && !project.style.stylePrompt.trim()) {
          updateStyle({ stylePrompt: result.suggestedStylePrompt });
        }
      } catch {
        currentItems = Array.from({ length: targetCount }, (_, i) => ({
          id: uuidv4(),
          label: `${project.topic} #${i + 1}`,
          status: "pending" as const,
        }));
      }
    }

    while (currentItems.length < targetCount) {
      currentItems.push({
        id: uuidv4(),
        label: `${project.topic} #${currentItems.length + 1}`,
        status: "pending" as const,
      });
    }
    currentItems = currentItems.slice(0, targetCount);
    setItems(currentItems);

    for (const item of currentItems) {
      if (signal.aborted) {
        updateItemStatus(item.id, "pending");
        continue;
      }

      updateItemStatus(item.id, "generating");

      try {
        const prompt = buildSingleAssetPrompt(item.label);
        const negPrompt = [
          project.style.negativePrompt,
          "multiple objects, collage, grid, sheet, collection, busy background, text, watermark",
        ]
          .filter(Boolean)
          .join(", ");

        const result = await adapter.generateImage({
          prompt,
          negativePrompt: negPrompt,
        });

        if (!signal.aborted) {
          updateItemStatus(item.id, "done", result.imageUrl);
        }
      } catch {
        if (!signal.aborted) {
          updateItemStatus(item.id, "error");
        }
      }
    }

    setIsGenerating(false);
    setStatus(signal.aborted ? "draft" : "completed");
  }, [project, analyzedStyle, setItems, updateItemStatus, setStatus, getAbortSignal, updateStyle]);

  const handleAbort = useCallback(() => {
    abortGeneration();
    setIsGenerating(false);
    setStatus("draft");
  }, [abortGeneration, setStatus]);

  const handleRegenerate = useCallback(
    async (id: string) => {
      const item = project.items.find((i) => i.id === id);
      if (!item) return;

      updateItemStatus(id, "generating");

      try {
        const adapter = getApiAdapter();
        const prompt = buildSingleAssetPrompt(item.label);
        const negPrompt = [
          project.style.negativePrompt,
          "multiple objects, collage, grid, sheet, collection, busy background, text, watermark",
        ]
          .filter(Boolean)
          .join(", ");

        const result = await adapter.generateImage({
          prompt,
          negativePrompt: negPrompt,
        });
        updateItemStatus(id, "done", result.imageUrl);
      } catch {
        updateItemStatus(id, "error");
      }
    },
    [project, analyzedStyle, updateItemStatus]
  );

  const handleDownloadAll = useCallback(async () => {
    const doneItems = project.items.filter(
      (i) => i.status === "done" && i.imageUrl
    );
    if (doneItems.length === 0) return;

    const JSZip = (await import("jszip")).default;
    const { saveAs } = await import("file-saver");

    const zip = new JSZip();

    for (const item of doneItems) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 720;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        const blob = await new Promise<Blob | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 720, 720);
            canvas.toBlob((b) => resolve(b), "image/png");
          };
          img.onerror = () => resolve(null);
          img.src = item.imageUrl!;
        });

        if (blob) {
          zip.file(`${item.label}.png`, blob);
        }
      } catch {
        // skip
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, `${project.topic || "assets"}-${Date.now()}.zip`);
  }, [project]);

  const canGenerate =
    (project.topic.trim() || project.style.stylePrompt.trim() || analyzedStyle) &&
    !isGenerating;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              홈
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">에셋 생성</span>
            </div>
            {isAnalyzing && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                기획안 분석 중...
              </Badge>
            )}
            {analyzedStyle && !isAnalyzing && (
              <Badge variant="default" className="gap-1">
                <Eye className="h-3 w-3" />
                스타일 분석 완료
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isGenerating && (
              <Button onClick={handleAbort} variant="destructive" size="lg">
                <Square className="mr-2 h-4 w-4" />
                중단
              </Button>
            )}
            <Button onClick={handleGenerate} disabled={!canGenerate} size="lg">
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isGenerating
                ? "생성 중..."
                : `생성하기 (${GRID_COUNTS[project.grid]}개)`}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* Left panel */}
          <div className="space-y-6">
            {analyzedStyle && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold">AI 분석 스타일 (최우선 적용)</h3>
                    </div>
                    <p className="rounded-md bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                      {analyzedStyle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="space-y-6 pt-6">
                <TopicSection topic={project.topic} onTopicChange={setTopic} />

                <Separator />

                <ImageUploadSection
                  specFile={project.specFile}
                  referenceFiles={project.referenceFiles}
                  onSpecFileChange={handleSpecFileChange}
                  onAddReference={handleAddReference}
                  onRemoveReference={removeReferenceFile}
                />

                <Separator />

                <StyleSection
                  style={project.style}
                  topic={project.topic}
                  onStyleChange={updateStyle}
                />

                <Separator />

                <GridSection grid={project.grid} onGridChange={setGrid} />

                <Separator />

                <ItemsSection
                  items={project.items}
                  grid={project.grid}
                  topic={project.topic}
                  onSetItems={setItems}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right panel */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="pt-6">
                <GenerationPreview
                  items={project.items}
                  grid={project.grid}
                  bgColor={project.bgColor}
                  isGenerating={isGenerating}
                  onBgColorChange={setBgColor}
                  onDownloadAll={handleDownloadAll}
                  onRegenerate={handleRegenerate}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
