import { NextRequest, NextResponse } from "next/server";
import { GENERATION_MODELS, type GenerationModel } from "@/types";

const API_BASE_URL = process.env.AAC_API_BASE_URL || "https://aac-api.navercorp.com";
const API_KEY = process.env.AAC_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, negativePrompt, model = "imagen" } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: "API key is not configured" },
        { status: 500 }
      );
    }

    const modelKey = model as GenerationModel;
    const modelInfo = GENERATION_MODELS[modelKey];

    if (!modelInfo) {
      return NextResponse.json(
        { error: `Unknown model: ${model}` },
        { status: 400 }
      );
    }

    switch (modelInfo.apiType) {
      case "imagen":
        return handleImagenGeneration(modelInfo.id, prompt, negativePrompt);
      case "gemini-image":
        return handleGeminiImageGeneration(modelInfo.id, prompt, negativePrompt);
      case "gemini-chat":
        return handleGeminiChatGeneration(modelInfo.id, prompt, negativePrompt);
      default:
        return NextResponse.json(
          { error: "Unsupported API type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: `API request failed: ${response.status}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  return extractImageFromImagen(data);
}

async function handleGeminiImageGeneration(modelId: string, prompt: string, negativePrompt?: string) {
  let fullPrompt = `Generate a sticker asset image: ${prompt}`;
  if (negativePrompt) {
    fullPrompt += `\n\nDo NOT include: ${negativePrompt}`;
  }

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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini Image API error:", response.status, errorText);
    return NextResponse.json(
      { error: `API request failed: ${response.status}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  return extractImageFromGemini(data, modelId);
}

async function handleGeminiChatGeneration(modelId: string, prompt: string, negativePrompt?: string) {
  let fullPrompt = `Generate a sticker asset image based on this description. Output ONLY the image, no text.\n\n${prompt}`;
  if (negativePrompt) {
    fullPrompt += `\n\nDo NOT include: ${negativePrompt}`;
  }

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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini Chat API error:", response.status, errorText);
    return NextResponse.json(
      { error: `API request failed: ${response.status}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  return extractImageFromGemini(data, modelId);
}

function extractImageFromImagen(data: Record<string, unknown>) {
  const items = (data as { data?: Array<{ b64_json?: string; url?: string }> }).data;
  if (items?.[0]?.b64_json) {
    return NextResponse.json({
      imageUrl: `data:image/png;base64,${items[0].b64_json}`,
      seed: Date.now(),
    });
  } else if (items?.[0]?.url) {
    return NextResponse.json({
      imageUrl: items[0].url,
      seed: Date.now(),
    });
  }

  return NextResponse.json(
    { error: "Unexpected API response format" },
    { status: 500 }
  );
}

function extractImageFromGemini(data: Record<string, unknown>, modelId: string) {
  const choices = (data as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const choice = choices?.[0]?.message;

  if (!choice) {
    return NextResponse.json(
      { error: `No response from ${modelId}` },
      { status: 500 }
    );
  }

  if (choice.content && Array.isArray(choice.content)) {
    const imagePart = (choice.content as Array<Record<string, unknown>>).find(
      (part) => part.type === "image_url" || part.type === "image"
    );
    if (imagePart) {
      const imageUrl = imagePart.image_url as { url?: string } | undefined;
      const url =
        imageUrl?.url ||
        (imagePart.data
          ? `data:image/png;base64,${imagePart.data}`
          : null);
      if (url) {
        return NextResponse.json({ imageUrl: url, seed: Date.now() });
      }
    }
  }

  if (typeof choice.content === "string") {
    const b64Match = choice.content.match(
      /data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/
    );
    if (b64Match) {
      return NextResponse.json({
        imageUrl: b64Match[0],
        seed: Date.now(),
      });
    }
  }

  return NextResponse.json(
    { error: `${modelId} did not return an image` },
    { status: 500 }
  );
}
