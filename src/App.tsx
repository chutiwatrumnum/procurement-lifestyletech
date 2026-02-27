import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';

// Pages
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';

// Projects
import ProjectList from '@/pages/Project/ProjectList';
import ProjectNew from '@/pages/Project/ProjectNew';
import ProjectDetail from '@/pages/Project/ProjectDetail';
import ProjectEdit from '@/pages/Project/ProjectEdit';
import ProjectStock from '@/pages/Project/ProjectStock';

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
import VendorEdit from '@/pages/Vendor/VendorEdit';

// Purchase Order
import POCreate from '@/pages/PurchaseOrder/POCreate';
import POApproval from '@/pages/PurchaseOrder/POApproval';
import POEdit from '@/pages/PurchaseOrder/POEdit';

// Reports
import BudgetReport from '@/pages/Reports/BudgetReport';

// Admin
import UserManagement from '@/pages/Admin/Users';

// Settings
import ProfileSettings from '@/pages/Settings/Profile';

// Shared
import PurchaseRequestList from '@/pages/PurchaseRequestList';
import PurchaseOrderList from '@/pages/PurchaseOrderList';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold">กำลังเชื่อมต่อฐานข้อมูล...</div>;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
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
      <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
      <Route path="/projects/edit/:id" element={<ProtectedRoute><ProjectEdit /></ProtectedRoute>} />
      <Route path="/projects/stock" element={<ProtectedRoute><ProjectStock /></ProtectedRoute>} />

      {/* Purchase Requests */}
      <Route path="/purchase-requests" element={<ProtectedRoute><PurchaseRequestList /></ProtectedRoute>} />
      <Route path="/purchase-requests/project" element={<ProtectedRoute><PurchaseRequestList type="project" /></ProtectedRoute>} />
      <Route path="/purchase-requests/sub" element={<ProtectedRoute><PurchaseRequestList type="sub" /></ProtectedRoute>} />
      <Route path="/purchase-requests/:id" element={<ProtectedRoute><PRDetail /></ProtectedRoute>} />
      <Route path="/purchase-requests/new/project" element={<ProtectedRoute><PRProject /></ProtectedRoute>} />
      <Route path="/purchase-requests/edit/project/:id" element={<ProtectedRoute><PRProject /></ProtectedRoute>} />
      <Route path="/purchase-requests/new/sub" element={<ProtectedRoute><PRSubcontractor /></ProtectedRoute>} />
      <Route path="/purchase-requests/edit/sub/:id" element={<ProtectedRoute><PRSubcontractor /></ProtectedRoute>} />
      <Route path="/purchase-requests/new/other" element={<ProtectedRoute><PROther /></ProtectedRoute>} />
      <Route path="/purchase-requests/approval" element={<ProtectedRoute><PRApproval /></ProtectedRoute>} />
      <Route path="/purchase-requests/edit/:id" element={<ProtectedRoute><PREdit /></ProtectedRoute>} />

      {/* Purchase Orders */}
      <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrderList /></ProtectedRoute>} />
      <Route path="/purchase-orders/new" element={<ProtectedRoute><POCreate /></ProtectedRoute>} />
      <Route path="/purchase-orders/approval" element={<ProtectedRoute><POApproval /></ProtectedRoute>} />
      <Route path="/purchase-orders/edit/:id" element={<ProtectedRoute><POEdit /></ProtectedRoute>} />

      {/* Reports */}
      <Route path="/reports" element={<ProtectedRoute><BudgetReport /></ProtectedRoute>} />
      
      {/* Admin */}
      <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      
      {/* Settings */}
      <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
      
      {/* Vendors */}
      <Route path="/vendors" element={<ProtectedRoute><VendorListNew /></ProtectedRoute>} />
      <Route path="/vendors/new" element={<ProtectedRoute><VendorNew /></ProtectedRoute>} />
      <Route path="/vendors/edit/:id" element={<ProtectedRoute><VendorEdit /></ProtectedRoute>} />

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
