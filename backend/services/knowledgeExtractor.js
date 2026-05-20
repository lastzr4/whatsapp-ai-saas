import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export async function extractTextFromFile(filePath, mimeType, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  console.log(`📄 Extracting: ${originalName} (${ext}) from ${filePath}`);

  // ── Plain text / CSV / MD ───────────────────────────────────────────────────
  if ([".txt", ".csv", ".md"].includes(ext)) {
    const text = fs.readFileSync(filePath, "utf-8").slice(0, 50000);
    console.log(`✅ TXT: ${text.length} chars`);
    return text;
  }

  // ── PDF — try multiple methods ──────────────────────────────────────────────
  if (ext === ".pdf") {
    // Method 1: pdftotext (system tool, most reliable)
    try {
      const text = execSync(`pdftotext "${filePath}" -`, { timeout: 30000 }).toString("utf-8");
      if (text && text.trim().length > 10) {
        console.log(`✅ PDF via pdftotext: ${text.length} chars`);
        return text.slice(0, 50000);
      }
    } catch (e) {
      console.log(`⚠️ pdftotext failed: ${e.message}`);
    }

    // Method 2: pdf-parse npm package
    try {
      // Try different import paths
      let pdfParse;
      try { pdfParse = (await import("pdf-parse")).default; }
      catch { pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default; }
      
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      if (data.text && data.text.trim().length > 10) {
        console.log(`✅ PDF via pdf-parse: ${data.text.length} chars`);
        return data.text.slice(0, 50000);
      }
    } catch (e) {
      console.log(`⚠️ pdf-parse failed: ${e.message}`);
    }

    // Method 3: Use Claude Vision on each page (scanned PDFs)
    console.log(`🔄 PDF: trying Claude Vision fallback...`);
    return await extractPdfViaVision(filePath, originalName);
  }

  // ── Excel ───────────────────────────────────────────────────────────────────
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
    } catch (e) {
      throw new Error(`Gagal baca Excel: ${e.message}`);
    }
  }

  // ── Word ────────────────────────────────────────────────────────────────────
  if (ext === ".docx") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      console.log(`✅ DOCX: ${result.value.length} chars`);
      return result.value.slice(0, 50000);
    } catch (e) {
      throw new Error(`Gagal baca Word: ${e.message}`);
    }
  }

  // ── Images — Claude Vision ──────────────────────────────────────────────────
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return await extractImageViaVision(filePath, ext, originalName);
  }

  throw new Error(`Format tidak disokong: ${ext}`);
}

async function extractImageViaVision(filePath, ext, originalName) {
  try {
    const imageData = fs.readFileSync(filePath).toString("base64");
    const mimeMap = { ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".webp":"image/webp" };
    const imgMime = mimeMap[ext] || "image/jpeg";

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imgMime, data: imageData } },
          { type: "text", text: "Extract semua teks, maklumat, harga, nama produk, dan data dari imej ini. Susun dengan kemas dalam format teks biasa. Sertakan semua butiran yang kelihatan." }
        ]
      }]
    });
    const text = response.content[0].text;
    console.log(`✅ Image via Vision: ${text.length} chars`);
    return text;
  } catch (e) {
    throw new Error(`Gagal extract imej: ${e.message}`);
  }
}

async function extractPdfViaVision(filePath, originalName) {
  // Convert first page to image using ImageMagick then use Claude Vision
  try {
    const tmpImg = filePath + "_page1.jpg";
    execSync(`convert -density 150 "${filePath}[0]" -quality 85 "${tmpImg}"`, { timeout: 30000 });
    const text = await extractImageViaVision(tmpImg, ".jpg", originalName);
    try { fs.unlinkSync(tmpImg); } catch {}
    return text;
  } catch (e) {
    console.log(`⚠️ PDF Vision failed: ${e.message}`);
    throw new Error("PDF ini tidak dapat dibaca. Fail mungkin diprotect atau scan-only tanpa teks.");
  }
}
