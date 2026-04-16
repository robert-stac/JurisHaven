import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, CheckCircle, ExternalLink, FileUp, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import UploadModal from '../components/UploadModal';

export default function AdminRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/requests');
      setRequests(response.data);
    } catch (error) {
      console.error("Failed to load requests", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFulfill = async (request: any) => {
    setActiveRequest(request);
    setIsUploadOpen(true);
  };

  const completeFulfillment = async () => {
    if (!activeRequest) return;
    setFulfillingId(activeRequest.id);
    try {
      await api.post(`/requests/${activeRequest.id}/fulfill`);
      await fetchRequests();
      setIsUploadOpen(false);
      setActiveRequest(null);
    } catch (error) {
      console.error("Fulfillment notification failed", error);
      alert("Document uploaded but notification failed. Please mark as done manually.");
    } finally {
      setFulfillingId(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="h-screen w-full bg-surface flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-display font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You do not have administrative privileges to access this area.</p>
        <Link to="/library" className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg transition-all">
          Return to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => {
           if (window.confirm("Did you successfully upload the document? Click OK to notify the requester.")) {
              completeFulfillment();
           } else {
              setIsUploadOpen(false);
           }
        }} 
        initialMetadata={activeRequest?.precedentDetails}
      />

      <header className="h-16 border-b border-white/5 bg-surface/50 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-display font-semibold">Library Upload Requests</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-foreground">{user.email}</div>
            <div className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">System Admin</div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-white/10 rounded-2xl bg-surface-50/50">
            <CheckCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No Pending Requests</h3>
            <p className="text-sm text-muted-foreground mt-1">The library is up to date.</p>
          </div>
        ) : (
          <div className="bg-surface-50 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-100 border-b border-white/5">
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Judgment / Precedent</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-surface-100/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground group-hover:text-brand-400 transition-colors">{req.title}</span>
                        <span className="text-xs text-muted-foreground mt-1 italic">Requested by: {req.userEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                         {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {req.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                          <CheckCircle className="w-3 h-3" /> Fulfilled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                         {req.status === 'pending' && (
                           <button 
                             onClick={() => handleFulfill(req)}
                             disabled={fulfillingId === req.id}
                             className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-lg shadow-brand-500/20"
                           >
                             {fulfillingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
                             Upload & Notify
                           </button>
                         )}
                         <a 
                           href={`https://ulii.org/search?q=${encodeURIComponent(req.title)}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="p-2 text-muted-foreground hover:text-brand-400 hover:bg-surface-100 rounded-lg transition-all"
                           title="Search on ULII"
                         >
                           <ExternalLink className="w-4 h-4" />
                         </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
