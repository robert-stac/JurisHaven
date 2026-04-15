import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://ulii.org';

// Respectful headers — identify ourselves clearly
// Standard Browser headers to avoid some basic bot detection
const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

export interface ULIIJudgmentStub {
  caseTitle: string;
  caseNumber: string;
  court: string;
  date: string;
  judges: string[];
  parties: { appellant: string; respondent: string };
  uliiUrl: string;
  pdfUrl: string | null;
  jurisdiction: string;
  practiceArea: string;
}

/**
 * Scrapes the ULII judgment listing page and returns a lightweight list of case stubs.
 */
export async function fetchRecentJudgments(page = 1, perPage = 20, enrichDetails = false): Promise<ULIIJudgmentStub[]> {
  const url = `${BASE_URL}/en/judgments/all/?page=${page}`;

  const { data: html } = await axios.get(url, {
    headers: HTTP_HEADERS,
    timeout: 30000,
  });

  const $ = cheerio.load(html);
  const results: ULIIJudgmentStub[] = [];
  
  // The table-based structure found in the latest inspection
  $('table.doc-table tr').each((_, el) => {
    const linkEl = $(el).find('td.cell-title a').first();
    const href = linkEl.attr('href');
    if (!href) return;

    const uliiUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
    const rawTitle = linkEl.text().trim();
    if (!rawTitle) return;

    // Extract date from the row if possible
    const dateText = $(el).find('td:last-child').text().trim();

    const partyMatch = rawTitle.match(/^(.+?)\s+v(?:s|ersus)?\.?\s+(.+?)(?:\s+\(|\[|$)/i);
    const appellant = partyMatch?.[1]?.trim() || rawTitle;
    const respondent = partyMatch?.[2]?.trim() || '';

    const court = extractCourtFromUrl(uliiUrl);
    const caseNumberMatch = rawTitle.match(/\(([^)]+)\)/);
    const caseNumber = caseNumberMatch?.[1] || '';

    results.push({
      caseTitle: rawTitle,
      caseNumber: caseNumber,
      court: court,
      date: dateText || new Date().toISOString().split('T')[0],
      judges: [], 
      parties: { appellant, respondent },
      uliiUrl: uliiUrl,
      pdfUrl: null, 
      jurisdiction: 'Uganda',
      practiceArea: inferPracticeArea(court, rawTitle),
    });
  });

  // If we don't need details, return immediately with predicted PDF links
  if (!enrichDetails) {
    console.log(`[ULII Scraper] Fast sync: skipping detail enrichment for ${results.length} items`);
    return results.slice(0, perPage).map(s => ({ ...s, pdfUrl: predictPdfUrl(s.uliiUrl) }));
  }

  // Attempt to enrich with detail page metadata (PDF link, judges)
  const finalResults: ULIIJudgmentStub[] = [];
  let blocked = false;

  for (const stub of results.slice(0, perPage)) {
    if (blocked) {
      finalResults.push({ ...stub, pdfUrl: predictPdfUrl(stub.uliiUrl) });
      continue;
    }

    try {
      const enrichedResponse = await fetchJudgmentMetadata(stub.uliiUrl);
      if (enrichedResponse) {
        finalResults.push({ ...stub, ...enrichedResponse.metadata });
      } else {
        finalResults.push({ ...stub, pdfUrl: predictPdfUrl(stub.uliiUrl) });
      }
      await delay(6000); // Strict delay to avoid 403
    } catch (err: any) {
      console.warn(`[ULII Scraper] Detail enrichment failed for ${stub.uliiUrl}: ${err.message}`);
      if (err.response?.status === 403) {
        console.error(`[ULII Scraper] ⚠️ Hitting 403 on details. Falling back to listing-only stubs.`);
        blocked = true;
      }
      finalResults.push({ ...stub, pdfUrl: predictPdfUrl(stub.uliiUrl) });
    }
  }

  return finalResults;
}

/**
 * Predicts a ULII PDF download URL based on the standard Indigo platform pattern.
 * Pattern: {judgment_url}/pdf/download
 */
function predictPdfUrl(uliiUrl: string): string {
  // Ensure we don't end in a slash before adding /pdf/download
  const base = uliiUrl.replace(/\/$/, '');
  return `${base}/pdf/download`;
}

/**
 * Fetches a single ULII judgment page to extract detailed metadata + the PDF link.
 */
export async function fetchJudgmentMetadata(judgeUrl: string): Promise<{ metadata: ULIIJudgmentStub, cookies?: string[] } | null> {
  console.log(`[ULII Scraper] Fetching judgment: ${judgeUrl}`);
  const response = await axios.get(judgeUrl, {
    headers: HTTP_HEADERS,
    timeout: 15000,
  });
  const html = response.data;

  const $ = cheerio.load(html);

  // --- Title & Parties ---
  const rawTitle =
    $('h1.title, h1.document-title, .akoma-title, h1').first().text().trim() ||
    $('title').text().replace(' | ULII', '').trim();

  // Parse "Appellant v Respondent" from title
  const partyMatch = rawTitle.match(/^(.+?)\s+v(?:s|ersus)?\.?\s+(.+)$/i);
  const appellant = partyMatch?.[1]?.trim() || rawTitle;
  const respondent = partyMatch?.[2]?.trim() || '';

  // --- Metadata table ---
  const metaMap: Record<string, string> = {};
  $('table.attr-table tr, dl.metadata dt, .field-label').each((_, el) => {
    const key = $(el).text().trim().toLowerCase().replace(/[:\s]+$/, '');
    const value =
      $(el).next('dd').text().trim() ||
      $(el).closest('tr').find('td').last().text().trim();
    if (key && value) metaMap[key] = value;
  });

  // Also scan definition-list style metadata
  $('dl').each((_, dl) => {
    $(dl).find('dt').each((_, dt) => {
      const key = $(dt).text().trim().toLowerCase().replace(':', '');
      const value = $(dt).next('dd').text().trim();
      if (key && value) metaMap[key] = value;
    });
  });

  const date =
    metaMap['date'] || metaMap['judgment date'] || metaMap['date of judgment'] || '';
  const court =
    metaMap['court'] || metaMap['divisions'] || extractCourtFromUrl(judgeUrl);
  const caseNumber =
    metaMap['case number'] || metaMap['case no'] || metaMap['citation'] || '';
  const judgesRaw =
    metaMap['coram'] || metaMap['judge'] || metaMap['judges'] || metaMap['before'] || '';
  const judges = judgesRaw
    .split(/[,\n;]+/)
    .map((j) => j.trim())
    .filter(Boolean);

  // --- PDF link ---
  let pdfUrl: string | null = null;
  $('a[href$=".pdf"], a:contains("Download PDF"), a:contains("PDF"), a[href*="pdf"]').each(
    (_, el) => {
      const href = $(el).attr('href');
      if (href && !pdfUrl) {
        pdfUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      }
    }
  );

  return {
    metadata: {
      caseTitle: rawTitle,
      caseNumber,
      court,
      date,
      judges,
      parties: { appellant, respondent },
      uliiUrl: judgeUrl,
      pdfUrl,
      jurisdiction: 'Uganda',
      practiceArea: inferPracticeArea(court, rawTitle),
    },
    cookies: response.headers['set-cookie'],
  };
}

// ---- Helpers ----

function extractCourtFromUrl(url: string): string {
  const match = url.match(/\/judgment\/([a-z]+)\//i);
  if (!match) return 'Unknown Court';
  const code = match[1].toLowerCase();
  const courts: Record<string, string> = {
    ughcld: 'High Court – Land Division',
    ughccd: 'High Court – Commercial Division',
    ughcfd: 'High Court – Family Division',
    ughccrd: 'High Court – Criminal Division',
    ugca: 'Court of Appeal',
    ugsc: 'Supreme Court',
    ugcoa: 'Court of Appeal',
  };
  return courts[code] || code.toUpperCase();
}

function inferPracticeArea(court: string, title: string): string {
  const t = `${court} ${title}`.toLowerCase();
  if (t.includes('land') || t.includes('property')) return 'Land Law';
  if (t.includes('commercial') || t.includes('contract') || t.includes('company'))
    return 'Corporate';
  if (t.includes('criminal') || t.includes('murder') || t.includes('theft'))
    return 'Criminal';
  if (t.includes('family') || t.includes('divorce') || t.includes('custody'))
    return 'Family Law';
  if (t.includes('constitutional') || t.includes('human rights')) return 'Constitutional';
  return 'Litigation';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
