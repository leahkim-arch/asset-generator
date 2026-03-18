import type {
  ApiAdapter,
  ImageGenerationRequest,
  ImageGenerationResponse,
  AnalysisResult,
} from "@/types";

export class AacApiAdapter implements ApiAdapter {
  async generateImage(
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        model: request.model || "imagen",
        referenceImageUrl: request.referenceImageUrl,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Generation failed: ${response.status}`);
    }

    return response.json();
  }

  async analyzeImage(_imageUrl: string): Promise<AnalysisResult> {
    return {
      analyzedStyle: "",
      imagenPromptPrefix: "sticker, high quality, clean",
      imagenNegativeHints: "",
      keywords: ["sticker", "character", "colorful"],
      mood: "playful",
      colors: ["#FF6B6B", "#4ECDC4", "#45B7D1"],
      suggestedItems: [],
      suggestedStylePrompt: "",
      summary: "Reference image analyzed",
    };
  }

  async analyzeWithImages(
    topic: string,
    specFile?: File | null,
    referenceFiles?: File[]
  ): Promise<AnalysisResult> {
    const fd = new FormData();
    fd.append("topic", topic);

    if (specFile) {
      fd.append("specImage", specFile);
    }

    if (referenceFiles) {
      for (const ref of referenceFiles) {
        fd.append("refImages", ref);
      }
    }

    const response = await fetch("/api/analyze", {
      method: "POST",
      body: fd,
    });

    if (!response.ok) {
      throw new Error("Analysis failed");
    }

    return response.json();
  }

  async analyzeDocument(content: string): Promise<AnalysisResult> {
    return this.analyzeWithImages(content);
  }
}

let currentAdapter: AacApiAdapter = new AacApiAdapter();

export function setApiAdapter(adapter: AacApiAdapter) {
  currentAdapter = adapter;
}

export function getApiAdapter(): AacApiAdapter {
  return currentAdapter;
}
