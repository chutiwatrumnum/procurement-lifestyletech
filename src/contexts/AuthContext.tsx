import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import pb, { getCurrentUser, logout as pbLogout, isAuthenticated } from '@/lib/pocketbase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function validateAuth() {
      // Check if user is already logged in via PocketBase
      if (isAuthenticated()) {
        const currentUser = getCurrentUser();
        if (currentUser?.id) {
          try {
            // Verify user still exists in database
            await pb.collection('users').getOne(currentUser.id);
            setUser(currentUser as unknown as User);
          } catch (error) {
            // User not found in database, clear auth
            console.log('User not found in database, logging out');
            logout();
          }
        }
      }
      setIsLoading(false);
    }
    
    validateAuth();

    // Listen for auth state changes
    pb.authStore.onChange(() => {
      const currentUser = getCurrentUser();
      setUser(currentUser as unknown as User | null);
    });
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      setUser(authData.record as unknown as User);
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    pbLogout();
    setUser(null);
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name,
        role: 'user',
      });
      await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
