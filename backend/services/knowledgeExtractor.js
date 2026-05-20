import fs from "fs";
import path from "path";

/**
 * Extract text from various file types for bot knowledge base
 * Supports: PDF, Excel (xlsx/xls), Word (docx), Images (jpg/png), TXT, CSV
 */
export async function extractTextFromFile(filePath, mimeType, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  try {
    // ── Plain text / CSV ──────────────────────────────────────────────────────
    if (ext === ".txt" || ext === ".csv" || ext === ".md") {
      return fs.readFileSync(filePath, "utf-8").slice(0, 50000);
    }

    // ── PDF ───────────────────────────────────────────────────────────────────
    if (ext === ".pdf" || mimeType === "application/pdf") {
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text.slice(0, 50000);
    }

    // ── Excel ─────────────────────────────────────────────────────────────────
    if ([".xlsx", ".xls", ".xlsm"].includes(ext)) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.readFile(filePath);
      let text = "";
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        text += `\n=== ${sheetName} ===\n${csv}\n`;
      });
      return text.slice(0, 50000);
    }

    // ── Word Document ─────────────────────────────────────────────────────────
    if (ext === ".docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.slice(0, 50000);
    }

    // ── Images — use Claude Vision to extract text ────────────────────────────
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
      const fs2 = await import("fs");
      const imageData = fs2.default.readFileSync(filePath).toString("base64");
      const mimeMap = { ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".gif":"image/gif" };
      const imgMime = mimeMap[ext] || "image/jpeg";

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: imgMime, data: imageData } },
            { type: "text", text: "Sila extract SEMUA teks yang ada dalam imej ini. Termasuk harga, nama produk, maklumat syarikat, nombor telefon, alamat, dan apa-apa sahaja yang berkaitan. Format sebagai teks biasa." }
          ]
        }]
      });
      return response.content[0].text;
    }

    throw new Error(`Format fail tidak disokong: ${ext}`);

  } catch (err) {
    throw new Error(`Gagal extract teks dari ${originalName}: ${err.message}`);
  }
}

export function getAllowedMimeTypes() {
  return [
    "text/plain",
    "text/csv",
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
}

export function getAllowedExtensions() {
  return [".txt",".csv",".md",".pdf",".xlsx",".xls",".xlsm",".docx",".jpg",".jpeg",".png",".webp"];
}
