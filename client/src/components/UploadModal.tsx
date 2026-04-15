import { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function UploadModal({ 
  isOpen, 
  onClose, 
  initialMetadata 
}: { 
  isOpen: boolean, 
  onClose: () => void,
  initialMetadata?: any
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metadata, setMetadata] = useState({
    documentType: initialMetadata?.documentType || 'book',
    title: initialMetadata?.title || '',
    author: Array.isArray(initialMetadata?.author) ? initialMetadata.author.join(', ') : (initialMetadata?.author || ''),
    year: initialMetadata?.year || new Date().getFullYear(),
    jurisdiction: initialMetadata?.jurisdiction?.[0] || initialMetadata?.jurisdiction || 'Uganda',
    practiceArea: initialMetadata?.practiceAreas?.[0] || 'General',
    accessLevel: 'all'
  });

  // Re-sync metadata if initialMetadata changes (e.g. when opening for a specific request)
  useEffect(() => {
    if (initialMetadata) {
      setMetadata({
        documentType: initialMetadata?.documentType || 'precedent',
        title: initialMetadata?.title || '',
        author: Array.isArray(initialMetadata?.author) ? initialMetadata.author.join(', ') : (initialMetadata?.author || ''),
        year: initialMetadata?.year || new Date().getFullYear(),
        jurisdiction: initialMetadata?.jurisdiction?.[0] || initialMetadata?.jurisdiction || 'Uganda',
        practiceArea: initialMetadata?.practiceAreas?.[0] || 'General',
        accessLevel: 'all'
      });
    }
  }, [initialMetadata, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file first");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    // Format metadata to match what backend expects
    const payload = {
      documentType: metadata.documentType,
      title: metadata.title,
      author: metadata.author.split(',').map(s => s.trim()),
      year: metadata.year,
      jurisdiction: [metadata.jurisdiction],
      practiceAreas: [metadata.practiceArea],
      accessLevel: metadata.accessLevel
    };

    formData.append('metadata', JSON.stringify(payload));

    try {
      await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFile(null);
        setMetadata({ ...metadata, title: '', author: '' });
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-surface-50 shrink-0">
          <h2 className="text-xl font-display font-medium text-foreground flex items-center gap-2">
            <UploadIcon className="w-5 h-5 text-brand-400" /> Upload Legal Text
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-white rounded-lg hover:bg-surface-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {success ? (
            <div className="h-48 flex flex-col items-center justify-center text-green-500 animate-slide-up">
              <CheckCircle className="w-16 h-16 mb-4" />
              <p className="text-xl font-medium text-foreground">Upload Complete!</p>
              <p className="text-sm text-muted-foreground mt-2">Document is being processed by the indexing pipeline.</p>
            </div>
          ) : (
            <form id="upload-form" onSubmit={handleUpload} className="space-y-6">

              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-brand-500/50 bg-brand-500/5' : 'border-white/10 hover:border-white/20 bg-surface-50/50 hover:bg-surface-100/50'
                  }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="application/pdf"
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-brand-500/20 text-brand-400 rounded-full flex items-center justify-center mb-3">
                      <File className="w-6 h-6" />
                    </div>
                    <p className="text-brand-100 font-medium">{file.name}</p>
                    <p className="text-xs text-brand-400/60 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center opacity-70">
                    <UploadIcon className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="text-foreground font-medium text-sm">Click to browse or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">Secure PDF documents only (Max 500MB)</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              {/* Metadata Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Document Classification</label>
                  <div className="flex gap-4 p-1 bg-surface-100 border border-white/5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setMetadata({ ...metadata, documentType: 'book' })}
                      className={`flex-1 py-2 text-sm rounded-md transition-all ${metadata.documentType === 'book' ? 'bg-surface border border-white/10 shadow-md text-brand-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Legal Text / Book
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetadata({ ...metadata, documentType: 'precedent' })}
                      className={`flex-1 py-2 text-sm rounded-md transition-all ${metadata.documentType === 'precedent' ? 'bg-surface border border-white/10 shadow-md text-brand-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Court Precedent / Ruling
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Document Title</label>
                  <input required value={metadata.title} onChange={e => setMetadata({ ...metadata, title: e.target.value })} type="text" className="w-full bg-surface-100 border border-white/5 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-colors" placeholder={metadata.documentType === 'precedent' ? "e.g. Republic v John Doe [2024]" : "e.g. Hale's History of Common Law"} />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{metadata.documentType === 'precedent' ? 'Judges / Coram' : 'Authors'} <span className="text-[10px] opacity-70">(comma separated)</span></label>
                  <input required value={metadata.author} onChange={e => setMetadata({ ...metadata, author: e.target.value })} type="text" className="w-full bg-surface-100 border border-white/5 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-colors" placeholder={metadata.documentType === 'precedent' ? "e.g. Justice Smith" : "e.g. John Doe, Emma Smith"} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Jurisdiction</label>
                  <input
                    required
                    onChange={e => setMetadata({ ...metadata, jurisdiction: e.target.value })}
                    className="w-full bg-surface-100 border border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 placeholder:text-muted-foreground/50 transition-colors"
                    placeholder="Select or type jurisdiction..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Practice Area</label>
                  <select value={metadata.practiceArea} onChange={e => setMetadata({ ...metadata, practiceArea: e.target.value })} className="w-full bg-surface-100 border border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 appearance-none">
                    <option>Litigation</option>
                    <option>Corporate</option>
                    <option>Land Law</option>
                    <option>Criminal</option>
                    <option>General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Year</label>
                  <input required value={metadata.year} onChange={e => setMetadata({ ...metadata, year: parseInt(e.target.value) || 2024 })} type="number" className="w-full bg-surface-100 border border-white/5 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-colors" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Access Level</label>
                  <select value={metadata.accessLevel} onChange={e => setMetadata({ ...metadata, accessLevel: e.target.value })} className="w-full bg-surface-100 border border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 appearance-none text-amber-400/90 font-medium">
                    <option value="all">Firm Wide (All users)</option>
                    <option value="lawyer">Lawyers & Partners</option>
                    <option value="managing_partner">Managing Partners Only</option>
                  </select>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-surface-50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-surface-100 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            form="upload-form"
            disabled={!file || uploading}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 px-6 py-2 rounded-lg text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : 'Upload to Secure Vault'}
          </button>
        </div>

      </div>
    </div>
  );
}
