"use client";

import { useCallback, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { FileText, Image as ImageIcon, X } from "lucide-react";

interface ImageUploadSectionProps {
  specFile: File | null;
  referenceFiles: File[];
  onSpecFileChange: (file: File | null) => void;
  onAddReference: (file: File) => void;
  onRemoveReference: (index: number) => void;
}

export function ImageUploadSection({
  specFile,
  referenceFiles,
  onSpecFileChange,
  onAddReference,
  onRemoveReference,
}: ImageUploadSectionProps) {
  const specInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const [specPreview, setSpecPreview] = useState<string | null>(null);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);
  const [specDragOver, setSpecDragOver] = useState(false);
  const [refDragOver, setRefDragOver] = useState(false);

  const processSpecFile = useCallback(
    (file: File) => {
      onSpecFileChange(file);
      if (file.type.startsWith("image/")) {
        setSpecPreview(URL.createObjectURL(file));
      } else {
        setSpecPreview(null);
      }
    },
    [onSpecFileChange]
  );

  const processRefFile = useCallback(
    (file: File) => {
      onAddReference(file);
      if (file.type.startsWith("image/")) {
        setRefPreviews((prev) => [...prev, URL.createObjectURL(file)]);
      } else {
        setRefPreviews((prev) => [...prev, ""]);
      }
    },
    [onAddReference]
  );

  const handleSpecFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processSpecFile(file);
    },
    [processSpecFile]
  );

  const handleRefFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processRefFile(file);
    },
    [processRefFile]
  );

  const handleRemoveRef = useCallback(
    (index: number) => {
      onRemoveReference(index);
      setRefPreviews((prev) => prev.filter((_, i) => i !== index));
    },
    [onRemoveReference]
  );

  const handleRemoveSpec = useCallback(() => {
    onSpecFileChange(null);
    setSpecPreview(null);
    if (specInputRef.current) specInputRef.current.value = "";
  }, [onSpecFileChange]);

  const handleSpecDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setSpecDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processSpecFile(file);
    },
    [processSpecFile]
  );

  const handleRefDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setRefDragOver(false);
      const files = e.dataTransfer.files;
      if (files) {
        Array.from(files).forEach((file) => processRefFile(file));
      }
    },
    [processRefFile]
  );

  const preventDefaults = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">이미지 & 문서</h2>

      {/* Spec / Planning Doc */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">기획안 / 스펙 문서</Label>
        <input
          ref={specInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.doc,.docx"
          onChange={handleSpecFile}
          className="hidden"
        />
        {!specFile ? (
          <button
            type="button"
            onClick={() => specInputRef.current?.click()}
            onDragOver={(e) => { preventDefaults(e); setSpecDragOver(true); }}
            onDragEnter={(e) => { preventDefaults(e); setSpecDragOver(true); }}
            onDragLeave={(e) => { preventDefaults(e); setSpecDragOver(false); }}
            onDrop={handleSpecDrop}
            className={`flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
              specDragOver
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25 bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium">
                기획안을 업로드하거나 드래그하여 놓으세요
              </p>
              <p className="text-xs text-muted-foreground">
                이미지, PDF, 텍스트 파일 지원
              </p>
            </div>
          </button>
        ) : (
          <div className="relative rounded-lg border bg-muted/20 p-4">
            <button
              type="button"
              onClick={handleRemoveSpec}
              className="absolute right-2 top-2 rounded-full bg-destructive/10 p-1 text-destructive hover:bg-destructive/20"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              {specPreview ? (
                <img
                  src={specPreview}
                  alt="spec preview"
                  className="h-16 w-16 rounded-md object-cover"
                />
              ) : (
                <FileText className="h-10 w-10 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">{specFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(specFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reference images */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">레퍼런스 (선택사항)</Label>
        <input
          ref={refInputRef}
          type="file"
          accept="image/*"
          onChange={handleRefFile}
          className="hidden"
          multiple
        />
        <div
          onDragOver={(e) => { preventDefaults(e); setRefDragOver(true); }}
          onDragEnter={(e) => { preventDefaults(e); setRefDragOver(true); }}
          onDragLeave={(e) => { preventDefaults(e); setRefDragOver(false); }}
          onDrop={handleRefDrop}
          className={`grid grid-cols-2 gap-3 rounded-lg p-2 transition-colors sm:grid-cols-3 ${
            refDragOver ? "bg-primary/10 ring-2 ring-primary" : ""
          }`}
        >
          {referenceFiles.map((file, idx) => (
            <div
              key={idx}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted/20"
            >
              {refPreviews[idx] ? (
                <img
                  src={refPreviews[idx]}
                  alt={`ref ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemoveRef(idx)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 truncate bg-black/40 px-2 py-1 text-xs text-white">
                {file.name}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => refInputRef.current?.click()}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">
              클릭 또는 드래그
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
