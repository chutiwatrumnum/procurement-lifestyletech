import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { notificationService } from '@/services/notification';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import pb from '@/lib/pocketbase';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  roles?: UserRole[];
}

const allNavItems: NavItem[] = [
  { title: 'หน้าแรก', href: '/', icon: LayoutDashboard },
  {
    title: 'จัดการโครงการ',
    href: '/projects',
    icon: Building2,
    roles: ['superadmin', 'head_of_dept', 'manager', 'employee'],
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
    title: 'อนุมัติใบขอซื้อโครงการ',
    href: '/purchase-requests/approval',
    icon: Check,
    roles: ['superadmin', 'head_of_dept', 'manager'],
  },
  {
    title: 'อนุมัติใบขอซื้อย่อย',
    href: '/purchase-orders/approval',
    icon: ClipboardCheck,
    roles: ['superadmin', 'head_of_dept', 'manager'],
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
    roles: ['superadmin', 'head_of_dept', 'manager'],
  },
  {
    title: 'จัดการผู้ใช้',
    href: '/admin/users',
    icon: Users,
    roles: ['superadmin', 'head_of_dept'],
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

// Separate NavLink component to receive badge as prop
function NavLink({ 
  item, 
  isActive, 
  collapsed, 
  onClick,
  badge 
}: { 
  item: NavItem; 
  isActive: boolean; 
  collapsed: boolean;
  onClick?: () => void;
  badge: number;
}) {
  const Icon = item.icon;
  
  return (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 relative',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-500/20'
          : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
      )}
      onClick={onClick}
      title={collapsed ? item.title : undefined}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-white' : 'text-[#6B7280]')} />
      {!collapsed && <span className="flex-1">{item.title}</span>}
      {!collapsed && badge > 0 && (
        <span className={cn(
          "flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0",
          isActive ? "bg-white text-[#2563EB]" : "bg-red-500 text-white"
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {collapsed && badge > 0 && (
        <span className={cn(
          "absolute -top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold",
          isActive ? "bg-white text-[#2563EB]" : "bg-red-500 text-white"
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

// Sidebar component
function Sidebar({ 
  mobile = false, 
  collapsed = false, 
  onClose,
  navItems,
  pendingPRProject,
  pendingPRSub,
  user,
  onLogout,
  onToggleCollapse,
  isSidebarCollapsed
}: { 
  mobile?: boolean; 
  collapsed?: boolean; 
  onClose?: () => void;
  navItems: NavItem[];
  pendingPRProject: number;
  pendingPRSub: number;
  user: any;
  onLogout: () => void;
  onToggleCollapse: () => void;
  isSidebarCollapsed: boolean;
}) {
  const location = useLocation();
  
  const roleLabels: Record<UserRole, string> = {
    superadmin: 'ผู้ดูแลระบบ',
    head_of_dept: 'หัวหน้าแผนก',
    manager: 'ผู้จัดการ',
    employee: 'พนักงาน',
  };

  // Calculate badge for each item
  const getBadgeCount = (item: NavItem): number => {
    if (item.href === '/purchase-requests/approval') {
      return pendingPRProject;
    }
    if (item.href === '/purchase-orders/approval') {
      return pendingPRSub;
    }
    return item.badge || 0;
  };

  return (
    <div className="flex h-full flex-col gap-2 bg-[#1F2937] text-white relative">
      <div className={cn("flex items-center mb-4", collapsed ? "h-16 px-4 justify-center" : "h-20 px-6")}>
        <Link to="/" className="flex items-center gap-3">
          <div className="p-1.5 bg-[#2563EB] rounded-lg flex-shrink-0">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold tracking-tight">ProcureReal</h2>
              <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest leading-none">REAL ESTATE ERP</p>
            </div>
          )}
        </Link>
      </div>
      
      {/* Toggle Button */}
      {!mobile && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-24 bg-[#2563EB] text-white rounded-full p-1.5 shadow-lg hover:bg-[#1D4ED8] transition-colors z-50"
          title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      )}

      <div className={cn("flex-1 space-y-1", collapsed ? "px-2" : "px-4")}>
        <ScrollArea className={cn(collapsed ? "h-[calc(100vh-180px)]" : "h-[calc(100vh-220px)]")}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const badgeCount = getBadgeCount(item);
            
            return (
              <div key={item.title} className={cn("relative mb-1", collapsed && "mb-1")}>
                <NavLink 
                  item={item} 
                  isActive={isActive}
                  collapsed={collapsed}
                  onClick={onClose}
                  badge={badgeCount}
                />
              </div>
            );
          })}
          
          {!collapsed && (
            <div className="pt-6 pb-2 px-4">
              <p className="text-[10px] font-bold text-[#4B5563] uppercase tracking-widest">บัญชีผู้ใช้</p>
            </div>
          )}
          
          <Link
            to="/settings/profile"
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-all',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? "ตั้งค่า" : undefined}
          >
            <Settings className="h-5 w-5 text-[#6B7280] flex-shrink-0" />
            {!collapsed && <span>ตั้งค่า</span>}
          </Link>
        </ScrollArea>
      </div>
      
      <div className={cn("mt-auto", collapsed ? "p-2" : "p-4")}>
        <div className={cn("bg-[#111827] rounded-2xl flex items-center gap-3", collapsed ? "p-2 justify-center" : "p-4")}>
          <Avatar className="h-10 w-10 border-2 border-[#374151] flex-shrink-0">
            <AvatarImage src={user?.avatar ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${user.id}/${user.avatar}` : ''} />
            <AvatarFallback className="bg-[#2563EB] text-white font-bold uppercase">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white">{user?.name || 'พนักงานใหม่'}</p>
                <p className="text-[10px] text-[#6B7280] truncate font-bold uppercase tracking-wider">{user?.role ? roleLabels[user.role as UserRole] : 'ผู้ใช้'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onLogout} className="text-[#9CA3AF] hover:text-red-400 transition-colors flex-shrink-0">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pendingPRProject, setPendingPRProject] = useState(0);
  const [pendingPRSub, setPendingPRSub] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ดึง notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const result = await notificationService.getByUser(user.id, 20);
      setNotifications(result.items || []);
      setUnreadCount((result.items || []).filter((n: any) => !n.is_read).length);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  // ดึงตอนโหลดและทุก 30 วินาที
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // ฟัง real-time updates
  useEffect(() => {
    if (!user?.id) return;
    
    pb.collection('notifications').subscribe('*', async (e) => {
      if (e.action === 'create' && e.record.user === user.id) {
        fetchNotifications();
      }
    });
    
    return () => {
      pb.collection('notifications').unsubscribe('*');
    };
  }, [user?.id]);

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  // Fetch pending counts
  const fetchPendingCounts = async () => {
    try {
      // นับ PR Project ที่รออนุมัติ
      const prProjectResult = await pb.collection('purchase_requests').getList(1, 1, {
        filter: 'status = "pending" && type = "project"',
      });
      setPendingPRProject(prProjectResult.totalItems);
      
      // นับ PR Sub ที่รออนุมัติ
      const prSubResult = await pb.collection('purchase_requests').getList(1, 1, {
        filter: 'status = "pending" && type = "sub"',
      });
      setPendingPRSub(prSubResult.totalItems);
    } catch (err) {
      console.error('Failed to fetch pending counts:', err);
    }
  };

  useEffect(() => {
    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 30000);
    
    // Listen for refresh event from other components
    const handleRefresh = () => {
      fetchPendingCounts();
    };
    window.addEventListener('refresh-badge-counts', handleRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-badge-counts', handleRefresh);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={cn(
      "grid min-h-screen w-full bg-[#F9FAFB] transition-all duration-300",
      isSidebarCollapsed 
        ? "md:grid-cols-[70px_1fr]" 
        : "md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]"
    )}>
      {/* Desktop Sidebar */}
      <div className="hidden md:block sticky top-0 h-screen overflow-y-auto shadow-xl">
        <Sidebar 
          collapsed={isSidebarCollapsed}
          navItems={navItems}
          pendingPRProject={pendingPRProject}
          pendingPRSub={pendingPRSub}
          user={user}
          onLogout={handleLogout}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 bg-white/80 backdrop-blur-md px-6 sticky top-0 z-30 border-b border-[#F3F4F6]">
          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] border-none">
              <Sidebar 
                mobile={true}
                navItems={navItems}
                pendingPRProject={pendingPRProject}
                pendingPRSub={pendingPRSub}
                user={user}
                onLogout={handleLogout}
                onClose={() => setIsMobileMenuOpen(false)}
                onToggleCollapse={() => {}}
                isSidebarCollapsed={false}
              />
            </SheetContent>
          </Sheet>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
            <span>การจัดซื้อ</span>
            <span className="text-[#E5E7EB]">/</span>
            <span className="text-[#111827]">
              {navItems.find((item) => item.href === location.pathname)?.title || 'หน้าหลัก'}
            </span>
          </div>

          {/* Right Side Actions */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input 
                placeholder="ค้นหา..." 
                className="pl-10 w-[240px] h-9 bg-[#F3F4F6] border-none rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            {/* Notification Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-[#6B7280]">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 rounded-full bg-red-500 text-white text-xs items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <div className="px-3 py-2 border-b">
                  <p className="font-bold text-sm">การแจ้งเตือน</p>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => { notificationService.markAllAsRead(user?.id || ''); fetchNotifications(); }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      ทำเครื่องหมายว่าอ่านทั้งหมด
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-3 py-8 text-center text-gray-400 text-sm">
                    ไม่มีการแจ้งเตือน
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <DropdownMenuItem 
                      key={notif.id} 
                      className={`px-3 py-2 cursor-pointer ${!notif.is_read ? 'bg-blue-50' : ''}`}
                      onClick={() => {
                        if (!notif.is_read) {
                          notificationService.markAsRead(notif.id);
                          fetchNotifications();
                        }
                        if (notif.pr_id) {
                          navigate('/purchase-requests');
                        }
                      }}
                    >
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${notif.type === 'rejection' ? 'text-red-600' : notif.type === 'approval' ? 'text-green-600' : 'text-gray-600'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {notif.created ? new Date(notif.created).toLocaleString('th-TH') : ''}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
