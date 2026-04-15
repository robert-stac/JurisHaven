import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Printer, Download, Search, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
// Set up PDF.js worker from a stable CDN to ensure compatibility and correct MIME serving
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

export default function DocumentView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetPage = parseInt(searchParams.get('page') || '1', 10);

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(targetPage);
  const [scale, setScale] = useState<number>(1.2);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSignedUrl();
  }, [id]);

  useEffect(() => {
    if (targetPage && numPages > 0 && targetPage !== pageNumber) {
      setPageNumber(targetPage);
    }
  }, [targetPage, numPages]);

  const fetchSignedUrl = async () => {
    try {
      const response = await api.get(`/documents/${id}/view-url`);
      setDocumentUrl(response.data.url);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load document access');
    } finally {
      setLoadingUrl(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1f24] overflow-hidden text-foreground">
      {/* Viewer Toolbar */}
      <header className="h-14 shrink-0 bg-surface border-b border-white/5 flex items-center justify-between px-4 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-100 rounded-lg text-muted-foreground transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:text-white" />
          </button>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <span className="font-display font-medium text-sm truncate max-w-[300px] md:max-w-md">Legal Text Reader</span>
        </div>

        {/* Page Nav */}
        <div className="flex items-center gap-3 bg-surface-50 rounded-lg px-2 border border-white/5 shadow-inner">
          <button 
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
            className="p-1.5 text-muted-foreground hover:text-white disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-xs font-medium w-32 justify-center flex items-center gap-2">
            Page 
            <input 
              type="number" 
              value={pageNumber} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val && val > 0 && val <= numPages) setPageNumber(val);
              }}
              className="w-12 bg-surface-100 border border-white/10 text-center rounded py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            of <span className="opacity-70">{numPages || '--'}</span>
          </div>
          <button 
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
            className="p-1.5 text-muted-foreground hover:text-white disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1">
          <button onClick={() => setScale(s => s - 0.2)} className="p-2 text-muted-foreground hover:text-white hover:bg-surface-100 rounded-md"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs font-mono w-10 text-center">{(scale * 100).toFixed(0)}%</span>
          <button onClick={() => setScale(s => s + 0.2)} className="p-2 text-muted-foreground hover:text-white hover:bg-surface-100 rounded-md"><ZoomIn className="w-4 h-4" /></button>
          <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
          {/* Action buttons visual placebo since downloads are blocked */}
          <button className="p-2 text-muted-foreground/30 rounded-md cursor-not-allowed" title="Security restricted"><Printer className="w-4 h-4" /></button>
          <button className="p-2 text-muted-foreground/30 rounded-md cursor-not-allowed" title="Security restricted"><Download className="w-4 h-4" /></button>
        </div>
      </header>

      {/* Main Document Area */}
      <main className="flex-1 overflow-auto bg-[#1a1b1f] relative flex justify-center py-8 custom-scrollbar">
        {loadingUrl ? (
          <div className="flex items-center gap-3 text-brand-400 h-full">
            <Loader2 className="w-6 h-6 animate-spin" /> Verifying Access...
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-8 max-w-sm text-center h-fit mt-20">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-80" />
            <h2 className="text-lg font-bold mb-2">Access Denied</h2>
            <p className="text-sm opacity-80 leading-relaxed">{error}</p>
          </div>
        ) : documentUrl ? (
          <div className="shadow-2xl shadow-black/50 border border-white/5 transition-transform duration-200">
             <Document
                file={documentUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="w-[800px] h-[1000px] bg-surface flex items-center justify-center text-muted-foreground text-sm font-medium animate-pulse">
                     Streaming Document Pages...
                  </div>
                }
                error={<div className="text-red-500 p-8">Failed to load PDF engine.</div>}
              >
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale} 
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="bg-white"
                />
              </Document>
          </div>
        ) : null}
      </main>
    </div>
  );
}
