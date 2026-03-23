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
  errorMessage?: string;
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
  imagenPromptPrefix: string;
  imagenNegativeHints: string;
  keywords: string[];
  mood: string;
  colors: string[];
  suggestedItems: string[];
  suggestedStylePrompt: string;
  summary: string;
}

export type GenerationModel =
  | "seedream-5"
  | "grok-imagine-pro"
  | "gemini-3.1-flash-image"
  | "imagen-4-fast"
  | "gpt-image-1"
  | "gemini-2.5-flash-image"
  | "gemini-3-pro-image"
  | "imagen-4-ultra";

export type ApiType = "imagen" | "gemini";
export type ApiSource = "aac" | "snow";

export interface ModelInfo {
  id: string;
  label: string;
  description: string;
  apiType: ApiType;
  apiSource?: ApiSource;
}

export const GENERATION_MODELS: Record<GenerationModel, ModelInfo> = {
  "seedream-5": {
    id: "seedream-5-0-260128",
    label: "Seedream 5.0",
    description: "삼성 AI, 고품질 스타일 (~13초)",
    apiType: "imagen",
    apiSource: "snow",
  },
  "grok-imagine-pro": {
    id: "grok-imagine-image-pro",
    label: "Grok Imagine Pro",
    description: "xAI, 고품질 (~13초)",
    apiType: "imagen",
    apiSource: "snow",
  },
  "gemini-3.1-flash-image": {
    id: "gemini-3.1-flash-image-preview",
    label: "Gemini 3.1 Flash Image",
    description: "최신 Flash (~23초)",
    apiType: "gemini",
  },
  "imagen-4-fast": {
    id: "vertex_ai/imagen-4.0-fast-generate-001",
    label: "Imagen 4 Fast",
    description: "최고 속도 (~6초)",
    apiType: "imagen",
  },
  "gpt-image-1": {
    id: "gpt-image-1",
    label: "GPT Image 1",
    description: "OpenAI (~12초)",
    apiType: "imagen",
  },
  "gemini-2.5-flash-image": {
    id: "gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image",
    description: "안정적 Flash (~17초)",
    apiType: "gemini",
  },
  "gemini-3-pro-image": {
    id: "gemini-3-pro-image-preview",
    label: "Gemini 3 Pro Image",
    description: "Pro급 품질 (~25초)",
    apiType: "gemini",
  },
  "imagen-4-ultra": {
    id: "vertex_ai/imagen-4.0-ultra-generate-001",
    label: "Imagen 4 Ultra",
    description: "최고 품질 (~30초+)",
    apiType: "imagen",
  },
};

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  model?: GenerationModel;
  referenceImageUrl?: string;
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
