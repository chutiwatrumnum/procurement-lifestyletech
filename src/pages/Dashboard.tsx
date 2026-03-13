import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Plus,
  ShoppingCart,
  FileText,
  Building2,
  Loader2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Package,
  BarChart3,
  AlertCircle,
  Layers
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboard';
import { useMemo, useState } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ตรวจสอบ role
  const isHeadOfDept = user?.role === 'head_of_dept';
  const isManager = user?.role === 'manager';
  const isSuperAdmin = user?.role === 'superadmin';
  const canApprovePR = isHeadOfDept || isManager || isSuperAdmin;

  const { data, isLoading } = useDashboardData();

  const dashboardStats = useMemo(() => {
    if (!data) return null;

    const { allPRs, projects } = data;

    // === Status counts ===
    const pendingPRs = allPRs.filter(p => p.status === 'pending');
    const approvedPRs = allPRs.filter(p => p.status === 'approved');
    const rejectedPRs = allPRs.filter(p => p.status === 'rejected');

    // === Type counts ===
    const projectPRs = allPRs.filter(p => p.type === 'project');
    const subPRs = allPRs.filter(p => p.type === 'sub');
    const otherPRs = allPRs.filter(p => p.type === 'other');

    // === Pending counts by approval level ===
    const pendingProject = pendingPRs.filter(p => p.type === 'project' || !p.type);
    const pendingSub = pendingPRs.filter(p => p.type === 'sub');
    const pendingOther = pendingPRs.filter(p => p.type === 'other');

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

    // === Amounts ===
    const totalAmount = allPRs.reduce((sum, pr) => sum + (pr.total_amount || 0), 0);
    const approvedAmount = approvedPRs.reduce((sum, pr) => sum + (pr.total_amount || 0), 0);
    const pendingAmount = pendingPRs.reduce((sum, pr) => sum + (pr.total_amount || 0), 0);

    // === Procurement status (เฉพาะ sub + other ที่ approved) ===
    const approvedSubOther = approvedPRs.filter(p => p.type === 'sub' || p.type === 'other');
    const purchasedCount = approvedSubOther.filter(p => p.procurement_status === 'purchased').length;
    const notPurchasedCount = approvedSubOther.length - purchasedCount;

    // === Recent PRs ===
    const recentPRsMapped = allPRs.slice(0, 50).map(pr => ({
      id: pr.id,
      pr_number: pr.pr_number,
      project: pr.expand?.project?.name || 'รายการทั่วไป',
      projectType: (pr.type || '').toUpperCase(),
      rawType: pr.type,
      rawStatus: pr.status,
      requester: pr.requester_name || pr.expand?.requester?.name || 'N/A',
      date: new Date(pr.created).toLocaleDateString('th-TH'),
      amount: pr.total_amount || 0,
      status: pr.status === 'pending' ? 'รออนุมัติ' : pr.status === 'approved' ? 'อนุมัติแล้ว' : pr.status === 'rejected' ? 'ปฏิเสธ' : pr.status,
      statusColor: pr.status === 'pending' ? 'warning' : pr.status === 'approved' ? 'success' : 'destructive',
      procurement_status: pr.procurement_status || 'not_purchased'
    }));

    return {
      totalPRs: allPRs.length,
      pendingCount: pendingPRs.length,
      approvedCount: approvedPRs.length,
      rejectedCount: rejectedPRs.length,
      projectCount: projectPRs.length,
      subCount: subPRs.length,
      otherCount: otherPRs.length,
      projectsCount: projects.length,
      totalAmount,
      approvedAmount,
      pendingAmount,
      purchasedCount,
      notPurchasedCount,
      approvedSubOtherCount: approvedSubOther.length,
      pendingCounts: {
        projectPR: projectPRsToShow.length,
        subPR: subPRsToShow.length,
        otherPR: otherPRsToShow.length
      },
      recentPRs: recentPRsMapped
    };
  }, [data, isHeadOfDept, isManager, isSuperAdmin]);

  // Pagination for dashboard table
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const recentPRs = dashboardStats?.recentPRs || [];
  const totalPages = Math.ceil(recentPRs.length / ITEMS_PER_PAGE);
  const paginatedPRs = recentPRs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `฿${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `฿${(amount / 1000).toFixed(1)}K`;
    return `฿${amount.toLocaleString()}`;
  };

  if (isLoading) return <div className="flex h-[80vh] items-center justify-center font-bold text-blue-600"><Loader2 className="h-10 w-10 animate-spin mr-3" /> กำลังโหลดข้อมูล...</div>;
  if (!dashboardStats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">แผงควบคุมหลัก</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">สรุปภาพรวมระบบจัดซื้อจัดจ้าง — {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            LIVE
          </span>
        </div>
      </div>

      {/* === Row 1: Overview Stats (4 cards) === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total PRs */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/purchase-requests')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-xl"><Layers className="w-4 h-4 text-blue-600" /></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ใบขอซื้อทั้งหมด</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{dashboardStats.totalPRs}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-blue-600 font-bold">PRP {dashboardStats.projectCount}</span>
              <span className="text-[10px] text-purple-600 font-bold">PRS {dashboardStats.subCount}</span>
              <span className="text-[10px] text-gray-500 font-bold">PRO {dashboardStats.otherCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className={`border shadow-sm rounded-2xl hover:shadow-md transition-shadow cursor-pointer ${dashboardStats.pendingCount > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-white'}`} onClick={() => navigate('/purchase-requests/approval')}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${dashboardStats.pendingCount > 0 ? 'bg-amber-100' : 'bg-gray-50'}`}>
                <Clock className={`w-4 h-4 ${dashboardStats.pendingCount > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">รออนุมัติ</span>
            </div>
            <p className={`text-3xl font-black ${dashboardStats.pendingCount > 0 ? 'text-amber-600' : 'text-gray-300'}`}>{dashboardStats.pendingCount}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-2">วงเงิน {formatCurrency(dashboardStats.pendingAmount)}</p>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-xl"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">อนุมัติแล้ว</span>
            </div>
            <p className="text-3xl font-black text-emerald-600">{dashboardStats.approvedCount}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-2">วงเงิน {formatCurrency(dashboardStats.approvedAmount)}</p>
          </CardContent>
        </Card>

        {/* Rejected */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-50 rounded-xl"><XCircle className="w-4 h-4 text-red-500" /></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ปฏิเสธ</span>
            </div>
            <p className={`text-3xl font-black ${dashboardStats.rejectedCount > 0 ? 'text-red-500' : 'text-gray-300'}`}>{dashboardStats.rejectedCount}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-2">ใบขอซื้อที่ถูกปฏิเสธ</p>
          </CardContent>
        </Card>
      </div>

      {/* === Row 2: Financial + Projects + Procurement Status === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Amount */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl"><TrendingUp className="w-4 h-4 text-white" /></div>
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">ยอดจัดซื้อรวม</span>
            </div>
            <p className="text-3xl font-black">{formatCurrency(dashboardStats.totalAmount)}</p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20">
              <div>
                <p className="text-[10px] text-blue-200 font-bold">อนุมัติ</p>
                <p className="text-sm font-black">{formatCurrency(dashboardStats.approvedAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-200 font-bold">รออนุมัติ</p>
                <p className="text-sm font-black">{formatCurrency(dashboardStats.pendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/projects')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-50 rounded-xl"><Building2 className="w-4 h-4 text-indigo-600" /></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">โครงการ</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{dashboardStats.projectsCount}</p>
            <p className="text-xs text-gray-400 font-medium mt-2">โครงการในระบบ</p>
            <div className="flex items-center gap-1 mt-3 text-indigo-600">
              <span className="text-xs font-bold">จัดการโครงการ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </CardContent>
        </Card>

        {/* Procurement Status */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/purchase-requests/sub')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-50 rounded-xl"><Package className="w-4 h-4 text-orange-600" /></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">สถานะจัดซื้อ</span>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-black text-emerald-600">{dashboardStats.purchasedCount}</p>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">ซื้อแล้ว</p>
              </div>
              <div className="w-px h-10 bg-gray-100"></div>
              <div>
                <p className={`text-2xl font-black ${dashboardStats.notPurchasedCount > 0 ? 'text-amber-600' : 'text-gray-300'}`}>{dashboardStats.notPurchasedCount}</p>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">รอจัดซื้อ</p>
              </div>
            </div>
            {dashboardStats.approvedSubOtherCount > 0 && (
              <div className="mt-3">
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${(dashboardStats.purchasedCount / dashboardStats.approvedSubOtherCount) * 100}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-1">
                  {dashboardStats.approvedSubOtherCount > 0 ? Math.round((dashboardStats.purchasedCount / dashboardStats.approvedSubOtherCount) * 100) : 0}% ของรายการที่อนุมัติ
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === Row 3: Pending Approvals (for approvers only) === */}
      {canApprovePR && (dashboardStats.pendingCounts.projectPR > 0 || dashboardStats.pendingCounts.subPR > 0 || dashboardStats.pendingCounts.otherPR > 0) && (
        <Card className="border border-amber-200 shadow-sm rounded-2xl bg-amber-50/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-800">รายการรอการอนุมัติของคุณ</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Link to="/purchase-requests/approval">
                <div className={`p-4 rounded-xl text-center transition-all hover:scale-[1.02] ${dashboardStats.pendingCounts.projectPR > 0 ? 'bg-white border border-red-200 shadow-sm' : 'bg-white/50 border border-gray-200'}`}>
                  <p className={`text-2xl font-black ${dashboardStats.pendingCounts.projectPR > 0 ? 'text-red-600' : 'text-gray-300'}`}>{dashboardStats.pendingCounts.projectPR}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1">PR โครงการ</p>
                </div>
              </Link>
              <Link to="/purchase-orders/approval">
                <div className={`p-4 rounded-xl text-center transition-all hover:scale-[1.02] ${dashboardStats.pendingCounts.subPR > 0 ? 'bg-white border border-red-200 shadow-sm' : 'bg-white/50 border border-gray-200'}`}>
                  <p className={`text-2xl font-black ${dashboardStats.pendingCounts.subPR > 0 ? 'text-red-600' : 'text-gray-300'}`}>{dashboardStats.pendingCounts.subPR}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1">PR ย่อย</p>
                </div>
              </Link>
              <Link to="/purchase-requests/approval?type=other">
                <div className={`p-4 rounded-xl text-center transition-all hover:scale-[1.02] ${dashboardStats.pendingCounts.otherPR > 0 ? 'bg-white border border-red-200 shadow-sm' : 'bg-white/50 border border-gray-200'}`}>
                  <p className={`text-2xl font-black ${dashboardStats.pendingCounts.otherPR > 0 ? 'text-red-600' : 'text-gray-300'}`}>{dashboardStats.pendingCounts.otherPR}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1">PR อื่นๆ</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === Row 4: Quick Create Buttons === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/purchase-requests/new/project" className="group">
          <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white hover:border-blue-300 hover:shadow-md transition-all h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">สร้าง PR โครงการ</p>
                <p className="text-[11px] text-gray-400 mt-0.5">ใบขอซื้อวัสดุก่อสร้าง</p>
              </div>
              <Plus className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/purchase-requests/new/sub" className="group">
          <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white hover:border-purple-300 hover:shadow-md transition-all h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">สร้าง PR ย่อย</p>
                <p className="text-[11px] text-gray-400 mt-0.5">งานระบบ / รับเหมาช่วง</p>
              </div>
              <Plus className="w-4 h-4 text-gray-300 group-hover:text-purple-600 transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/purchase-requests/new/other" className="group">
          <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white hover:border-gray-300 hover:shadow-md transition-all h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">สร้าง PR อื่นๆ</p>
                <p className="text-[11px] text-gray-400 mt-0.5">อุปกรณ์สำนักงาน / เบ็ดเตล็ด</p>
              </div>
              <Plus className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* === Row 5: Recent PRs Table === */}
      <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b border-gray-50 py-5 px-6 flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <CardTitle className="text-sm font-bold text-gray-900">รายการใบขอซื้อล่าสุด</CardTitle>
            <Badge className="bg-gray-100 text-gray-500 border-none font-bold px-2 py-0.5 text-[10px]">{recentPRs.length}</Badge>
          </div>
          <Link to="/purchase-requests">
            <Button variant="ghost" className="text-blue-600 font-bold hover:bg-blue-50 rounded-xl px-4 h-8 text-xs">
              ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 font-bold text-[11px]">
                  <th className="py-3 px-6 text-left">เลข PR</th>
                  <th className="py-3 px-6 text-left">โครงการ / ประเภท</th>
                  <th className="py-3 px-6 text-left">ผู้ขอซื้อ</th>
                  <th className="py-3 px-6 text-left">วันที่</th>
                  <th className="py-3 px-6 text-right">จำนวนเงิน</th>
                  <th className="py-3 px-6 text-left">สถานะ</th>
                  <th className="py-3 px-6 text-left">จัดซื้อ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentPRs.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-gray-400 font-medium text-sm">ไม่มีข้อมูลใบขอซื้อ</td></tr>
                ) : (
                  paginatedPRs.map((pr) => (
                    <tr key={pr.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/purchase-requests/${pr.id}`)}>
                      <td className="py-3.5 px-6 font-bold text-blue-600">{pr.pr_number}</td>
                      <td className="py-3.5 px-6">
                        <p className="font-medium text-gray-900 text-sm leading-tight">{pr.project}</p>
                        <span className={`inline-block text-[10px] font-bold mt-0.5 px-1.5 py-0.5 rounded ${
                          pr.rawType === 'project' ? 'bg-blue-50 text-blue-600' :
                          pr.rawType === 'sub' ? 'bg-purple-50 text-purple-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>{pr.projectType}</span>
                      </td>
                      <td className="py-3.5 px-6 text-gray-600 font-medium">{pr.requester}</td>
                      <td className="py-3.5 px-6 text-gray-500">{pr.date}</td>
                      <td className="py-3.5 px-6 text-right font-bold text-gray-900">฿{pr.amount.toLocaleString()}</td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          pr.statusColor === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          pr.statusColor === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            pr.statusColor === 'warning' ? 'bg-amber-500' :
                            pr.statusColor === 'success' ? 'bg-emerald-500' :
                            'bg-red-500'
                          }`}></span>
                          {pr.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        {pr.rawStatus === 'approved' && (pr.rawType === 'sub' || pr.rawType === 'other') ? (
                          pr.procurement_status === 'purchased' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              ซื้อแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              รอจัดซื้อ
                            </span>
                          )
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, recentPRs.length)} จาก {recentPRs.length} รายการ
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-3 rounded-lg text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> ก่อนหน้า
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
                        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-xs">...</span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 p-0 rounded-lg text-xs ${
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
                  className="h-8 px-3 rounded-lg text-xs"
                >
                  ถัดไป <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
