import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  Bell,
  Building2,
  Check,
  ClipboardCheck,
  Search,
} from 'lucide-react';
import pb from '@/lib/pocketbase';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  badgeKey?: 'pr_pending' | 'po_pending';
  children?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  { title: 'หน้าแรก', href: '/', icon: LayoutDashboard },
  {
    title: 'จัดการโครงการ',
    href: '/projects',
    icon: Building2,
  },
  {
    title: 'รายการใบขอซื้อ',
    href: '/purchase-requests',
    icon: FileText,
  },
  {
    title: 'ใบขอซื้อโครงการ',
    href: '/purchase-requests/new/project',
    icon: Building2,
  },
  {
    title: 'ใบขอซื้อย่อย',
    href: '/purchase-requests/new/sub',
    icon: ShoppingCart,
  },
  {
    title: 'ใบขอซื้ออื่นๆ',
    href: '/purchase-requests/new/other',
    icon: FileText,
  },
  {
    title: 'อนุมัติใบขอซื้อ',
    href: '/purchase-requests/approval',
    icon: Check,
    badgeKey: 'pr_pending',
  },
  {
    title: 'อนุมัติใบสั่งซื้อ',
    href: '/purchase-orders/approval',
    icon: ClipboardCheck,
    badgeKey: 'po_pending',
  },
  {
    title: 'รายชื่อผู้ขาย',
    href: '/vendors',
    icon: Users,
  },
  {
    title: 'รายงาน',
    href: '/reports',
    icon: BarChart3,
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({ pr_pending: 0, po_pending: 0 });

  // Fetch pending counts
  useEffect(() => {
    async function fetchPendingCounts() {
      try {
        const prResult = await pb.collection('purchase_requests').getList(1, 1, {
          filter: 'status = "pending"',
        });
        const poResult = await pb.collection('purchase_orders').getList(1, 1, {
          filter: 'status = "pending_vendor"',
        });
        setPendingCounts({
          pr_pending: prResult.totalItems,
          po_pending: poResult.totalItems,
        });
      } catch (err) {
        console.error('Failed to fetch pending counts:', err);
      }
    }
    
    fetchPendingCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLink = ({ item, mobile = false }: { item: NavItem; mobile?: boolean }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;
    const badge = item.badgeKey ? pendingCounts[item.badgeKey] : item.badge;

    return (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/20'
            : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
        )}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
      >
        <Icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-[#6B7280]')} />
        <span className="flex-1">{item.title}</span>
        {badge !== undefined && badge > 0 && (
          <span className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
            isActive ? "bg-white text-[#2563EB]" : "bg-blue-600 text-white"
          )}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    );
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col gap-2 bg-[#1F2937] text-white">
      <div className="flex h-20 items-center px-6 mb-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="p-1.5 bg-[#2563EB] rounded-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">ProcureReal</h2>
            <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest leading-none">REAL ESTATE ERP</p>
          </div>
        </Link>
      </div>
      <div className="flex-1 px-4 space-y-1">
        <ScrollArea className="h-[calc(100vh-220px)]">
          {navItems.map((item) => (
            <NavLink key={item.title} item={item} mobile={mobile} />
          ))}
          
          <div className="pt-6 pb-2 px-4">
            <p className="text-[10px] font-bold text-[#4B5563] uppercase tracking-widest">บัญชีผู้ใช้</p>
          </div>
          
          <Link
            to="/settings"
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all'
            )}
          >
            <Settings className="h-5 w-5 text-[#6B7280]" />
            <span>ตั้งค่า</span>
          </Link>
        </ScrollArea>
      </div>
      
      <div className="p-4 mt-auto">
        <div className="bg-[#111827] rounded-2xl p-4 flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-[#374151]">
            <AvatarImage src={user?.avatar ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${user.id}/${user.avatar}` : ''} />
            <AvatarFallback className="bg-[#2563EB] text-white font-bold uppercase">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-white">{user?.name || 'พนักงานใหม่'}</p>
            <p className="text-[10px] text-[#6B7280] truncate font-bold uppercase tracking-wider">{user?.role || 'User'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-[#9CA3AF] hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] bg-[#F9FAFB]">
      <div className="hidden md:block sticky top-0 h-screen overflow-y-auto shadow-xl">
        <Sidebar />
      </div>

      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 items-center gap-4 bg-white/80 backdrop-blur-md px-6 sticky top-0 z-30 border-b border-[#F3F4F6]">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] border-none">
              <Sidebar mobile />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
            <span>การจัดซื้อ</span>
            <span className="text-[#E5E7EB]">/</span>
            <span className="text-[#111827]">
              {navItems.find((item) => item.href === location.pathname)?.title || 'หน้าหลัก'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input 
                placeholder="ค้นหา..." 
                className="pl-10 w-[240px] h-9 bg-[#F3F4F6] border-none rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <Button variant="ghost" size="icon" className="relative text-[#6B7280]">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-[#EF4444]" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
