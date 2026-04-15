import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut, getIdTokenResult, signInWithEmailAndPassword, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import api from '../services/api';

export type UserRole = 'admin' | 'managing_partner' | 'lawyer' | 'clerk';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Fetch JWT claims to grab RBAC Role injected by our backend backend
          const tokenResult = await getIdTokenResult(firebaseUser);
          const role = (tokenResult.claims.role || 'clerk') as UserRole;
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'JurisHaven Member',
            role: role,
            token: tokenResult.token
          });
        } catch (err) {
          console.error("Token result fetch error:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
