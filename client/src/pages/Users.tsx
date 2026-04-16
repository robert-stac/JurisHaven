import { useState, useEffect } from 'react';
import { Users as UsersIcon, Shield, Search, MoreVertical, Check, UserPlus } from 'lucide-react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import InviteModal from '../components/InviteModal';
import api from '../services/api';
import { formatDate } from '../lib/utils';

export default function Users() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsersList(res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const handleRefresh = () => fetchUsers();
    window.addEventListener('user-created', handleRefresh);
    return () => window.removeEventListener('user-created', handleRefresh);
  }, []);

  const handleToggleStatus = async (e: any, u: any) => {
    e.stopPropagation();
    try {
      await api.patch(`/users/${u.uid}/status`, { isActive: !u.isActive });
      setUsersList(prev => prev.map(user => user.uid === u.uid ? { ...user, isActive: !user.isActive } : user));
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setActiveDropdown(null);
    }
  };

  const handleDelete = async (e: any, u: any) => {
    e.stopPropagation();
    if (!confirm(`Are you absolutely sure you want to delete ${u.displayName}? This cannot be undone.`)) {
      setActiveDropdown(null);
      return;
    }
    
    try {
      await api.delete(`/users/${u.uid}`);
      setUsersList(prev => prev.filter(user => user.uid !== u.uid));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setActiveDropdown(null);
    }
  };

  const handleRoleChange = async (e: any, uid: string, newRole: UserRole) => {
    e.stopPropagation();
    try {
      await api.patch(`/users/${uid}/role`, { role: newRole });
      setUsersList(prev => prev.map(user => user.uid === uid ? { ...user, role: newRole } : user));
    } catch (err) {
      alert('Failed to update role');
    } finally {
      setActiveDropdown(null);
    }
  };

  // Rest of the UI helpers...
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'managing_partner': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'lawyer': return 'bg-brand-500/10 text-brand-400 border-brand-500/20';
      case 'clerk': return 'bg-surface-300/30 text-muted-foreground border-white/5';
      default: return 'bg-surface-300/30 text-white border-white/5';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.actions-dropdown')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredUsers = usersList.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user?.role !== 'admin') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-surface text-center px-4">
        <Shield className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-display font-bold text-white">Access Denied</h1>
        <p className="text-muted-foreground mt-2 max-w-md">You do not have the necessary security clearance to view the Firm Access Control module.</p>
        <Link to="/library" className="mt-8 bg-surface-100 hover:bg-surface-200 px-6 py-2 rounded-lg transition-colors">Return to Library</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-surface text-foreground overflow-hidden">
      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
      
      {/* Header */}
      <header className="h-20 shrink-0 border-b border-white/5 bg-surface-50 flex items-center justify-between px-8 w-full shadow-md z-10">
        <div className="flex items-center gap-4">
          <Link to="/library" className="text-brand-400 font-display font-bold text-xl tracking-tight">JurisHaven</Link>
          <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
          <h1 className="flex items-center gap-2 font-medium text-muted-foreground border border-white/5 bg-surface-100 px-3 py-1.5 rounded-md">
            <UsersIcon className="w-4 h-4" /> Users & Permissions
          </h1>
        </div>

        <button 
          onClick={() => setIsInviteOpen(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-brand-500/20"
        >
          <UserPlus className="w-4 h-4" /> Add New User
        </button>
      </header>

      {/* Main Board */}
      <main className="flex-1 overflow-y-auto p-8 pb-32">
        <div className="max-w-6xl mx-auto">
          
          <div className="bg-surface-50 border border-white/5 rounded-2xl shadow-xl overflow-visible">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-100/30">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-500/50 transition-colors"
                />
              </div>

              <button 
                onClick={() => setIsInviteOpen(true)}
                className="hidden md:flex items-center gap-2 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Quick Add Member
              </button>
            </div>

            <div className="overflow-visible min-h-[300px]">
              {loading ? (
                <div className="p-12 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"></div></div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-xs text-muted-foreground uppercase tracking-wider bg-surface-100/10">
                      <th className="px-6 py-4 font-medium">User</th>
                      <th className="px-6 py-4 font-medium">Clearance Level</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-surface-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-surface-200 border border-white/10 flex items-center justify-center font-display font-medium text-foreground">
                              {u.displayName?.charAt(0) || u.email.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{u.displayName || 'No Name'}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getRoleBadgeColor(u.role)}`}>
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.isActive ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-green-500">
                              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <div className="w-2 h-2 rounded-full bg-surface-300 shrink-0"></div> Deactivated
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right relative actions-dropdown">
                          <button 
                            onClick={(e) => {
                              setActiveDropdown(activeDropdown === u.uid ? null : u.uid);
                            }}
                            className="p-2 text-muted-foreground hover:text-white hover:bg-surface-200 rounded-lg transition-colors focus:ring-1 focus:ring-brand-500"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {activeDropdown === u.uid && (
                            <div className="absolute right-10 top-10 mt-1 w-48 bg-surface-100 border border-white/10 rounded-xl shadow-2xl py-1 z-[100] animate-fade-in origin-top-right">
                              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-white/5">
                                Set Role
                              </div>
                              <button onClick={(e) => handleRoleChange(e, u.uid, 'admin')} className="w-full text-left px-4 py-2 text-sm hover:bg-brand-500/10 hover:text-brand-400 transition-colors">Admin</button>
                              <button onClick={(e) => handleRoleChange(e, u.uid, 'managing_partner')} className="w-full text-left px-4 py-2 text-sm hover:bg-brand-500/10 hover:text-brand-400 transition-colors">Managing Partner</button>
                              <button onClick={(e) => handleRoleChange(e, u.uid, 'lawyer')} className="w-full text-left px-4 py-2 text-sm hover:bg-brand-500/10 hover:text-brand-400 transition-colors">Lawyer</button>
                              <button onClick={(e) => handleRoleChange(e, u.uid, 'clerk')} className="w-full text-left px-4 py-2 text-sm hover:bg-brand-500/10 hover:text-brand-400 transition-colors">Clerk</button>
                              
                              <div className="h-[1px] w-full bg-white/5 my-1"></div>
                              <button 
                                onClick={(e) => handleToggleStatus(e, u)}
                                className="w-full text-left px-4 py-2 text-sm text-amber-500 hover:bg-amber-500/10 transition-colors"
                              >
                                {u.isActive ? 'Deactivate User' : 'Re-activate User'}
                              </button>
                              <button 
                                onClick={(e) => handleDelete(e, u)}
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                Delete User
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
