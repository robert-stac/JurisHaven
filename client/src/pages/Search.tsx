import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search as SearchIcon, ArrowLeft, ArrowRight, FileText, ChevronRight, Layers, MapPin } from 'lucide-react';
import api from '../services/api';

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    if (query) {
      performSearch(query);
    } else {
      setLoading(false);
    }
  }, [query]);

  const performSearch = async (q: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setResults(response.data);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput)}`);
    }
  };

  return (
    <div className="flex h-screen w-full bg-surface text-foreground flex-col overflow-hidden">
      {/* Top Search Header */}
      <header className="shrink-0 h-20 border-b border-white/5 bg-surface-50 flex items-center px-6 md:px-12 gap-6 w-full shadow-md z-10">
        <Link to="/library" className="w-10 h-10 rounded-full hover:bg-surface-200 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-4xl relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
          <input
            autoFocus
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search jurisprudence, commentaries, and texts..."
            className="w-full bg-surface-100/50 backdrop-blur border border-white/10 rounded-xl pl-12 pr-6 py-4 text-lg focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all font-display shadow-inner placeholder:text-muted-foreground/60"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors shadow-lg shadow-brand-500/20">
            Search
          </button>
        </form>
      </header>

      {/* Main Results Board */}
      <main className="flex-1 overflow-y-auto px-6 md:px-12 py-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          {loading ? (
             <div className="space-y-6">
               <div className="h-6 w-64 bg-surface-100 rounded animate-pulse mb-8"></div>
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="bg-surface-50 rounded-xl p-6 border border-white/5 h-40 animate-pulse"></div>
               ))}
             </div>
          ) : !results ? (
            <div className="h-full flex flex-col items-center justify-center pt-24 text-center">
              <SearchIcon className="w-16 h-16 text-surface-300 mb-6" />
              <h2 className="text-2xl font-display font-medium text-muted-foreground">What are you looking for today?</h2>
              <p className="text-muted-foreground/60 mt-2">Enter keywords, citations, or concepts to search across the entire digital library.</p>
            </div>
          ) : (
            <div className="animate-fade-in fade-in">
              <p className="text-muted-foreground mb-8 font-medium">
                Found <span className="text-white font-bold">{results.totalHits}</span> results for <span className="text-brand-400">"{query}"</span> 
                <span className="text-xs text-muted-foreground/50 ml-2">({results.processingTimeMs}ms)</span>
              </p>

              {results.hits.length === 0 ? (
                <div className="bg-surface-50 rounded-2xl border border-white/5 p-12 text-center mt-8">
                  <FileText className="w-12 h-12 text-surface-200 mx-auto mb-4" />
                  <h3 className="text-xl font-display text-muted-foreground">No matches found</h3>
                  <p className="text-sm text-muted-foreground/60 mt-2">Check your spelling or try broader keywords.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 pb-20">
                  {results.hits.map((hit: any) => (
                    <Link 
                      key={hit.id} 
                      to={`/document/${hit.documentId}?page=${hit.pageNumber}`}
                      className="group block bg-surface-50 hover:bg-surface-100 border border-white/5 hover:border-brand-500/30 rounded-xl p-6 transition-all duration-200 shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    >
                      <div className="flex justify-between items-start mb-4 gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-display font-medium text-foreground group-hover:text-brand-400 transition-colors leading-snug">
                            {hit.title}
                          </h3>
                          <div className="flex flex-wrap items-center mt-2 gap-3 text-xs text-muted-foreground font-medium">
                            {hit.author && hit.author.length > 0 && (
                              <span className="flex items-center gap-1.5 bg-surface-200/50 px-2 py-1 rounded-md">
                                <FileText className="w-3.5 h-3.5 text-brand-400" /> {hit.author.join(', ')}
                              </span>
                            )}
                            {hit.jurisdiction && hit.jurisdiction.length > 0 && (
                               <span className="flex items-center gap-1.5">
                                 <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {hit.jurisdiction[0]}
                               </span>
                            )}
                            {hit.practiceAreas && hit.practiceAreas.length > 0 && (
                               <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                                 <Layers className="w-3.5 h-3.5 text-muted-foreground" /> {hit.practiceAreas[0]}
                               </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 bg-brand-500/10 text-brand-400 text-sm font-bold px-3 py-1.5 rounded-lg border border-brand-500/20 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                          Page {hit.pageNumber} <ArrowRight className="w-4 h-4 ml-1 opacity-0 -ml-4 group-hover:ml-1 group-hover:opacity-100 transition-all" />
                        </div>
                      </div>

                      <div className="relative overflow-hidden rounded-lg bg-surface-100/50 p-4 border border-white/5">
                        <p 
                          className="text-sm text-foreground/80 leading-relaxed font-serif"
                          dangerouslySetInnerHTML={{ 
                            __html: `...${hit._formatted?.content || hit.content}...`.replace(/\n/g, '<br />')
                          }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
