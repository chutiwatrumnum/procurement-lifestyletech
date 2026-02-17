import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import Layout from '@/components/layout/Layout';

// Pages
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';

// Projects
import ProjectList from '@/pages/Project/ProjectList';
import ProjectNew from '@/pages/Project/ProjectNew';

// Purchase Request
import PRProject from '@/pages/PurchaseRequest/PRProject';
import PRSubcontractor from '@/pages/PurchaseRequest/PRSubcontractor';
import PROther from '@/pages/PurchaseRequest/PROther';
import PRApproval from '@/pages/PurchaseRequest/PRApproval';
import PREdit from '@/pages/PurchaseRequest/PREdit';
import PRDetail from '@/pages/PurchaseRequest/PRDetail';

// Vendor
import VendorListNew from '@/pages/Vendor/VendorListNew';
import VendorNew from '@/pages/Vendor/VendorNew';

// Purchase Order
import POCreate from '@/pages/PurchaseOrder/POCreate';
import POApproval from '@/pages/PurchaseOrder/POApproval';
import POEdit from '@/pages/PurchaseOrder/POEdit';

// Reports
import BudgetReport from '@/pages/Reports/BudgetReport';

// Shared
import PurchaseRequestList from '@/pages/PurchaseRequestList';
import PurchaseOrderList from '@/pages/PurchaseOrderList';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold">กำลังเชื่อมต่อฐานข้อมูล...</div>;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// Role-based protected route
function RoleProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
  const { isLoggedIn, isLoading, hasRole } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold">กำลังเชื่อมต่อฐานข้อมูล...</div>;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!hasRole(allowedRoles)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      
      {/* Projects */}
      <Route path="/projects" element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
      <Route path="/projects/new" element={<ProtectedRoute><ProjectNew /></ProtectedRoute>} />

      {/* Purchase Requests */}
      <Route path="/purchase-requests" element={<ProtectedRoute><PurchaseRequestList /></ProtectedRoute>} />
      <Route path="/purchase-requests/:id" element={<ProtectedRoute><PRDetail /></ProtectedRoute>} />
      <Route path="/purchase-requests/new/project" element={<ProtectedRoute><PRProject /></ProtectedRoute>} />
      <Route path="/purchase-requests/new/sub" element={<ProtectedRoute><PRSubcontractor /></ProtectedRoute>} />
      <Route path="/purchase-requests/new/other" element={<ProtectedRoute><PROther /></ProtectedRoute>} />
      <Route path="/purchase-requests/approval" element={<RoleProtectedRoute allowedRoles={['superadmin', 'head_of_dept', 'manager']}><PRApproval /></RoleProtectedRoute>} />
      <Route path="/purchase-requests/edit/:id" element={<ProtectedRoute><PREdit /></ProtectedRoute>} />

      {/* Purchase Orders */}
      <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrderList /></ProtectedRoute>} />
      <Route path="/purchase-orders/new" element={<ProtectedRoute><POCreate /></ProtectedRoute>} />
      <Route path="/purchase-orders/approval" element={<RoleProtectedRoute allowedRoles={['superadmin', 'head_of_dept', 'manager']}><POApproval /></RoleProtectedRoute>} />
      <Route path="/purchase-orders/edit/:id" element={<ProtectedRoute><POEdit /></ProtectedRoute>} />

      {/* Reports */}
      <Route path="/reports" element={<ProtectedRoute><BudgetReport /></ProtectedRoute>} />
      
      {/* Vendors */}
      <Route path="/vendors" element={<ProtectedRoute><VendorListNew /></ProtectedRoute>} />
      <Route path="/vendors/new" element={<ProtectedRoute><VendorNew /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
