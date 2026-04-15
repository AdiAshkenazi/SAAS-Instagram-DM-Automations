"use server";

import { openai } from "@/lib/openai";

export const generateCaption = async (data: {
  topic: string;
  tone: string;
  niche: string;
  platform: "INSTAGRAM" | "TELEGRAM" | "BOTH";
  includeHashtags: boolean;
  includeEmojis: boolean;
  language: string;
}) => {
  try {
    if (!process.env.OPEN_AI_KEY) {
      return { status: 401, data: "OpenAI key not configured. Add OPEN_AI_KEY to your .env file." };
    }

    const platformNote =
      data.platform === "INSTAGRAM"
        ? "Optimize for Instagram (max 2200 chars, hashtags at end)."
        : data.platform === "TELEGRAM"
        ? "Optimize for Telegram (supports HTML bold <b> and italic <i>)."
        : "Write a caption suitable for both Instagram and Telegram.";

    const hashtagNote = data.includeHashtags
      ? "Include 10-15 relevant hashtags at the end."
      : "Do NOT include hashtags.";

    const emojiNote = data.includeEmojis
      ? "Use emojis naturally throughout the caption."
      : "Do not use emojis.";

    const prompt = `You are a social media content writer specializing in ${data.niche}.

Write a ${data.tone} caption about: "${data.topic}"

Requirements:
- ${platformNote}
- ${hashtagNote}
- ${emojiNote}
- Language: ${data.language}
- Make it engaging, authentic, and on-brand for a ${data.niche} account
- Use line breaks for readability

Return ONLY the caption text, nothing else.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.8,
    });

    const caption = completion.choices[0]?.message?.content?.trim();
    if (!caption) return { status: 500, data: "Failed to generate caption" };

    return { status: 200, data: caption };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};
