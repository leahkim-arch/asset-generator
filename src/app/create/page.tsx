"use client";

import { useCallback, useState, useRef } from "react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft, Loader2, Square, Eye, Lock, Unlock } from "lucide-react";
import { TopicSection } from "@/components/create/TopicSection";
import { ImageUploadSection } from "@/components/create/ImageUploadSection";
import { StyleSection } from "@/components/create/StyleSection";
import { GridSection } from "@/components/create/GridSection";
import { ItemsSection } from "@/components/create/ItemsSection";
import { GenerationPreview } from "@/components/create/GenerationPreview";
import { useAssetProject } from "@/hooks/useAssetProject";
import { getApiAdapter } from "@/lib/api-adapter";
import { GRID_COUNTS, GENERATION_MODELS, type GenerationModel } from "@/types";

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
  const [imagenPromptPrefix, setImagenPromptPrefix] = useState<string>("");
  const [imagenNegativeHints, setImagenNegativeHints] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<GenerationModel>("imagen");
  const [styleLockImage, setStyleLockImage] = useState<string | null>(null);
  const [styleLockEnabled, setStyleLockEnabled] = useState(true);

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
          if (result.imagenPromptPrefix) {
            setImagenPromptPrefix(result.imagenPromptPrefix);
          }
          if (result.imagenNegativeHints) {
            setImagenNegativeHints(result.imagenNegativeHints);
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
          if (result.imagenPromptPrefix) {
            setImagenPromptPrefix(result.imagenPromptPrefix);
          }
          if (result.imagenNegativeHints) {
            setImagenNegativeHints(result.imagenNegativeHints);
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
    const modelInfo = GENERATION_MODELS[selectedModel];
    if (modelInfo.apiType === "imagen") {
      return buildImagenPrompt(itemLabel);
    }
    return buildGeminiPrompt(itemLabel);
  };

  const buildNegativePrompt = (): string => {
    const core = "multiple objects, collage, text, watermark, blurry, low quality";
    const background = "paper, card, frame, sticker peel, shadow on surface";
    const hints = [imagenNegativeHints, project.style.negativePrompt].filter(Boolean).join(", ");
    return [hints, core, background].filter(Boolean).join(", ");
  };

  const buildStyleKeywords = (): string => {
    const details: string[] = [];
    if (project.style.material) details.push(project.style.material);
    if (project.style.lighting) details.push(project.style.lighting);
    if (project.style.renderType) details.push(project.style.renderType);
    if (project.style.outline && project.style.outline !== "none") details.push(`${project.style.outline} outline`);
    if (project.style.palette.length > 0) details.push(project.style.palette.join(", "));
    return details.join(", ");
  };

  const buildImagenPrompt = (itemLabel: string): string => {
    const MAX_PROMPT_LENGTH = 480;
    const parts: string[] = [];

    if (imagenPromptPrefix) {
      parts.push(imagenPromptPrefix);
    } else if (project.style.stylePrompt) {
      parts.push(project.style.stylePrompt.slice(0, 150));
    }

    parts.push(`a single "${itemLabel}" icon, centered composition, solid plain white background, isolated object, clean edges, no overlap`);

    const extras = buildStyleKeywords();
    if (extras) parts.push(extras);

    parts.push("high quality, sharp details, consistent style");

    let prompt = parts.join(", ");
    if (prompt.length > MAX_PROMPT_LENGTH) {
      prompt = prompt.slice(0, MAX_PROMPT_LENGTH - 3) + "...";
    }
    return prompt;
  };

  const buildGeminiPrompt = (itemLabel: string): string => {
    const sections: string[] = [];

    sections.push(`Create a single icon of "${itemLabel}".`);

    sections.push("COMPOSITION: The icon must be drawn directly on a plain solid white (#FFFFFF) background. The object is centered with even padding on all sides. There is NOTHING else in the image — no paper, no card, no frame, no surface, no shadow, no border. The object floats on white as a clean digital icon.");

    if (analyzedStyle) {
      sections.push(`STYLE (follow this exactly): ${analyzedStyle}`);
    } else if (project.style.stylePrompt) {
      sections.push(`STYLE: ${project.style.stylePrompt}`);
    }

    const extras = buildStyleKeywords();
    if (extras) {
      sections.push(`DETAILS: ${extras}.`);
    }

    sections.push("OUTPUT: Square 1:1 aspect ratio. Single object only. High quality, sharp, clean edges. Output the image directly with no text.");

    return sections.join("\n\n");
  };

  const handleGenerate = useCallback(async () => {
    if (!project.topic.trim() && !project.style.stylePrompt.trim() && !analyzedStyle) return;

    setIsGenerating(true);
    setStatus("generating");

    const signal = getAbortSignal();
    const adapter = getApiAdapter();
    const targetCount = GRID_COUNTS[project.grid];

    let currentItems = [...project.items];

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
        if (result.imagenPromptPrefix) {
          setImagenPromptPrefix(result.imagenPromptPrefix);
        }
        if (result.imagenNegativeHints) {
          setImagenNegativeHints(result.imagenNegativeHints);
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

    let lockRef: string | null = styleLockImage;
    const modelInfo = GENERATION_MODELS[selectedModel];
    const canUseLock = styleLockEnabled && modelInfo.apiType === "gemini";

    for (const item of currentItems) {
      if (signal.aborted) {
        updateItemStatus(item.id, "pending");
        continue;
      }

      updateItemStatus(item.id, "generating");

      try {
        const prompt = buildSingleAssetPrompt(item.label);
        const negPrompt = buildNegativePrompt();

        let result;
        try {
          result = await adapter.generateImage({
            prompt,
            negativePrompt: negPrompt,
            model: selectedModel,
            referenceImageUrl: canUseLock && lockRef ? lockRef : undefined,
          });
        } catch (firstErr) {
          console.warn(`1st attempt failed for "${item.label}", retrying...`, firstErr);
          await new Promise(r => setTimeout(r, 1500));
          result = await adapter.generateImage({
            prompt,
            negativePrompt: negPrompt,
            model: selectedModel,
            referenceImageUrl: canUseLock && lockRef ? lockRef : undefined,
          });
        }

        if (!signal.aborted) {
          updateItemStatus(item.id, "done", result.imageUrl);

          if (!lockRef && canUseLock && result.imageUrl) {
            lockRef = result.imageUrl;
            setStyleLockImage(result.imageUrl);
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          const msg = err instanceof Error ? err.message : "알 수 없는 오류";
          console.error(`Generation failed for "${item.label}":`, msg);
          updateItemStatus(item.id, "error", undefined, msg);
        }
      }
    }

    setIsGenerating(false);
    setStatus(signal.aborted ? "draft" : "completed");
  }, [project, analyzedStyle, imagenPromptPrefix, imagenNegativeHints, selectedModel, setItems, updateItemStatus, setStatus, getAbortSignal, updateStyle]);

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
        const negPrompt = buildNegativePrompt();
        const modelInfo = GENERATION_MODELS[selectedModel];
        const canUseLock = styleLockEnabled && modelInfo.apiType === "gemini";

        let result;
        try {
          result = await adapter.generateImage({
            prompt,
            negativePrompt: negPrompt,
            model: selectedModel,
            referenceImageUrl: canUseLock && styleLockImage ? styleLockImage : undefined,
          });
        } catch (firstErr) {
          console.warn(`Regenerate 1st attempt failed for "${item.label}", retrying...`, firstErr);
          await new Promise(r => setTimeout(r, 1500));
          result = await adapter.generateImage({
            prompt,
            negativePrompt: negPrompt,
            model: selectedModel,
            referenceImageUrl: canUseLock && styleLockImage ? styleLockImage : undefined,
          });
        }
        updateItemStatus(id, "done", result.imageUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        console.error(`Regeneration failed for "${item.label}":`, msg);
        updateItemStatus(id, "error", undefined, msg);
      }
    },
    [project, analyzedStyle, imagenPromptPrefix, imagenNegativeHints, selectedModel, updateItemStatus]
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
            <Button
              variant={styleLockEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStyleLockEnabled(!styleLockEnabled);
                if (!styleLockEnabled) setStyleLockImage(null);
              }}
              disabled={isGenerating}
              title={styleLockEnabled ? "스타일 락킹 ON: 첫 이미지 스타일을 나머지에 적용" : "스타일 락킹 OFF"}
              className="gap-1 text-xs"
            >
              {styleLockEnabled ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              스타일 락
            </Button>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">모델</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as GenerationModel)}
                disabled={isGenerating}
                className="h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                title="생성 모델 선택"
              >
                {Object.entries(GENERATION_MODELS).map(([key, m]) => (
                  <option key={key} value={key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
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

                <ItemsSection
                  items={project.items}
                  grid={project.grid}
                  topic={project.topic}
                  onSetItems={setItems}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                />

                <Separator />

                <GridSection grid={project.grid} onGridChange={setGrid} />

                <Separator />

                <StyleSection
                  style={project.style}
                  topic={project.topic}
                  onStyleChange={updateStyle}
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
