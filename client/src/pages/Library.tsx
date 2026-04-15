import { useState, useEffect } from 'react';
import { Search, Upload as UploadIcon, Library as LibraryIcon, Filter, LogOut, Loader2, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { Link } from 'react-router-dom';
import UploadModal from '../components/UploadModal';
import StubActionModal from '../components/StubActionModal';
import api from '../services/api';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker from a stable CDN to ensure compatibility and correct MIME serving
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

export default function Library() {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedStub, setSelectedStub] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'book' | 'precedent'>('book');
  const [indexingId, setIndexingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { notifications, unreadCount } = useNotifications();
  
  // Filter States
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [activeSection]);

  // Polling for indexing status updates
  useEffect(() => {
    const hasAtLeastOneIndexing = documents.some(d => 
      d.status === 'fetching' || d.status === 'processing'
    );

    if (hasAtLeastOneIndexing && !loading) {
      const controller = new AbortController();
      const interval = setInterval(() => {
        fetchDocumentsByPolling(controller.signal);
      }, 10000); // 10s instead of 5s
      return () => {
        clearInterval(interval);
        controller.abort();
      };
    }
  }, [documents, loading]);

  const fetchDocumentsByPolling = async (signal?: AbortSignal) => {
    try {
      const endpoint = activeSection === 'precedent' ? '/precedents' : `/documents?type=${activeSection}`;
      const response = await api.get(endpoint, { signal });
      setDocuments(response.data);
    } catch (error: any) {
      if (error.name === 'CanceledError') return;
      console.error("Polling failed", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const endpoint = activeSection === 'precedent' ? '/precedents' : `/documents?type=${activeSection}`;
      const response = await api.get(endpoint);
      setDocuments(response.data);
    } catch (error) {
      console.error("Failed to load documents", error);
    } finally {
      setLoading(false);
    }
  };

  const handleIndex = async (e: React.MouseEvent, precedentId: string) => {
    e.stopPropagation();
    setIndexingId(precedentId);
    try {
      await api.post(`/precedents/${precedentId}/index`);
      setDocuments(prev => prev.map(d => d.id === precedentId ? { ...d, status: 'fetching' } : d));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to trigger indexing');
    } finally {
      setIndexingId(null);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await api.post('/precedents/sync');
      // Poll for new results after a short delay
      setTimeout(() => { fetchDocuments(); setIsSyncing(false); }, 4000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Sync failed');
      setIsSyncing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this document?")) return;
    
    setDeletingId(docId);
    try {
      await api.delete(`/documents/${docId}`);
      await fetchDocuments();
    } catch (error) {
      console.error("Failed to delete document", error);
    } finally {
      setDeletingId(null);
    }
  };

  const availablePracticeAreas = Array.from(new Set(documents.flatMap(d => d.practiceAreas || []))).filter(Boolean);
  const displayedDocuments = activeFilter ? documents.filter(d => d.practiceAreas?.includes(activeFilter)) : documents;

  return (
    <div className="flex h-screen w-full bg-surface">
      <UploadModal isOpen={isUploadOpen} onClose={() => { setIsUploadOpen(false); fetchDocuments(); }} />
      <StubActionModal isOpen={!!selectedStub} onClose={() => setSelectedStub(null)} precedent={selectedStub} />
      
      {/* Sidebar Placeholder */}
      <aside className="w-64 border-r border-white/5 bg-surface-50 hidden md:flex flex-col p-4">
        <div className="flex items-center gap-3 text-brand-400 font-display text-xl px-2 mb-8">
          <LibraryIcon className="w-6 h-6" />
          JurisHaven
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <button 
            onClick={() => setActiveSection('book')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'book' ? 'bg-brand-500/10 text-brand-400' : 'text-muted-foreground hover:text-foreground hover:bg-surface-100'}`}
          >
            <span className="flex items-center gap-3">Legal Texts</span>
            {activeSection === 'book' && documents.length > 0 && (
              <span className="bg-surface-200 text-muted-foreground px-2 py-0.5 rounded-full text-[10px]">{documents.length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveSection('precedent')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'precedent' ? 'bg-brand-500/10 text-brand-400' : 'text-muted-foreground hover:text-foreground hover:bg-surface-100'}`}
          >
            <span className="flex items-center gap-3">Court Precedents</span>
            {activeSection === 'precedent' && documents.length > 0 && (
              <span className="bg-brand-500 text-white px-2 py-0.5 rounded-full text-[10px] shadow-lg shadow-brand-500/20">{documents.length}</span>
            )}
          </button>
          
          <div className="my-2 border-t border-white/5"></div>
          
          <Link to="/search" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-100 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
            Global Search
          </Link>
          
          {['admin', 'managing_partner'].includes(user?.role || '') && (
            <>
              {user?.role === 'admin' && (
                <>
                  <div className="px-3 py-1 mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/50">Admin Center</div>
                  <Link to="/admin/requests" className="flex items-center justify-between px-3 py-2 mt-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-medium transition-colors border border-red-500/20 shadow-lg shadow-red-500/5 group">
                    <span className="flex items-center gap-3">
                      <span className="w-4 h-4 flex items-center justify-center font-bold">⌘</span> Access Requests
                    </span>
                    <span className="w-2 h-2 rounded-full bg-red-400 group-hover:animate-ping invisible group-hover:visible"></span>
                  </Link>
                  <Link to="/admin/users" className="flex items-center justify-between px-3 py-2 mt-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-medium transition-colors border border-red-500/20 shadow-lg shadow-red-500/5 group">
                    <span className="flex items-center gap-3">
                      <span className="w-4 h-4 flex items-center justify-center font-bold">👥</span> User Management
                    </span>
                  </Link>
                </>
              )}
              {activeSection === 'precedent' && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 text-sm font-medium transition-colors border border-brand-500/20 disabled:opacity-50"
                  title="Pull latest judgments from ULII"
                >
                  {isSyncing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Indexing ULII...</>
                    : <>↻ Sync & Index ULII</>}
                </button>
              )}
            </>
          )}
        </nav>

        <div className="pt-4 border-t border-white/5">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-surface/50 backdrop-blur">
          <Link to="/search" className="relative w-96 block group cursor-pointer">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-brand-400 transition-colors" />
            <div className="w-full bg-surface-100 border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-muted-foreground group-hover:border-brand-500/50 transition-all flex items-center h-9">
              Search library or index...
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            {['admin', 'managing_partner'].includes(user?.role || '') && (
              <button 
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-brand-500/20"
              >
                <UploadIcon className="w-4 h-4" /> Upload Document
              </button>
            )}
            <Link to="/notifications" className="relative p-2 text-muted-foreground hover:text-brand-400 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-surface font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
            <div className="w-8 h-8 rounded-full bg-surface-200 border border-white/10 flex items-center justify-center text-sm font-semibold">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Scrollable Document Grid */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 relative">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-semibold">{activeSection === 'book' ? 'Legal Texts Directory' : 'Court Precedents Vault'}</h1>
              {activeFilter && (
                <span className="flex items-center gap-1 bg-brand-500/20 text-brand-400 text-xs px-2 py-1 rounded-full border border-brand-500/30">
                  {activeFilter}
                  <button onClick={() => setActiveFilter(null)} className="ml-1 hover:text-white">&times;</button>
                </span>
              )}
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${showFilterMenu || activeFilter ? 'bg-surface-100 text-foreground border border-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-surface-50'}`}
              >
                <Filter className="w-4 h-4" /> Filter
              </button>
              
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-xl z-20 py-2">
                  <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Practice Areas</div>
                  {availablePracticeAreas.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground opacity-50">No categories</div>
                  ) : (
                    availablePracticeAreas.map((area: any) => (
                      <button
                        key={area}
                        onClick={() => { setActiveFilter(area === activeFilter ? null : area); setShowFilterMenu(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-100 transition-colors ${activeFilter === area ? 'text-brand-400 font-medium bg-brand-500/10' : 'text-foreground'}`}
                      >
                        {area}
                      </button>
                    ))
                  )}
                  <div className="border-t border-white/5 my-1"></div>
                  <button 
                    onClick={() => { setActiveFilter(null); setShowFilterMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-100 transition-colors"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-80 rounded-xl bg-surface-100 animate-pulse border border-white/5"></div>
              ))}
            </div>
          ) : displayedDocuments.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-surface-50/50">
              <LibraryIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No documents found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or searching.</p>
            </div>
          ) : (
            <div className={activeSection === 'precedent' ? "flex flex-col gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6"}>
              {displayedDocuments.map(doc => (
                <div 
                  key={doc.id} 
                  onClick={() => {
                    if (doc.status === 'stub') {
                      setSelectedStub(doc);
                      return;
                    }
                    window.location.href = `/document/${doc.id}`;
                  }}
                  className={`group relative rounded-xl border border-white/10 bg-surface-50 overflow-hidden hover:border-brand-500/50 transition-colors ${doc.status === 'stub' ? 'cursor-default' : 'cursor-pointer'} ${activeSection === 'precedent' ? 'flex flex-row p-4 gap-6 items-center' : ''}`}
                >
                  {/* Delete Button (visible on hover) */}
                  {['admin', 'managing_partner'].includes(user?.role || '') && (
                    <button 
                      onClick={(e) => handleDelete(e, doc.id)}
                      disabled={deletingId === doc.id}
                      className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Delete Document"
                    >
                      {deletingId === doc.id ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>}
                    </button>
                  )}

                  {/* Document Render Switch */}
                  {activeSection === 'precedent' ? (
                     <div className="flex-1 flex items-center gap-6">
                        {/* Thumbnail */}
                        <div className="w-24 h-32 shrink-0 bg-surface rounded overflow-hidden shadow-lg border border-white/10 flex items-center justify-center relative">
                           {doc.url ? (
                             <Document file={doc.url} loading={<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}>
                               <Page pageNumber={1} width={96} renderTextLayer={false} renderAnnotationLayer={false} />
                             </Document>
                           ) : (
                             <div className="text-xs text-muted-foreground text-center px-2">No Preview</div>
                           )}
                           <div className="absolute inset-0 border border-white/5 pointer-events-none rounded"></div>
                        </div>
                        {/* Meta */}
                        <div className="flex flex-col flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-2 flex-wrap">
                             {doc.court && <span className="text-[10px] px-2 py-1 rounded bg-surface-200 text-muted-foreground uppercase tracking-wider shrink-0">{doc.court}</span>}
                             {doc.source === 'ulii' && <span className="text-[10px] px-2 py-1 rounded border border-brand-500/20 text-brand-400/80 shrink-0">ULII</span>}
                             {doc.caseNumber && <span className="text-[10px] text-muted-foreground/60 truncate">{doc.caseNumber}</span>}
                           </div>
                           <h3 className="font-medium text-base leading-snug mb-1 group-hover:text-brand-400 transition-colors line-clamp-2">{doc.title}</h3>
                           <p className="text-xs text-muted-foreground">{doc.author?.join(', ') || doc.parties?.appellant || 'Unknown'}</p>
                           <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-2 py-1 rounded bg-surface-200 text-muted-foreground uppercase tracking-wider">{doc.year || '—'}</span>
                              {doc.practiceAreas?.map((p: string) => <span key={p} className="text-[10px] px-2 py-1 rounded border border-white/5 text-muted-foreground">{p}</span>)}
                              {/* Status badges */}
                              {doc.status === 'stub' && (
                                <span className="ml-auto text-[10px] px-2 py-1 rounded bg-surface-200 text-muted-foreground/60 border border-white/5">Not Indexed</span>
                              )}
                              {(doc.status === 'fetching' || doc.status === 'processing') && (
                                <span className="ml-auto text-[10px] flex items-center gap-1 text-amber-400">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div> Indexing...
                                </span>
                              )}
                              {doc.status === 'indexed' && (
                                <span className="ml-auto text-[10px] flex items-center gap-1 text-green-400">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> Indexed
                                </span>
                              )}
                              {doc.status === 'fetch_failed' && (
                                <span className="ml-auto text-[10px] text-red-400">Fetch Failed</span>
                              )}
                           </div>
                           {/* Index Judgment CTA — only for stubs with a PDF URL */}
                           {doc.status === 'stub' && doc.pdfUrl && (
                             <button
                               onClick={(e) => handleIndex(e, doc.id)}
                               disabled={indexingId === doc.id}
                               className="mt-3 self-start flex items-center gap-2 text-xs px-3 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 text-brand-400 rounded-lg transition-all disabled:opacity-50"
                             >
                               {indexingId === doc.id
                                 ? <><Loader2 className="w-3 h-3 animate-spin" /> Queuing...</>
                                 : <>+ Index Judgment</>}
                             </button>
                           )}
                           {/* Open button for indexed precedents */}
                           {doc.status === 'indexed' && doc.storagePath && (
                             <button
                               onClick={(e) => { e.stopPropagation(); window.location.href = `/document/${doc.id}`; }}
                               className="mt-3 self-start text-xs px-3 py-1.5 bg-surface-100 hover:bg-surface-200 border border-white/10 text-foreground rounded-lg transition-all"
                             >
                               Open Judgment
                             </button>
                           )}
                        </div>
                     </div>
                  ) : (
                     <div className="flex flex-col h-full">
                        {/* Book Cover — first page thumbnail */}
                        <div className="h-52 bg-surface-200 border-b border-white/5 shrink-0 overflow-hidden flex items-center justify-center relative">
                          {doc.url ? (
                            <Document
                              file={doc.url}
                              loading={<div className="w-full h-full animate-pulse bg-surface-100" />}
                              error={<div className="text-xs text-muted-foreground/50 uppercase tracking-widest">{doc.practiceAreas?.[0] || 'PDF'}</div>}
                            >
                              <Page pageNumber={1} width={180} renderTextLayer={false} renderAnnotationLayer={false} />
                            </Document>
                          ) : (
                            <span className="text-xs font-display text-muted-foreground/70 uppercase tracking-widest">{doc.practiceAreas?.[0] || 'TRACT'}</span>
                          )}
                          {/* Subtle gradient overlay at the bottom */}
                          <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-surface-50 to-transparent pointer-events-none" />
                        </div>
                        
                        {/* Metadata */}
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-medium text-sm leading-tight mb-1 line-clamp-2 group-hover:text-brand-400 transition-colors">{doc.title}</h3>
                          <p className="text-xs text-muted-foreground">{doc.author?.join(', ') || 'Unknown Author'}</p>
                          
                          <div className="mt-auto pt-4 flex items-center justify-between">
                            <span className="text-[10px] px-2 py-1 rounded bg-surface-200 text-muted-foreground uppercase tracking-wider">{doc.year}</span>
                            {doc.status === 'processing' && (
                              <span className="text-[10px] flex items-center gap-1 text-amber-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div> Indexing
                              </span>
                            )}
                          </div>
                        </div>
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
