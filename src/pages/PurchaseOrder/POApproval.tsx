import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Check, 
  X, 
  FileText, 
  ChevronRight,
  Printer,
  Loader2,
  Clock,
  ShoppingCart,
  AlertTriangle,
  Building2,
  User,
  DollarSign,
  History,
  ChevronDown,
  ChevronUp,
  Download,
  Paperclip,
  MapPin
} from 'lucide-react';
import { prService } from '@/services/api';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function POApproval() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subPRs, setSubPRs] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [budgetInfo, setBudgetInfo] = useState<{ budget: number; spent: number; percentage: number } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'approved' | 'rejected' | null }>({ open: false, action: null });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // โหลดเฉพาะ PR Sub ที่รออนุมัติ
      const prData = await prService.getAll('type = "sub" && status = "pending"');
      setSubPRs(prData);
      
      if (prData.length > 0) {
        handleSelectItem(prData[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectItem(item: any) {
    setSelectedItem(item);
    try {
      const prItems = await prService.getItems(item.id);
      setItems(prItems);
      
      // Load budget info if project exists
      if (item.expand?.project?.id) {
        const projectBudget = item.expand.project.budget || 0;
        const totalSpent = await prService.getProjectTotalSpent(item.expand.project.id);
        const percentage = projectBudget > 0 ? Math.round((totalSpent / projectBudget) * 100) : 0;
        setBudgetInfo({
          budget: projectBudget,
          spent: totalSpent,
          percentage: Math.min(percentage, 100)
        });
      } else {
        setBudgetInfo(null);
      }
      
      // Load edit history from pr_history collection
      try {
        const history = await prService.getHistory(item.id);
        
        if (history.length === 0) {
          const createdDate = item.created;
          const requesterName = item.expand?.requester?.name || item.expand?.requester?.email || 'ไม่ระบุ';
          setEditHistory([
            { 
              date: createdDate || new Date().toISOString(), 
              action: 'สร้าง PR Sub ครั้งแรก', 
              by: requesterName 
            },
            { 
              date: item.updated || new Date().toISOString(), 
              action: 'ส่งอนุมัติ (รอการอนุมัติ)', 
              by: requesterName 
            }
          ]);
        } else {
          const historyData = history.map((h: any) => ({
            date: h.created,
            action: h.action,
            by: h.expand?.by?.name || h.expand?.by?.email || 'ไม่ระบุ',
            oldAttachments: h.old_attachments || []
          }));
          
          const hasCreateAction = historyData.some((h: any) => h.action === 'สร้าง PR Sub');
          if (!hasCreateAction) {
            const createdDate = item.created;
            const requesterName = item.expand?.requester?.name || item.expand?.requester?.email || 'ไม่ระบุ';
            historyData.push({
              date: createdDate || new Date().toISOString(),
              action: 'สร้าง PR Sub',
              by: requesterName,
              oldAttachments: []
            });
          }
          
          historyData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setEditHistory(historyData);
        }
      } catch (err) {
        const createdDate = item.created;
        const requesterName = item.expand?.requester?.name || item.expand?.requester?.email || 'ไม่ระบุ';
        setEditHistory([
          { 
            date: createdDate || new Date().toISOString(), 
            action: 'สร้าง PR Sub ครั้งแรก', 
            by: requesterName,
            oldAttachments: []
          },
          { 
            date: item.updated || new Date().toISOString(), 
            action: 'ส่งอนุมัติ (รอการอนุมัติ)', 
            by: requesterName,
            oldAttachments: []
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
      setEditHistory([]);
      setBudgetInfo(null);
    }
  }

  const handleActionClick = (action: 'approved' | 'rejected') => {
    if (!selectedItem) return;
    setConfirmDialog({ open: true, action });
  };

  const handleConfirmAction = async () => {
    if (!selectedItem || !confirmDialog.action) return;
    setSubmitting(true);
    
    try {
      const oldAttachments = confirmDialog.action === 'rejected' ? selectedItem.attachments : undefined;
      
      if (confirmDialog.action === 'approved') {
        // อนุมัติ PR Sub พร้อมตัด stock
        await prService.approveSub(selectedItem.id, user?.id, comment, oldAttachments);
        toast.success('อนุมัติใบขอซื้อย่อยเรียบร้อยแล้ว (ตัด stock จากโครงการแล้ว)');
      } else {
        await prService.updateStatus(selectedItem.id, 'rejected', comment, user?.id, oldAttachments);
        toast.success('ตีกลับใบขอซื้อย่อยเรียบร้อยแล้ว');
      }
      
      setComment('');
      setConfirmDialog({ open: false, action: null });
      await loadData();
    } catch (err) {
      toast.error('ดำเนินการไม่สำเร็จ');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Get file URL for download
  const getFileUrl = (recordId: string, filename: string) => {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${recordId}/${filename}`;
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-purple-600" /></div>;

  if (subPRs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <div className="p-4 bg-gray-100 rounded-full mb-4"><Check className="h-12 w-12" /></div>
        <h2 className="text-xl font-bold">ไม่มีรายการรออนุมัติ</h2>
        <p>คุณจัดการทุกรายการเรียบร้อยแล้วค่ะ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">รายการรออนุมัติ (PR Sub)</h1>
          <p className="text-sm text-gray-500 mt-1">พบ {subPRs.length} รายการที่ต้องการการตัดสินใจ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - List */}
        <div className="lg:col-span-1">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-50">
              {subPRs.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => handleSelectItem(pr)}
                  className={`p-5 cursor-pointer hover:bg-[#F9FAFB] transition-all ${
                    selectedItem?.id === pr.id ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-purple-600">{pr.pr_number}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {pr.created ? new Date(pr.created).toLocaleDateString('th-TH', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        }) : 'ไม่ระบุวันที่'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                  <p className="font-bold text-[#1F2937] text-sm mb-3 truncate">{pr.expand?.project?.name || 'รายการทั่วไป'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3.5 h-3.5" />
                      <span>{pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ'}</span>
                    </div>
                    <p className="font-bold text-gray-900">฿{pr.total_amount?.toLocaleString() || 0}</p>
                  </div>
                  {pr.attachments && pr.attachments.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-purple-600">
                      <Paperclip className="w-3 h-3" />
                      <span>{pr.attachments.length} ไฟล์แนบ</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right - Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedItem && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 py-6 px-8 flex flex-row items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">รายละเอียดใบขอซื้อย่อย</p>
                  <CardTitle className="text-2xl font-bold text-[#1F2937]">{selectedItem.pr_number}</CardTitle>
                </div>
                <Badge className="bg-yellow-50 text-yellow-700 font-bold border-none px-4 py-1.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5 mr-2" /> Waiting Approval
                </Badge>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Building2 className="w-3 h-3" /> โครงการ (Project)
                      </h4>
                      <p className="font-bold text-[#1F2937] text-lg">
                        {selectedItem.expand?.project?.code && (
                          <span className="text-purple-600 mr-2">[{selectedItem.expand.project.code}]</span>
                        )}
                        {selectedItem.expand?.project?.name || 'รายการจัดซื้อทั่วไป'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{selectedItem.expand?.project?.location || 'สำนักงานใหญ่'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ยอดเงินรวมสุทธิ</h4>
                    <p className="text-3xl font-black text-purple-600">฿{selectedItem.total_amount?.toLocaleString() || 0}.00</p>
                    <p className="text-xs text-gray-500 mt-2">
                      สร้างโดย: {selectedItem.expand?.requester?.name || selectedItem.expand?.requester?.email || 'ไม่ระบุ'}
                    </p>
                    <p className="text-xs text-gray-400">
                      วันที่สร้าง: {selectedItem.created ? new Date(selectedItem.created).toLocaleDateString('th-TH') : '-'}
                    </p>
                  </div>
                </div>

                {/* Budget Status */}
                {budgetInfo && budgetInfo.budget > 0 && (
                  <div className="mb-10 p-6 bg-gray-50 rounded-2xl">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <DollarSign className="w-3 h-3" /> งบประมาณโครงการ (Budget Status)
                    </h4>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-2xl font-black text-gray-900">{budgetInfo.percentage}% Used</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Left: {(budgetInfo.budget - budgetInfo.spent).toLocaleString()} THB</p>
                        <p className="text-xs text-gray-400">Budget: {budgetInfo.budget.toLocaleString()} THB</p>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          budgetInfo.percentage >= 90 ? 'bg-red-500' : 
                          budgetInfo.percentage >= 70 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${budgetInfo.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Edit History */}
                {editHistory.length > 0 && (
                  <div className="mb-10 p-6 bg-purple-50/50 rounded-2xl border border-purple-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                        <History className="w-3 h-3" /> 
                        ประวัติการดำเนินการ 
                        <span className="bg-purple-400 text-white px-2 py-0.5 rounded-full text-[10px]">
                          {editHistory.length} รายการ
                        </span>
                      </h4>
                      {editHistory.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryExpanded(!historyExpanded)}
                          className="text-purple-400 hover:text-purple-600 hover:bg-purple-100"
                        >
                          {historyExpanded ? (
                            <><ChevronUp className="w-4 h-4 mr-1" /> ย่อ</>
                          ) : (
                            <><ChevronDown className="w-4 h-4 mr-1" /> ขยาย ({editHistory.length - 3} รายการ)</>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {(historyExpanded ? editHistory : editHistory.slice(0, 3)).map((history, index) => (
                        <div key={index} className="bg-white p-4 rounded-xl border border-purple-100">
                          <div className="flex items-start gap-3 text-sm">
                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                              index === 0 ? 'bg-green-500' : 'bg-purple-500'
                            }`} />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{history.action}</p>
                              <p className="text-xs text-gray-500">
                                {history.date && !isNaN(new Date(history.date).getTime())
                                  ? new Date(history.date).toLocaleString('th-TH', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'ไม่ระบุวันที่'} โดย {history.by}
                              </p>
                            </div>
                          </div>
                          {history.oldAttachments && history.oldAttachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" /> เอกสารแนบก่อนหน้า ({history.oldAttachments.length} ไฟล์)
                              </p>
                              <div className="space-y-2">
                                {history.oldAttachments.map((file: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={getFileUrl(selectedItem?.id, file)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs hover:bg-purple-50 transition-colors"
                                  >
                                    <FileText className="w-3 h-3 text-red-500" />
                                    <span className="flex-1 truncate">{file}</span>
                                    <Download className="w-3 h-3 text-gray-400" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Attachments */}
                {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4 bg-green-50 p-4 rounded-xl border border-green-200">
                      <Paperclip className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-700">เอกสารแนบปัจจุบัน (ล่าสุด)</span>
                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {selectedItem.attachments.length} ไฟล์
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedItem.attachments.map((file: string, index: number) => (
                        <a
                          key={index}
                          href={getFileUrl(selectedItem.id, file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all group"
                        >
                          <div className="p-3 bg-green-100 rounded-xl">
                            <FileText className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate group-hover:text-green-600">{file}</p>
                            <p className="text-xs text-green-600 font-medium">เอกสารล่าสุด - คลิกเพื่อดาวน์โหลด</p>
                          </div>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-600">
                            <Download className="h-5 w-5" />
                          </Button>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Old Attachments from History */}
                {(() => {
                  const allOldAttachments: string[] = [];
                  editHistory.forEach((h: any) => {
                    if (h.oldAttachments && h.oldAttachments.length > 0) {
                      allOldAttachments.push(...h.oldAttachments);
                    }
                  });
                  
                  if (allOldAttachments.length === 0) return null;
                  
                  return (
                    <div className="mb-10">
                      <div className="flex items-center gap-2 mb-4 bg-orange-50 p-4 rounded-xl border border-orange-200">
                        <History className="w-5 h-5 text-orange-600" />
                        <span className="font-bold text-orange-700">เอกสารแนบก่อนหน้า (เก่า)</span>
                        <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {allOldAttachments.length} ไฟล์
                        </span>
                      </div>
                      <div className="space-y-3">
                        {allOldAttachments.map((file: string, index: number) => (
                          <a
                            key={index}
                            href={getFileUrl(selectedItem?.id, file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all group opacity-80"
                          >
                            <div className="p-3 bg-orange-100 rounded-xl">
                              <FileText className="h-6 w-6 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-600 truncate group-hover:text-orange-600">{file}</p>
                              <p className="text-xs text-orange-500">เอกสารเก่า - คลิกเพื่อดาวน์โหลด</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-orange-600">
                              <Download className="h-5 w-5" />
                            </Button>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Items Table */}
                <div className="mb-10">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> รายการสินค้าและบริการ
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                          <th className="py-3 px-4 text-center w-16">ลำดับ</th>
                          <th className="py-3 px-4 text-left font-bold">รายการ</th>
                          <th className="py-3 px-4 text-center w-24">จำนวน</th>
                          <th className="py-3 px-4 text-right w-28">ราคา/หน่วย</th>
                          <th className="py-3 px-4 text-right w-28">ยอดรวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-4 px-4 text-center text-gray-500">{idx + 1}</td>
                            <td className="py-4 px-4">
                              <p className="font-bold text-gray-900">{item.name}</p>
                            </td>
                            <td className="py-4 px-4 text-center font-bold">{item.quantity}</td>
                            <td className="py-4 px-4 text-right">{item.unit_price?.toLocaleString()}</td>
                            <td className="py-4 px-4 text-right font-black text-gray-900">{item.total_price?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Comment */}
                <div className="mb-10">
                  <Label className="text-sm font-bold text-gray-700 mb-3 block">
                    ความเห็น/เหตุผลประกอบการตัดสินใจ
                  </Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="ระบุเหตุผลในการอนุมัติหรือตีกลับ..."
                    className="rounded-xl bg-gray-50 border-none min-h-[100px]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleActionClick('rejected')}
                    disabled={submitting}
                    className="flex-1 h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg"
                  >
                    <X className="w-5 h-5 mr-2" />
                    ตีกลับไปแก้ไข (Reject)
                  </Button>
                  <Button
                    onClick={() => handleActionClick('approved')}
                    disabled={submitting}
                    className="flex-1 h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg shadow-green-500/25"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    {submitting ? 'กำลังดำเนินการ...' : 'อนุมัติใบขอซื้อ (Approve)'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              {confirmDialog.action === 'approved' ? (
                <Check className="w-8 h-8 text-green-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              )}
            </div>
            <DialogTitle className="text-xl font-bold text-center">
              {confirmDialog.action === 'approved' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการตีกลับ'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {confirmDialog.action === 'approved' 
                ? 'คุณต้องการอนุมัติใบขอซื้อนี้ใช่หรือไม่?'
                : 'คุณต้องการตีกลับใบขอซื้อนี้ใช่หรือไม่?'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="py-4 text-center border-t border-b border-gray-100 my-4">
              <p className="text-xl font-black text-gray-900">{selectedItem.pr_number}</p>
              <p className="text-sm text-gray-600 mt-1">โครงการ: {selectedItem.expand?.project?.name || 'ไม่ระบุ'}</p>
              <p className="text-lg font-bold text-blue-600 mt-2">จำนวนเงิน: ฿{selectedItem.total_amount?.toLocaleString() || 0}</p>
              {confirmDialog.action === 'approved' && (
                <p className="text-xs text-gray-500 mt-2">ระบบจะตัด stock จากโครงการโดยอัตโนมัติ</p>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-3">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ open: false, action: null })}
              className="flex-1 h-12 rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleConfirmAction}
              disabled={submitting}
              className={`flex-1 h-12 rounded-xl font-bold ${
                confirmDialog.action === 'approved' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : confirmDialog.action === 'approved' ? (
                <><Check className="w-4 h-4 mr-2" /> ยืนยันอนุมัติ</>
              ) : (
                <><X className="w-4 h-4 mr-2" /> ยืนยันตีกลับ</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
