import type {
  ApiAdapter,
  ImageGenerationRequest,
  ImageGenerationResponse,
  AnalysisResult,
} from "@/types";

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`요청 시간 초과 (${Math.round(timeoutMs / 1000)}초)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export class AacApiAdapter implements ApiAdapter {
  async generateImage(
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    const response = await fetchWithTimeout("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        model: request.model || "gemini-3.1-flash-image",
        referenceImageUrl: request.referenceImageUrl,
      }),
    }, 65000);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Generation failed (${response.status})`);
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

    const response = await fetchWithTimeout("/api/analyze", {
      method: "POST",
      body: fd,
    }, 125000);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Analysis failed (${response.status})`);
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
