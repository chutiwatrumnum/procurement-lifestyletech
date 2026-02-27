import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Wrench, 
  CreditCard, 
  TrendingUp,
  Plus,
  ShoppingCart,
  FileText,
  Building2,
  Loader2,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboard';
import { useMemo, useState } from 'react';

export default function Dashboard() {
  const { user } = useAuth();

  // ตรวจสอบ role
  const isHeadOfDept = user?.role === 'head_of_dept';
  const isManager = user?.role === 'manager';
  const isSuperAdmin = user?.role === 'superadmin';
  const canApprovePR = isHeadOfDept || isManager || isSuperAdmin;

  const { data, isLoading } = useDashboardData();

  const { pendingCounts, stats, recentPRs } = useMemo(() => {
    if (!data) return {
      pendingCounts: { projectPR: 0, subPR: 0, otherPR: 0 },
      stats: [
        { title: 'รายการรออนุมัติทั้งหมด', value: '0', subtitle: 'ข้อมูลจากฐานข้อมูลจริง', icon: Calendar, trend: 'Live', trendUp: true },
        { title: 'โครงการที่กำลังดำเนินการ', value: '0', subtitle: 'โครงการที่รันอยู่ในระบบ', icon: Wrench, badge: 'Real' },
        { title: 'ยอดซื้อรวมทั้งหมด', value: '฿0.00', subtitle: 'รวมทุกโครงการจริง', icon: CreditCard, trend: 'Live', trendUp: true }
      ],
      recentPRs: [] as any[]
    };

    const { allPRs, projects } = data;

    // นับจำนวนรออนุมัติตามประเภท
    const pendingProject = allPRs.filter(p => p.status === 'pending' && (p.type === 'project' || !p.type));
    const pendingSub = allPRs.filter(p => p.status === 'pending' && p.type === 'sub');
    const pendingOther = allPRs.filter(p => p.status === 'pending' && p.type === 'other');
    
    // กรองตามระดับที่ user อนุมัติได้
    let projectPRsToShow = pendingProject;
    let subPRsToShow = pendingSub;
    let otherPRsToShow = pendingOther;
    
    if (isHeadOfDept || isSuperAdmin) {
      projectPRsToShow = pendingProject.filter(p => (p.approval_level || 0) === 0);
      subPRsToShow = pendingSub.filter(p => (p.approval_level || 0) === 0);
      otherPRsToShow = pendingOther.filter(p => (p.approval_level || 0) === 0);
    } else if (isManager) {
      projectPRsToShow = pendingProject.filter(p => (p.approval_level || 0) === 1);
      subPRsToShow = pendingSub.filter(p => (p.approval_level || 0) === 1);
      otherPRsToShow = pendingOther.filter(p => (p.approval_level || 0) === 1);
    }

    const recentPRsMapped = allPRs.map(pr => ({
      id: pr.pr_number,
      project: pr.expand?.project?.name || 'รายการทั่วไป',
      projectType: (pr.type || '').toUpperCase(),
      type: pr.requester_name || pr.expand?.requester?.name || 'N/A',
      date: new Date(pr.created).toLocaleDateString('th-TH'),
      status: pr.status === 'pending' ? 'รออนุมัติ' : pr.status === 'approved' ? 'อนุมัติแล้ว' : pr.status === 'rejected' ? 'ปฏิเสธ' : pr.status,
      statusColor: pr.status === 'pending' ? 'warning' : pr.status === 'approved' ? 'success' : 'destructive'
    }));

    const pendingPrs = allPRs.filter(p => p.status === 'pending');
    const totalAmount = allPRs.reduce((sum, pr) => sum + (pr.total_amount || 0), 0);

    return {
      pendingCounts: {
        projectPR: projectPRsToShow.length,
        subPR: subPRsToShow.length,
        otherPR: otherPRsToShow.length
      },
      stats: [
        { title: 'รายการรออนุมัติทั้งหมด', value: pendingPrs.length.toString(), subtitle: 'ใบขอซื้อที่ค้างอนุมัติ', icon: Calendar, trend: 'Live', trendUp: true },
        { title: 'โครงการที่กำลังดำเนินการ', value: projects.length.toString(), subtitle: 'โครงการในฐานข้อมูล', icon: Wrench, badge: 'Real' },
        { title: 'ยอดจัดซื้อรวมทั้งหมด', value: `฿${(totalAmount / 1000000).toFixed(2)}M`, subtitle: 'รวมทุกโครงการ', icon: CreditCard, trend: 'Live', trendUp: true }
      ],
      recentPRs: recentPRsMapped
    };
  }, [data, isHeadOfDept, isManager, isSuperAdmin]);

  // Pagination for dashboard table
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(recentPRs.length / ITEMS_PER_PAGE);
  const paginatedPRs = recentPRs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoading) return <div className="flex h-[80vh] items-center justify-center font-bold text-blue-600"><Loader2 className="h-10 w-10 animate-spin mr-3" /> กำลังโหลดข้อมูล...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">แผงควบคุมหลัก (Real-time)</h1>
        <p className="text-gray-500 mt-2 text-sm font-medium">จัดการทุกอย่างบนข้อมูลจริงจาก PocketBase</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
              <CardContent className="p-7">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2.5 bg-blue-50 rounded-2xl text-blue-600">
                        <Icon className="w-5 h-5" />
                      </div>
                      {stat.badge && <Badge className="bg-blue-600 text-white border-none font-bold px-3 py-0.5 rounded-lg text-[10px] uppercase tracking-widest">{stat.badge}</Badge>}
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.title}</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">{stat.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black text-blue-600 bg-blue-50">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {stat.trend}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* รายการรออนุมัติตามประเภท */}
      {canApprovePR && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide">รายการรออนุมัติ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PR Project */}
            <Link to="/purchase-requests/approval">
              <Card className={`border-none shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-md ${pendingCounts.projectPR > 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">PR โครงการ</p>
                    <p className={`text-3xl font-black ${pendingCounts.projectPR > 0 ? 'text-red-600' : 'text-gray-400'}`}>{pendingCounts.projectPR}</p>
                    <p className="text-[10px] text-gray-400 uppercase">รออนุมัติ</p>
                  </div>
                  <ArrowRight className={`w-6 h-6 ${pendingCounts.projectPR > 0 ? 'text-red-400' : 'text-gray-300'}`} />
                </CardContent>
              </Card>
            </Link>

            {/* PR Sub */}
            <Link to="/purchase-orders/approval">
              <Card className={`border-none shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-md ${pendingCounts.subPR > 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">PR ย่อย (SUP)</p>
                    <p className={`text-3xl font-black ${pendingCounts.subPR > 0 ? 'text-red-600' : 'text-gray-400'}`}>{pendingCounts.subPR}</p>
                    <p className="text-[10px] text-gray-400 uppercase">รออนุมัติ</p>
                  </div>
                  <ArrowRight className={`w-6 h-6 ${pendingCounts.subPR > 0 ? 'text-red-400' : 'text-gray-300'}`} />
                </CardContent>
              </Card>
            </Link>

            {/* PR Other */}
            <Link to="/purchase-requests/approval?type=other">
              <Card className={`border-none shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-md ${pendingCounts.otherPR > 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">PR อื่นๆ</p>
                    <p className={`text-3xl font-black ${pendingCounts.otherPR > 0 ? 'text-red-600' : 'text-gray-400'}`}>{pendingCounts.otherPR}</p>
                    <p className="text-[10px] text-gray-400 uppercase">รออนุมัติ</p>
                  </div>
                  <ArrowRight className={`w-6 h-6 ${pendingCounts.otherPR > 0 ? 'text-red-400' : 'text-gray-300'}`} />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white border-none shadow-xl shadow-blue-500/20 rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Building2 className="w-32 h-32" />
          </div>
          <CardContent className="p-8 relative z-10">
            <h3 className="text-xl font-black mb-3 uppercase tracking-tight">สร้างใบขอซื้อ - โครงการ</h3>
            <p className="text-blue-100 text-sm mb-8 leading-relaxed font-medium opacity-90">สร้างใบขอซื้อตามงบประมาณโครงการ (Developer PO) สำหรับวัสดุก่อสร้างหลัก</p>
            <Link to="/purchase-requests/new/project">
              <Button className="w-full bg-white text-[#2563EB] hover:bg-blue-50 font-black h-12 rounded-2xl transition-all active:scale-[0.98] shadow-sm uppercase text-xs tracking-widest">
                <Plus className="w-5 h-5 mr-2" /> เริ่มสร้างใบขอซื้อ
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-[#1F2937] text-white border-none shadow-xl rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-32 h-32" />
          </div>
          <CardContent className="p-8 relative z-10">
            <h3 className="text-xl font-black mb-3 uppercase tracking-tight">สร้างใบขอซื้อ - ย่อย</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium opacity-90">สร้างใบขอซื้อจากงบงานระบบ หรืองานรับเหมาช่วงที่ต้องการการอนุมัติแยกตามวงเงิน</p>
            <Link to="/purchase-requests/new/sub">
              <Button className="w-full bg-[#374151] text-white hover:bg-[#4B5563] font-black h-12 rounded-2xl transition-all border-none uppercase text-xs tracking-widest">
                <Plus className="w-5 h-5 mr-2" /> สร้างใบขอซื้อย่อย
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
            <FileText className="w-32 h-32" />
          </div>
          <CardContent className="p-8 relative z-10">
            <h3 className="text-xl font-black text-[#111827] mb-3 uppercase tracking-tight">สร้างใบขอซื้อ - อื่นๆ</h3>
            <p className="text-[#6B7280] text-sm mb-8 leading-relaxed font-medium opacity-90">สำหรับรายการจัดซื้อทั่วไปนอกโครงการ เช่น อุปกรณ์สำนักงาน หรือค่าใช้จ่ายเบ็ดเตล็ด</p>
            <Link to="/purchase-requests/new/other">
              <Button className="w-full bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB] font-black h-12 rounded-2xl transition-all border-none uppercase text-xs tracking-widest">
                <Plus className="w-5 h-5 mr-2" /> สร้างรายการอื่นๆ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent PRs */}
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="border-b border-gray-50 py-6 px-8 flex-row items-center justify-between">
          <CardTitle className="text-xs font-black text-[#111827] uppercase tracking-widest">รายการใบขอซื้อทั้งหมด</CardTitle>
          <Link to="/purchase-requests">
            <Button variant="ghost" className="text-blue-600 font-black hover:bg-blue-50 rounded-xl px-4 h-9 uppercase text-[10px] tracking-widest">ดูทั้งหมด</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] text-[#6B7280] font-black uppercase text-[10px] tracking-[0.15em]">
                  <th className="py-5 px-8 text-left">รหัสใบขอซื้อ</th>
                  <th className="py-5 px-8 text-left">โครงการ / ประเภท</th>
                  <th className="py-5 px-8 text-left">ผู้ขอซื้อ</th>
                  <th className="py-5 px-8 text-left">วันที่</th>
                  <th className="py-5 px-8 text-left">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentPRs.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">ไม่มีข้อมูลใบขอซื้อในฐานข้อมูล</td></tr>
                ) : (
                  paginatedPRs.map((pr) => (
                    <tr key={pr.id} className="hover:bg-[#F9FAFB] transition-colors cursor-pointer group">
                      <td className="py-6 px-8 font-black text-blue-600 group-hover:underline">{pr.id}</td>
                      <td className="py-6 px-8">
                        <p className="font-bold text-[#1F2937] leading-tight">{pr.project}</p>
                        <p className="text-[10px] font-black text-[#9CA3AF] uppercase mt-1 tracking-widest">{pr.projectType}</p>
                      </td>
                      <td className="py-6 px-8 text-[#4B5563] font-bold">{pr.type}</td>
                      <td className="py-6 px-8 text-[#6B7280] font-medium">{pr.date}</td>
                      <td className="py-6 px-8">
                        <Badge className={`rounded-full px-4 py-1 font-black uppercase text-[9px] tracking-widest border-none ${
                          pr.statusColor === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                          pr.statusColor === 'success' ? 'bg-green-50 text-green-700' :
                          pr.statusColor === 'info' ? 'bg-blue-50 text-blue-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {pr.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-8 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, recentPRs.length)} จาก {recentPRs.length} รายการ
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 px-3 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> ก่อนหน้า
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .reduce<(number | string)[]>((acc, page, idx, arr) => {
                      if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((page, idx) => (
                      typeof page === 'string' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">...</span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`h-9 w-9 p-0 rounded-lg ${
                            currentPage === page ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                          }`}
                        >
                          {page}
                        </Button>
                      )
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 px-3 rounded-lg"
                >
                  ถัดไป <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
