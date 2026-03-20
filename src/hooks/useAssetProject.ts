"use client";

import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  AssetProject,
  StyleConfig,
  GridSize,
  AssetItem,
  ProjectStatus,
  BgColor,
} from "@/types";

const defaultStyle: StyleConfig = {
  stylePrompt: "",
  negativePrompt: "",
  material: "",
  lighting: "",
  outline: "",
  renderType: "",
  palette: [],
  softness: 0.5,
};

const initialProject: AssetProject = {
  id: uuidv4(),
  topic: "",
  specFile: null,
  referenceFiles: [],
  style: defaultStyle,
  grid: "5x5",
  items: [],
  status: "draft",
  bgColor: "gray",
  createdAt: new Date(),
};

export function useAssetProject() {
  const [project, setProject] = useState<AssetProject>(initialProject);
  const abortRef = useRef<AbortController | null>(null);

  const setTopic = useCallback((topic: string) => {
    setProject((prev) => ({ ...prev, topic }));
  }, []);

  const setSpecFile = useCallback((file: File | null) => {
    setProject((prev) => ({ ...prev, specFile: file }));
  }, []);

  const addReferenceFile = useCallback((file: File) => {
    setProject((prev) => ({
      ...prev,
      referenceFiles: [...prev.referenceFiles, file],
    }));
  }, []);

  const removeReferenceFile = useCallback((index: number) => {
    setProject((prev) => ({
      ...prev,
      referenceFiles: prev.referenceFiles.filter((_, i) => i !== index),
    }));
  }, []);

  const updateStyle = useCallback((updates: Partial<StyleConfig>) => {
    setProject((prev) => ({
      ...prev,
      style: { ...prev.style, ...updates },
    }));
  }, []);

  const setGrid = useCallback((grid: GridSize) => {
    setProject((prev) => ({ ...prev, grid }));
  }, []);

  const setBgColor = useCallback((bgColor: BgColor) => {
    setProject((prev) => ({ ...prev, bgColor }));
  }, []);

  const setItems = useCallback((items: AssetItem[]) => {
    setProject((prev) => ({ ...prev, items }));
  }, []);

  const addItem = useCallback((label: string) => {
    const newItem: AssetItem = {
      id: uuidv4(),
      label,
      status: "pending",
    };
    setProject((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setProject((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

  const updateItemStatus = useCallback(
    (id: string, status: AssetItem["status"], imageUrl?: string, errorMessage?: string) => {
      setProject((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                imageUrl: imageUrl ?? item.imageUrl,
                errorMessage: status === "error" ? (errorMessage ?? "생성 실패") : undefined,
              }
            : item
        ),
      }));
    },
    []
  );

  const setStatus = useCallback((status: ProjectStatus) => {
    setProject((prev) => ({ ...prev, status }));
  }, []);

  const abortGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const getAbortSignal = useCallback(() => {
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const resetProject = useCallback(() => {
    setProject({ ...initialProject, id: uuidv4(), createdAt: new Date() });
  }, []);

  return {
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
    resetProject,
  };
}
