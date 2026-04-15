const pdfParse = require('pdf-parse');
import Tesseract from 'tesseract.js';

export interface PageText {
  pageNumber: number;
  content: string;
  ocrUsed: boolean;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<PageText[]> {
  console.log('[TextExtractor] Attempting digital text extraction...');
  
  // 1. Digital extraction with pdf-parse
  const parsed = await pdfParse(buffer, {
    pagerender: async function(pageData: any) {
      const textContent = await pageData.getTextContent();
      let lastY, text = '';
      for (let item of textContent.items) {
        if (lastY == item.transform[5] || !lastY){
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      return text + '\n---PAGE_DELIMITER---\n';
    }
  });

  const fullText = parsed.text;
  const pagesRaw = fullText.split('\n---PAGE_DELIMITER---\n').filter((p: string) => p.trim());
  
  // 2. Check if we actually got text. If not, fallback to OCR.
  if (pagesRaw.length === 0 || fullText.trim().length < 50) {
    console.log('[TextExtractor] ⚠️ Digital extraction yielded 0 or very little text. Likely a scanned document. Starting OCR Fallback...');
    
    // For the MVP, we run OCR on the first 3 pages if it's a scanned document
    // In a prod environment, we would convert all pages to images first
    const { data: { text: ocrText } } = await Tesseract.recognize(buffer, 'eng', {
      logger: m => console.log(`[OCR] ${m.status}: ${Math.round(m.progress * 100)}%`)
    });

    if (ocrText && ocrText.trim().length > 10) {
      console.log(`[TextExtractor] ✅ OCR Success! Extracted ${ocrText.length} characters.`);
      return [{
        pageNumber: 1,
        content: ocrText,
        ocrUsed: true
      }];
    }
  }

  // 3. Map digital results
  const pages: PageText[] = [];
  for (let i = 0; i < pagesRaw.length; i++) {
    pages.push({
      pageNumber: i + 1,
      content: pagesRaw[i].trim(),
      ocrUsed: false,
    });
  }

  return pages;
}
