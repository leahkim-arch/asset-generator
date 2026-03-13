export interface AssetProject {
  id: string;
  topic: string;
  specFile: File | null;
  referenceFiles: File[];
  style: StyleConfig;
  grid: GridSize;
  items: AssetItem[];
  status: ProjectStatus;
  bgColor: BgColor;
  createdAt: Date;
}

export interface StyleConfig {
  stylePrompt: string;
  negativePrompt: string;
  material: string;
  lighting: string;
  outline: string;
  renderType: string;
  palette: string[];
  softness: number;
}

export type GridSize = "3x3" | "4x4" | "5x5" | "6x6";

export const GRID_COUNTS: Record<GridSize, number> = {
  "3x3": 9,
  "4x4": 16,
  "5x5": 25,
  "6x6": 36,
};

export type BgColor = "black" | "gray" | "white" | "blue" | "yellow";

export const BG_COLOR_MAP: Record<BgColor, { hex: string; label: string }> = {
  black: { hex: "#000000", label: "블랙" },
  gray: { hex: "#808080", label: "그레이" },
  white: { hex: "#FFFFFF", label: "화이트" },
  blue: { hex: "#3B82F6", label: "블루" },
  yellow: { hex: "#FACC15", label: "옐로우" },
};

export interface AssetItem {
  id: string;
  label: string;
  imageUrl?: string;
  status: "pending" | "generating" | "done" | "error";
}

export type ProjectStatus =
  | "draft"
  | "analyzing"
  | "ready"
  | "generating"
  | "completed"
  | "error";

export interface AnalysisResult {
  analyzedStyle: string;
  keywords: string[];
  mood: string;
  colors: string[];
  suggestedItems: string[];
  suggestedStylePrompt: string;
  summary: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  width?: number;
  height?: number;
}

export interface ImageGenerationResponse {
  imageUrl: string;
  seed?: number;
}

export interface ApiAdapter {
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  analyzeImage(imageUrl: string): Promise<AnalysisResult>;
  analyzeDocument(content: string): Promise<AnalysisResult>;
}
