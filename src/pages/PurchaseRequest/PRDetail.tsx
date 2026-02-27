import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Loader2, 
  Building2, 
  User,
  FileText,
  Download
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePurchaseRequest, usePRItems } from '@/hooks/usePurchaseRequests';

export default function PRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: pr, isLoading: loadingPR } = usePurchaseRequest(id);
  const { data: items = [], isLoading: loadingItems } = usePRItems(id);
  const loading = loadingPR || loadingItems;

  const getFileUrl = (recordId: string, filename: string) => {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${recordId}/${filename}`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-700',
      approved: 'bg-green-50 text-green-700',
      rejected: 'bg-red-50 text-red-700',
      draft: 'bg-gray-50 text-gray-700'
    };
    const labels = {
      pending: 'รออนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ',
      draft: 'ร่าง'
    };
    return (
      <Badge className={`${styles[status as keyof typeof styles] || styles.draft} rounded-full px-4 py-1 font-bold`}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <p className="text-xl font-bold">ไม่พบข้อมูลใบขอซื้อ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">รายละเอียดใบขอซื้อ</h1>
          <p className="text-sm text-gray-500 mt-1 font-bold uppercase tracking-widest">{pr.pr_number}</p>
        </div>
        {getStatusBadge(pr.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Info */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Building2 className="w-5 h-5 text-blue-600" /> ข้อมูลโครงการ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">โครงการ</p>
                <p className="font-bold text-lg">
                  {pr.expand?.project?.code && (
                    <span className="text-blue-600 mr-2">[{pr.expand.project.code}]</span>
                  )}
                  {pr.expand?.project?.name || 'รายการทั่วไป'}
                </p>
              </div>
              {pr.delivery_location && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">สถานที่ส่งของ</p>
                  <p className="text-gray-700">{pr.delivery_location}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-blue-600" /> รายการสินค้า
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                      <th className="py-3 px-4 text-left">รายการ</th>
                      <th className="py-3 px-4 text-right">จำนวน</th>
                      <th className="py-3 px-4 text-right">ราคา/หน่วย</th>
                      <th className="py-3 px-4 text-right">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="py-4 px-4 font-medium">{item.name}</td>
                        <td className="py-4 px-4 text-right">{item.quantity} {item.unit}</td>
                        <td className="py-4 px-4 text-right">{item.unit_price?.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right font-bold">{item.total_price?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-end">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดรวมทั้งหมด</p>
                  <p className="text-3xl font-black text-blue-600">฿{pr.total_amount?.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <User className="w-5 h-5 text-blue-600" /> ผู้ขาย
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pr.expand?.vendor ? (
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">{pr.expand.vendor.name}</p>
                  <p className="font-bold text-blue-900">{pr.expand.vendor.contact_person}</p>
                  <p className="text-sm text-blue-700">{pr.expand.vendor.email}</p>
                  <p className="text-sm text-blue-700">{pr.expand.vendor.phone}</p>
                </div>
              ) : (
                <p className="text-gray-400">ไม่ระบุผู้ขาย</p>
              )}
            </CardContent>
          </Card>

          {/* Requester Info */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">ผู้ขอซื้อ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-bold">{pr.requester_name || pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ'}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(pr.created).toLocaleDateString('th-TH')}</p>
            </CardContent>
          </Card>

          {/* Attachments */}
          {pr.attachments && pr.attachments.length > 0 && (
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4" /> เอกสารแนบ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pr.attachments.map((file: string, index: number) => (
                  <a
                    key={index}
                    href={getFileUrl(pr.id, file)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="flex-1 truncate text-sm">{file}</span>
                    <Download className="h-4 w-4 text-gray-400" />
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl"
              onClick={() => navigate(`/purchase-requests/edit/${pr.id}`)}
            >
              แก้ไขใบขอซื้อ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
