import { useState } from 'react';
import { UserPlus, X, CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';
import api from '../services/api';

export default function InviteModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'clerk'
  });

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim() || !formData.displayName.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      await api.post('/users', formData);
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({ email: '', password: '', displayName: '', role: 'clerk' });
        // Dispatch an event to tell the parent (Users.tsx) to refresh
        window.dispatchEvent(new Event('user-created'));
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-surface-50 shrink-0">
          <h2 className="text-xl font-display font-medium text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-400" /> Create New User
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-white rounded-lg hover:bg-surface-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="h-48 flex flex-col items-center justify-center text-green-500 animate-slide-up">
              <CheckCircle className="w-16 h-16 mb-4" />
              <p className="text-xl font-medium text-foreground">User Created!</p>
              <p className="text-sm text-muted-foreground mt-2 text-center px-4">They can now log in using the credentials provided.</p>
            </div>
          ) : (
            <form id="invite-form" onSubmit={handleCreate} className="space-y-6">
              
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 flex items-start gap-4">
                 <div className="mt-0.5 bg-brand-500/20 p-2 rounded-lg text-brand-400">
                    <Mail className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="text-sm font-medium text-foreground">Firm Access Control</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Create an account directly and provide the user with their password. They should change it upon first login.
                    </p>
                 </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Name</label>
                  <input required value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} type="text" className="w-full bg-surface-100 border border-white/5 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-colors" placeholder="e.g. John Doe" />
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Firm Email Address</label>
                  <input required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className="w-full bg-surface-100 border border-white/5 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-colors" placeholder="jdoe@lawfirm.com" />
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Initial Password</label>
                  <input required minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} type="text" className="w-full bg-surface-100 border border-white/5 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-colors" placeholder="Temporary password (min 6 chars)" />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Security Clearance Role</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-surface-100 border border-white/5 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 appearance-none text-brand-400 font-medium">
                    <option value="clerk">Clerk (Library Only)</option>
                    <option value="lawyer">Lawyer (Standard Access)</option>
                    <option value="managing_partner">Managing Partner (Extended Access)</option>
                    <option value="admin">System Administrator (Full Access)</option>
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
            form="invite-form"
            disabled={loading} 
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 px-6 py-2 rounded-lg text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create User Account'}
          </button>
        </div>

      </div>
    </div>
  );
}
