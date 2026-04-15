import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import { ArrowLeft, Bell, Check, Clock, Trash2, Info, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Notifications() {
  const { user } = useAuth();
  const { notifications, loading } = useNotifications();
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      // Update local state for immediate feedback
      setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <Info className="w-5 h-5 text-brand-400" />;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="h-16 border-b border-white/5 bg-surface/50 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link to="/library" className="p-2 -ml-2 text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-display font-semibold">Real-time Notifications</h1>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : localNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center border border-dashed border-white/10 rounded-2xl bg-surface-50/50">
            <Bell className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="text-sm text-muted-foreground mt-1">New activity alerts will appear here in real time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {localNotifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => !notif.read && markRead(notif.id)}
                className={`relative p-5 rounded-2xl border transition-all cursor-pointer group ${
                  notif.read 
                    ? 'bg-surface-50 border-white/5 opacity-70' 
                    : 'bg-surface-100/50 border-brand-500/20 shadow-lg shadow-brand-500/5 hover:border-brand-500/40'
                }`}
              >
                {!notif.read && (
                  <div className="absolute top-5 right-5 w-2 h-2 bg-brand-500 rounded-full shadow-[0_0_8px_rgba(var(--brand-500),0.8)]"></div>
                )}
                
                <div className="flex gap-4">
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                    notif.read ? 'bg-surface-200' : 'bg-brand-500/10'
                  }`}>
                    {getIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className={`text-sm font-semibold mb-1 ${notif.read ? 'text-foreground/80' : 'text-foreground'}`}>
                      {notif.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {notif.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(notif.createdAt).toLocaleString()}
                      </span>
                      
                      {!notif.read && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                          className="text-[10px] font-bold text-brand-400 hover:text-brand-300 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Check className="w-3 h-3" /> Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Optional CTA if metadata contains a precedentId */}
                {notif.metadata?.precedentId && (
                  <Link 
                    to={`/document/${notif.metadata.precedentId}`}
                    className="mt-4 block w-full py-2 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 rounded-lg text-center text-xs font-semibold text-brand-400 transition-colors"
                  >
                    View Document
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
