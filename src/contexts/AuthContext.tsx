import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import pb, { getCurrentUser, logout as pbLogout, isAuthenticated } from '@/lib/pocketbase';
import type { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  // RBAC helpers
  hasRole: (roles: UserRole[]) => boolean;
  isSuperAdmin: () => boolean;
  isHeadOfDept: () => boolean;
  isManager: () => boolean;
  isEmployee: () => boolean;
  canApprovePR: () => boolean;
  canManageUsers: () => boolean;
  canViewAllPR: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function validateAuth() {
      if (isAuthenticated()) {
        const currentUser = getCurrentUser();
        if (currentUser?.id) {
          try {
            // Fetch full user data with relations
            const userData = await pb.collection('users').getOne(currentUser.id, {
              expand: 'department,manager'
            });
            
            const enrichedUser: User = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role as UserRole,
              department: userData.department,
              departmentName: userData.expand?.department?.name,
              manager: userData.manager,
              managerName: userData.expand?.manager?.name,
              isActive: userData.is_active ?? true,
              phone: userData.phone,
              position: userData.position,
              avatar: userData.avatar,
              created: userData.created,
              updated: userData.updated,
            };
            
            setUser(enrichedUser);
          } catch (error) {
            console.log('User not found in database, logging out');
            logout();
          }
        }
      }
      setIsLoading(false);
    }
    
    validateAuth();

    pb.authStore.onChange(() => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        // Re-fetch user data on auth change
        validateAuth();
      } else {
        setUser(null);
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      
      // Fetch full user data with relations
      const userData = await pb.collection('users').getOne(authData.record.id, {
        expand: 'department,manager'
      });
      
      const enrichedUser: User = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role as UserRole,
        department: userData.department,
        departmentName: userData.expand?.department?.name,
        manager: userData.manager,
        managerName: userData.expand?.manager?.name,
        isActive: userData.is_active ?? true,
        phone: userData.phone,
        position: userData.position,
        avatar: userData.avatar,
        created: userData.created,
        updated: userData.updated,
      };
      
      setUser(enrichedUser);
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
        role: 'employee',
        is_active: true,
      });
      await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // RBAC helper functions
  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isSuperAdmin = (): boolean => {
    return user?.role === 'superadmin';
  };

  const isHeadOfDept = (): boolean => {
    return user?.role === 'head_of_dept';
  };

  const isManager = (): boolean => {
    return user?.role === 'manager';
  };

  const isEmployee = (): boolean => {
    return user?.role === 'employee';
  };

  const canApprovePR = (): boolean => {
    return hasRole(['superadmin', 'head_of_dept', 'manager']);
  };

  const canManageUsers = (): boolean => {
    return hasRole(['superadmin', 'head_of_dept']);
  };

  const canViewAllPR = (): boolean => {
    return hasRole(['superadmin', 'head_of_dept', 'manager']);
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
        hasRole,
        isSuperAdmin,
        isHeadOfDept,
        isManager,
        isEmployee,
        canApprovePR,
        canManageUsers,
        canViewAllPR,
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
