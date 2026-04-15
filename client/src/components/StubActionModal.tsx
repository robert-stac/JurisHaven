import { useState } from 'react';
import { ExternalLink, FileQuestion, X, Loader2, CheckCircle } from 'lucide-react';
import api from '../services/api';

interface StubActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  precedent: any;
}

export default function StubActionModal({ isOpen, onClose, precedent }: StubActionModalProps) {
  const [requesting, setRequesting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !precedent) return null;

  const handleRequest = async () => {
    setRequesting(true);
    setError(null);
    try {
      await api.post('/requests', { precedentId: precedent.id });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit request");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col p-8">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-6 animate-slide-up">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-display font-semibold mb-2">Request Submitted!</h2>
            <p className="text-muted-foreground text-sm">The library admins have been notified. You will receive a real-time notification once the judgment is uploaded.</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 bg-brand-500/10 text-brand-400 rounded-2xl flex items-center justify-center mb-6">
              <FileQuestion className="w-7 h-7" />
            </div>

            <h2 className="text-2xl font-display font-semibold mb-2">{precedent.title}</h2>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              This judgment is currently a record-only stub in our library. You can choose to view the original source or request our team to index the full text for JurisHaven.
            </p>

            <div className="grid grid-cols-1 gap-4">
              <a 
                href={precedent.uliiUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setTimeout(onClose, 500)}
                className="flex items-center justify-center gap-3 w-full py-4 bg-surface-100 hover:bg-surface-200 border border-white/10 rounded-xl text-foreground font-medium transition-all group"
              >
                <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-brand-400" />
                View Original on ULII
              </a>

              <button
                onClick={handleRequest}
                disabled={requesting}
                className="flex items-center justify-center gap-3 w-full py-4 bg-brand-500 hover:bg-brand-600 rounded-xl text-white font-semibold transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50"
              >
                {requesting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : "Request Library Upload"}
              </button>
            </div>

            {error && (
              <p className="mt-4 text-center text-xs text-red-500 font-medium">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
