import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * Transcribe audio using OpenAI Whisper API
 * Supports: ptt (WhatsApp voice note), audio, voice
 */
export async function transcribeAudio(audioBuffer, mimeType = "audio/ogg") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY tidak dikonfigurasi");

  // Save buffer to temp file
  const tmpDir = "/tmp/whisper";
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `audio-${Date.now()}.ogg`);
  fs.writeFileSync(tmpFile, audioBuffer);

  try {
    // Use FormData to send to Whisper API
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("file", fs.createReadStream(tmpFile), {
      filename: "audio.ogg",
      contentType: "audio/ogg",
    });
    form.append("model", "whisper-1");
    form.append("language", "ms"); // Bahasa Malaysia
    form.append("response_format", "text");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Whisper API error: ${err}`);
    }

    const text = await response.text();
    console.log(`🎙️ Whisper transcribed: "${text.trim()}"`);
    return text.trim();

  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

export function isVoiceMessage(message) {
  return message.type === "ptt" || message.type === "audio" || message.type === "voice";
}
