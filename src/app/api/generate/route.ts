import { NextRequest, NextResponse } from "next/server";
import { GENERATION_MODELS, type GenerationModel } from "@/types";

export const maxDuration = 60;

const API_BASE_URL = process.env.AAC_API_BASE_URL || "https://aac-api.navercorp.com";
const API_KEY = process.env.AAC_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, negativePrompt, model = "imagen" } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    if (!API_KEY) {
      return NextResponse.json({ error: "API key is not configured" }, { status: 500 });
    }

    const modelKey = model as GenerationModel;
    const modelInfo = GENERATION_MODELS[modelKey];
    if (!modelInfo) {
      return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 });
    }

    if (modelInfo.apiType === "imagen") {
      return handleImagenGeneration(modelInfo.id, prompt, negativePrompt);
    }
    return handleGeminiGeneration(modelInfo.id, prompt, negativePrompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Generation error:", message);
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 });
  }
}

async function handleImagenGeneration(modelId: string, prompt: string, negativePrompt?: string) {
  const requestBody: Record<string, unknown> = {
    model: modelId,
    prompt,
    n: 1,
    size: "2048x2048",
  };
  if (negativePrompt) {
    requestBody.negative_prompt = negativePrompt;
  }

  const response = await fetch(`${API_BASE_URL}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Imagen API error:", response.status, errorText);
    return NextResponse.json({ error: `Imagen API failed: ${response.status}` }, { status: response.status });
  }

  const data = await response.json();

  if (data.data?.[0]?.b64_json) {
    return NextResponse.json({ imageUrl: `data:image/png;base64,${data.data[0].b64_json}`, seed: Date.now() });
  }
  if (data.data?.[0]?.url) {
    return NextResponse.json({ imageUrl: data.data[0].url, seed: Date.now() });
  }

  console.error("Imagen unexpected response:", JSON.stringify(data).slice(0, 500));
  return NextResponse.json({ error: "Imagen: unexpected response format" }, { status: 500 });
}

async function handleGeminiGeneration(modelId: string, prompt: string, negativePrompt?: string) {
  let fullPrompt = `Generate a SQUARE (1:1) image.\n\n${prompt}`;
  if (negativePrompt) {
    fullPrompt += `\n\nDo NOT include: ${negativePrompt}`;
  }
  fullPrompt += "\n\nCRITICAL: Square 1:1 image. Object drawn directly on plain white background. NO paper, NO card, NO sticker peel, NO frame, NO surface. Output only the image.";

  const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.8,
      max_tokens: 4096,
      image_size: "1024x1024",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error (${modelId}):`, response.status, errorText);
    return NextResponse.json({ error: `${modelId} API failed: ${response.status}` }, { status: response.status });
  }

  const data = await response.json();
  const choice = data.choices?.[0]?.message;

  if (!choice) {
    console.error(`Gemini no choice (${modelId}):`, JSON.stringify(data).slice(0, 500));
    return NextResponse.json({ error: `${modelId}: no response` }, { status: 500 });
  }

  // Case 1: images array on message (Gemini image_generation models)
  if (Array.isArray(choice.images) && choice.images.length > 0) {
    const img = choice.images[0];
    if (img.image_url?.url) {
      return NextResponse.json({ imageUrl: img.image_url.url, seed: Date.now() });
    }
    if (img.url) {
      return NextResponse.json({ imageUrl: img.url, seed: Date.now() });
    }
    if (img.b64_json) {
      return NextResponse.json({ imageUrl: `data:image/png;base64,${img.b64_json}`, seed: Date.now() });
    }
  }

  // Case 2: content is array of parts (multimodal response)
  if (Array.isArray(choice.content)) {
    for (const part of choice.content) {
      if (part.inline_data?.data) {
        const mime = part.inline_data.mime_type || "image/png";
        return NextResponse.json({ imageUrl: `data:${mime};base64,${part.inline_data.data}`, seed: Date.now() });
      }
      if (part.image_url?.url) {
        return NextResponse.json({ imageUrl: part.image_url.url, seed: Date.now() });
      }
    }
  }

  // Case 3: content is string with embedded base64
  if (typeof choice.content === "string" && choice.content.includes("base64")) {
    const b64Match = choice.content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/);
    if (b64Match) {
      return NextResponse.json({ imageUrl: b64Match[0], seed: Date.now() });
    }
  }

  console.error(`Gemini image extract failed (${modelId}). Keys:`, Object.keys(choice), JSON.stringify(data).slice(0, 500));
  return NextResponse.json({ error: `${modelId}: could not extract image` }, { status: 500 });
}
