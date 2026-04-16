import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [metadata, setMetadata] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(targetPage);
  const [scale, setScale] = useState<number>(1.2);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (targetPage && numPages > 0 && targetPage !== pageNumber) {
      setPageNumber(targetPage);
    }
  }, [targetPage, numPages]);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setLoadingMetadata(true);
      setError(null);

      // 1. Fetch Metadata first to check status
      const metaResp = await api.get(`/documents/${id}`);
      setMetadata(metaResp.data);
      setLoadingMetadata(false);

      // 2. Fetch Signed URL only if storagePath exists
      if (metaResp.data.storagePath) {
        setLoadingUrl(true);
        const urlResp = await api.get(`/documents/${id}/view-url`);
        setDocumentUrl(urlResp.data.url);
        setLoadingUrl(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize document viewer');
      setLoadingMetadata(false);
      setLoadingUrl(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleIndex = async () => {
    if (!id) return;
    setIsIndexing(true);
    try {
      await api.post(`/precedents/${id}/index`);
      // Delay slightly then refresh metadata
      setTimeout(fetchData, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start indexing process');
    } finally {
      setIsIndexing(false);
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
        {loadingMetadata ? (
          <div className="flex items-center gap-3 text-brand-400 h-full">
            <Loader2 className="w-6 h-6 animate-spin" /> Gathering metadata...
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-8 max-w-sm text-center h-fit mt-20">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-80" />
            <h2 className="text-lg font-bold mb-2">Notice</h2>
            <p className="text-sm opacity-80 leading-relaxed mb-6">{error}</p>
            <button onClick={() => navigate(-1)} className="text-sm px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Go Back</button>
          </div>
        ) : metadata?.status === 'stub' ? (
          <div className="bg-brand-500/5 border border-brand-500/10 text-foreground rounded-2xl p-10 max-w-md text-center h-fit mt-12 shadow-2xl">
            <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
               <Search className="w-10 h-10 text-brand-400" />
            </div>
            <h2 className="text-xl font-display font-bold mb-3 tracking-tight">Judgment Not Indexed</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              This court precedent from ULII hasn't been added to our high-speed library yet. 
              Indexing it will allow you to view the PDF and perform full-text structural searches.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleIndex}
                disabled={isIndexing}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-lg shadow-brand-500/20"
              >
                {isIndexing ? <><Loader2 className="w-5 h-5 animate-spin" /> Queuing PDF...</> : '+ Index Judgment Now'}
              </button>
              <button onClick={() => navigate(-1)} className="w-full py-3 text-muted-foreground hover:text-white transition-colors text-sm font-medium">Maybe Later</button>
            </div>
          </div>
        ) : (metadata?.status === 'processing' || metadata?.status === 'fetching') && !documentUrl ? (
          <div className="flex flex-col items-center justify-center gap-6 h-full text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground mb-1 italic">High-Speed Indexing in Progress...</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                We're currently fetching the official judgment and preparing it for structural search. This usually takes 5-10 seconds.
              </p>
            </div>
            <button 
              onClick={fetchData} 
              className="mt-4 px-6 py-2 bg-surface-100 hover:bg-surface-200 border border-white/10 rounded-full text-xs font-semibold text-muted-foreground hover:text-white transition-all"
            >
              Check Readiness
            </button>
          </div>
        ) : loadingUrl ? (
          <div className="flex flex-col items-center gap-4 text-brand-400 h-full justify-center">
            <Loader2 className="w-8 h-8 animate-spin" /> 
            <span className="text-sm font-medium animate-pulse tracking-widest uppercase">Securely Loading PDF...</span>
          </div>
        ) : documentUrl ? (
          <div className="shadow-2xl shadow-black/50 border border-white/5 transition-transform duration-200 mb-20">
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
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            Unable to initialize document stream.
          </div>
        )}
      </main>
    </div>
  );
}
