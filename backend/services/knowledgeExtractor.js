import fs from "fs";
import path from "path";

export async function extractTextFromFile(filePath, mimeType, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  console.log(`📄 Extracting: ${originalName} (${ext})`);

  // ── TXT / CSV / MD ──────────────────────────────────────────────────────────
  if ([".txt", ".csv", ".md"].includes(ext)) {
    const text = fs.readFileSync(filePath, "utf-8").slice(0, 50000);
    console.log(`✅ TXT: ${text.length} chars`);
    return text;
  }

  // ── PDF ─────────────────────────────────────────────────────────────────────
  if (ext === ".pdf") {
    // Method 1: pdf-parse (works for text-based PDFs)
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      if (data.text && data.text.trim().length > 20) {
        console.log(`✅ PDF via pdf-parse: ${data.text.length} chars`);
        return data.text.slice(0, 50000);
      }
      console.log(`⚠️ PDF text empty, trying Vision...`);
    } catch (e) {
      console.log(`⚠️ pdf-parse failed: ${e.message}, trying Vision...`);
    }

    // Method 2: Claude Vision (for scanned/image PDFs).
    try {
      const imageData = fs.readFileSync(filePath).toString("base64");
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: imageData } },
            { type: "text", text: "Extract semua teks, maklumat produk, harga, spesifikasi dan data penting dari dokumen ini. Format sebagai teks biasa yang tersusun." }
          ]
        }]
      });
      const text = response.content[0].text;
      console.log(`✅ PDF via Claude Vision: ${text.length} chars`);
      return text.slice(0, 50000);
    } catch (e) {
      console.log(`⚠️ Claude Vision PDF failed: ${e.message}`);
      throw new Error(`Gagal baca PDF: ${e.message}`);
    }
  }

  // ── Excel ────────────────────────────────────────────────────────────────────
  if ([".xlsx", ".xls", ".xlsm"].includes(ext)) {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.readFile(filePath);
      let text = `Fail Excel: ${originalName}\n\n`;
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        text += `=== ${sheetName} ===\n`;
        rows.forEach(row => {
          const line = row.map(c => String(c || "").trim()).filter(Boolean).join(" | ");
          if (line) text += line + "\n";
        });
        text += "\n";
      });
      console.log(`✅ Excel: ${text.length} chars`);
      return text.slice(0, 50000);
    } catch (e) { throw new Error(`Gagal baca Excel: ${e.message}`); }
  }

  // ── Word ─────────────────────────────────────────────────────────────────────
  if (ext === ".docx") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      console.log(`✅ DOCX: ${result.value.length} chars`);
      return result.value.slice(0, 50000);
    } catch (e) { throw new Error(`Gagal baca Word: ${e.message}`); }
  }

  // ── Images — Claude Vision ───────────────────────────────────────────────────
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    try {
      const imageData = fs.readFileSync(filePath).toString("base64");
      const mimeMap = { ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".webp":"image/webp" };
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeMap[ext] || "image/jpeg", data: imageData } },
            { type: "text", text: "Extract semua teks, maklumat, harga, nama produk dan data dari imej ini. Format sebagai teks biasa yang tersusun." }
          ]
        }]
      });
      const text = response.content[0].text;
      console.log(`✅ Image via Vision: ${text.length} chars`);
      return text;
    } catch (e) { throw new Error(`Gagal baca imej: ${e.message}`); }
  }

  throw new Error(`Format tidak disokong: ${ext}`);
}
 
