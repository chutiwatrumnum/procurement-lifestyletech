import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Building2, 
  Package, 
  FileText, 
  DollarSign,
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useProjectDetail } from '@/hooks/useProjects';

interface WithdrawDetail {
  pr_number: string;
  quantity: number;
  unit_price: number;
  total: number;
  date: string;
}

interface ReserveItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  pr_number: string;
  created: string;
}

interface ProjectItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  initial_quantity?: number;
  unit_price: number;
  total_price: number;
  withdrawn: number;
  withdrawnDetails: WithdrawDetail[];
}

interface PRProject {
  id: string;
  pr_number: string;
  attachments: string[];
  total_amount: number;
  created: string;
}

interface PRSub {
  id: string;
  pr_number: string;
  attachments: string[];
  total_amount: number;
  created: string;
  status: string;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const { data, isLoading: loading } = useProjectDetail(id);

  const project = data?.project;
  const projectItems = data?.projectItems || [];
  const reserveItems = data?.reserveItems || [];
  const reserveTotal = data?.reserveTotal || 0;
  const prProjects = data?.prProjects || [];
  const prSubs = data?.prSubs || [];
  const stats = data?.stats || { totalPlanned: 0, totalWithdrawn: 0, remaining: 0, totalReserve: 0 };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getFileUrl = (recordId: string, filename: string) => {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${recordId}/${filename}`;
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-gray-500">
        <p>ไม่พบข้อมูลโครงการ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            </div>
            <p className="text-sm text-gray-500">#{project.code} · {project.location || 'ไม่ระบุสถานที่'}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="rounded-xl"
            onClick={() => navigate(`/projects/edit/${id}`)}
          >
            แก้ไขโครงการ
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
            onClick={() => navigate(`/purchase-requests/new/project?project=${id}`)}
          >
            <FileText className="w-4 h-4 mr-2" />
            สร้าง PR ใหม่
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm rounded-2xl bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">งบประมาณแผน</p>
                <p className="text-2xl font-black text-blue-600">฿{stats.totalPlanned.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">เบิกจ่ายไปแล้ว</p>
                <p className="text-2xl font-black text-orange-600">฿{stats.totalWithdrawn.toLocaleString()}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">คงเหลือ</p>
                <p className="text-2xl font-black text-green-600">฿{stats.remaining.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="rounded-xl bg-white border p-1">
          <TabsTrigger value="items" className="rounded-lg">
            <Package className="w-4 h-4 mr-2" />
            อุปกรณ์/สต็อก ({projectItems.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg">
            <FileText className="w-4 h-4 mr-2" />
            เอกสาร PR Project ({prProjects.length})
          </TabsTrigger>
          <TabsTrigger value="prsub" className="rounded-lg">
            <FileText className="w-4 h-4 mr-2" />
            เอกสาร PR Sub ({prSubs.length})
          </TabsTrigger>
          <TabsTrigger value="reserve" className="rounded-lg">
            <Package className="w-4 h-4 mr-2" />
            สำรอง ({reserveItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-6">
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                รายการอุปกรณ์ (แผน vs เบิกจริง)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {projectItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>ยังไม่มีรายการอุปกรณ์ในแผน</p>
                  <p className="text-sm text-gray-400">สร้าง PR Project เพื่อเพิ่มรายการ</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="py-4 px-6 text-left font-bold uppercase text-[10px] tracking-wider">รายการ</th>
                        <th className="py-4 px-6 text-center font-bold uppercase text-[10px] tracking-wider">แผน (จำนวน)</th>
                        <th className="py-4 px-6 text-center font-bold uppercase text-[10px] tracking-wider">เบิกจริง</th>
                        <th className="py-4 px-6 text-center font-bold uppercase text-[10px] tracking-wider">คงเหลือ</th>
                        <th className="py-4 px-6 text-right font-bold uppercase text-[10px] tracking-wider">ราคาต่อหน่วย</th>
                        <th className="py-4 px-6 text-right font-bold uppercase text-[10px] tracking-wider">มูลค่ารวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {projectItems.map((item) => (
                        <>
                          <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => item.withdrawn > 0 && toggleExpand(item.id)}>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                {item.withdrawn > 0 && (
                                  expandedItems[item.id] ? 
                                    <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                                <div>
                                  <p className="font-bold text-gray-900">{item.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <p className="font-black text-blue-600">{item.initial_quantity || item.quantity}</p>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <p className={`font-bold ${item.withdrawn > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                {item.withdrawn}
                              </p>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <p className={`font-bold ${
                                (item.initial_quantity || item.quantity) - item.withdrawn < 0 ? 'text-red-600' : 
                                (item.initial_quantity || item.quantity) - item.withdrawn <= 5 ? 'text-orange-600' : 
                                'text-green-600'
                              }`}>
                                {(item.initial_quantity || item.quantity) - item.withdrawn}
                              </p>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <p className="font-medium text-gray-600">฿{item.unit_price?.toLocaleString() || 0}</p>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <p className="font-black text-gray-900">฿{item.total_price?.toLocaleString() || 0}</p>
                            </td>
                          </tr>
                          
                          {/* Expanded details of withdrawals */}
                          {expandedItems[item.id] && item.withdrawnDetails.length > 0 && (
                            <tr className="bg-orange-50/50">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">รายละเอียดการเบิก ({item.withdrawnDetails.length} รายการ)</p>
                                  <div className="grid grid-cols-4 gap-4 text-xs font-bold text-gray-500 uppercase mb-2">
                                    <span>เลขที่ PR</span>
                                    <span className="text-right">จำนวน</span>
                                    <span className="text-right">ราคา/หน่วย</span>
                                    <span className="text-right">มูลค่ารวม</span>
                                  </div>
                                  {item.withdrawnDetails.map((detail: any, idx: number) => (
                                    <div key={idx} className="grid grid-cols-4 gap-4 text-sm py-2 border-t border-orange-100">
                                      <span className="font-medium text-gray-700">{detail.pr_number}</span>
                                      <span className="text-right font-bold text-orange-600">{detail.quantity}</span>
                                      <span className="text-right text-gray-600">฿{detail.unit_price.toLocaleString()}</span>
                                      <span className="text-right font-bold text-gray-900">฿{detail.total.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                เอกสารใบขอซื้อโครงการ (PR Project)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prProjects.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>ยังไม่มีเอกสาร PR Project</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prProjects.map((pr) => (
                    <div key={pr.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-blue-600">{pr.pr_number}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(pr.created).toLocaleDateString('th-TH')} · 
                            ฿{pr.total_amount?.toLocaleString() || 0}
                          </p>
                        </div>
                        <Badge className="bg-green-50 text-green-700">อนุมัติแล้ว</Badge>
                      </div>
                      
                      {pr.attachments && pr.attachments.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">ไฟล์แนบ ({pr.attachments.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {pr.attachments.map((file: string, idx: number) => (
                              <a
                                key={idx}
                                href={getFileUrl(pr.id, file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="max-w-[200px] truncate">{file}</span>
                                <Download className="w-3 h-3 ml-1" />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">ไม่มีไฟล์แนบ</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prsub" className="mt-6">
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                เอกสารใบขอซื้อย่อย (PR Sub)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prSubs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>ยังไม่มีเอกสาร PR Sub</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prSubs.map((pr) => (
                    <div key={pr.id} className="p-4 border border-gray-100 rounded-xl bg-orange-50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-orange-600">{pr.pr_number}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(pr.created).toLocaleDateString('th-TH')} · 
                            ฿{pr.total_amount?.toLocaleString() || 0}
                          </p>
                        </div>
                        <Badge className={pr.status === 'approved' ? 'bg-green-50 text-green-700' : pr.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}>
                          {pr.status === 'approved' ? 'อนุมัติแล้ว' : pr.status === 'rejected' ? 'ไม่อนุมัติ' : 'รออนุมัติ'}
                        </Badge>
                      </div>
                      
                      {pr.attachments && pr.attachments.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">ไฟล์แนบ ({pr.attachments.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {pr.attachments.map((file: string, idx: number) => (
                              <a
                                key={idx}
                                href={getFileUrl(pr.id, file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-orange-400 hover:text-orange-600 transition-colors text-sm"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="max-w-[200px] truncate">{file}</span>
                                <Download className="w-3 h-3 ml-1" />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">ไม่มีไฟล์แนบ</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reserve" className="mt-6">
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                รายการสำรอง (ไม่หักจาก Stock)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {reserveItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>ยังไม่มีรายการสำรอง</p>
                  <p className="text-sm text-gray-400">สร้าง PR Sub และเลือกประเภท "สำรอง" เพื่อเพิ่มรายการ</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="py-4 px-6 text-left font-bold uppercase text-[10px] tracking-wider">รายการ</th>
                        <th className="py-4 px-6 text-center font-bold uppercase text-[10px] tracking-wider">จำนวน</th>
                        <th className="py-4 px-6 text-center font-bold uppercase text-[10px] tracking-wider">หน่วย</th>
                        <th className="py-4 px-6 text-right font-bold uppercase text-[10px] tracking-wider">ราคาต่อหน่วย</th>
                        <th className="py-4 px-6 text-right font-bold uppercase text-[10px] tracking-wider">รวม</th>
                        <th className="py-4 px-6 text-left font-bold uppercase text-[10px] tracking-wider">เลข PR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reserveItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-4 px-6">
                            <p className="font-bold text-gray-900">{item.name}</p>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <p className="font-bold text-purple-600">{item.quantity}</p>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <p className="text-gray-600">{item.unit}</p>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <p className="font-medium text-gray-600">฿{item.unit_price.toLocaleString()}</p>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <p className="font-black text-purple-600">฿{item.total_price.toLocaleString()}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-xs text-gray-500">{item.pr_number}</p>
                            <p className="text-xs text-gray-400">{new Date(item.created).toLocaleDateString('th-TH')}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-6 bg-purple-50 flex justify-end">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">รวมมูลค่าสำรอง</p>
                      <p className="text-4xl font-black text-purple-600 tracking-tighter">฿{reserveTotal.toLocaleString()}</p>
                      <p className="text-xs text-gray-400 mt-2">*ไม่รวมในงบประมาณโครงการ</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
