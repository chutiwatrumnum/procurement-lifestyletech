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
  Building2,
  User,
  DollarSign,
  ChevronRight,
  Clock,
  Loader2,
  Download,
  Paperclip,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp
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

export default function PRApproval() {
  const { user } = useAuth();
  const [pendingPRs, setPendingPRs] = useState<any[]>([]);
  const [selectedPR, setSelectedPR] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [budgetInfo, setBudgetInfo] = useState<{ budget: number; spent: number; percentage: number } | null>(null);
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'approved' | 'rejected' | null }>({ open: false, action: null });

  useEffect(() => {
    loadPRs();
  }, []);

  async function loadPRs() {
    setLoading(true);
    try {
      const data = await prService.getAll('status = "pending"');
      setPendingPRs(data);
      if (data.length > 0) {
        handleSelectPR(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPR(pr: any) {
    setSelectedPR(pr);
    try {
      const prItems = await prService.getItems(pr.id);
      setItems(prItems);
      
      // Load budget info if project exists
      if (pr.expand?.project?.id) {
        const projectBudget = pr.expand.project.budget || 0;
        const totalSpent = await prService.getProjectTotalSpent(pr.expand.project.id);
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
        const history = await prService.getHistory(pr.id);
        
        // If no history records, create from PR data
        if (history.length === 0) {
          const createdDate = pr.created;
          const requesterName = pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ';
          setEditHistory([
            { 
              date: createdDate || new Date().toISOString(), 
              action: 'สร้าง PR ครั้งแรก', 
              by: requesterName 
            },
            { 
              date: pr.updated || new Date().toISOString(), 
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
          
          // Check if 'สร้าง PR' is in history, if not add it
          const hasCreateAction = historyData.some((h: any) => h.action === 'สร้าง PR');
          if (!hasCreateAction) {
            const createdDate = pr.created;
            const requesterName = pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ';
            historyData.push({
              date: createdDate || new Date().toISOString(),
              action: 'สร้าง PR',
              by: requesterName,
              oldAttachments: []
            });
          }
          
          // Sort by date ascending (oldest first)
          historyData.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          setEditHistory(historyData);
        }
      } catch (err) {
        // Fallback to mock data if history not available
        const createdDate = pr.created;
        const requesterName = pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ';
        setEditHistory([
          { 
            date: createdDate || new Date().toISOString(), 
            action: 'สร้าง PR ครั้งแรก', 
            by: requesterName,
            oldAttachments: []
          },
          { 
            date: pr.updated || new Date().toISOString(), 
            action: 'ส่งอนุมัติ (รอการอนุมัติ)', 
            by: requesterName,
            oldAttachments: []
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setBudgetInfo(null);
      setEditHistory([]);
    }
  }

  const handleActionClick = (action: 'approved' | 'rejected') => {
    if (!selectedPR) return;
    setConfirmDialog({ open: true, action });
  };

  const handleConfirmAction = async () => {
    if (!selectedPR || !confirmDialog.action) return;
    setSubmitting(true);
    try {
      // If rejecting, save current attachments to history
      const oldAttachments = confirmDialog.action === 'rejected' ? selectedPR.attachments : undefined;
      await prService.updateStatus(selectedPR.id, confirmDialog.action, comment, user?.id, oldAttachments);
      toast.success(confirmDialog.action === 'approved' ? 'อนุมัติเรียบร้อยแล้ว' : 'ตีกลับเรียบร้อยแล้ว');
      setComment('');
      setConfirmDialog({ open: false, action: null });
      await loadPRs();
    } catch (err) {
      toast.error('ดำเนินการไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  // Get file URL for download
  const getFileUrl = (recordId: string, filename: string) => {
    return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/pbc_3482049810/${recordId}/${filename}`;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
  }

  if (pendingPRs.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">รายการรออนุมัติ (Pending PR List)</h1>
          <p className="text-sm text-gray-500 mt-1">พบ {pendingPRs.length} รายการที่ต้องการการตัดสินใจ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - PR List */}
        <div className="lg:col-span-1">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-50">
              {pendingPRs.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => handleSelectPR(pr)}
                  className={`p-5 cursor-pointer hover:bg-[#F9FAFB] transition-all ${
                    selectedPR?.id === pr.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-blue-600">{pr.pr_number}</p>
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
                  {pr.po_ref && (
                    <p className="text-xs text-gray-500 mb-2">อ้างอิง: {pr.po_ref}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3.5 h-3.5" />
                      <span>{pr.expand?.requester?.name || pr.expand?.requester?.email || 'ไม่ระบุ'}</span>
                    </div>
                    <p className="font-bold text-gray-900">฿{pr.total_amount?.toLocaleString() || 0}</p>
                  </div>
                  {pr.attachments && pr.attachments.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
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
          {selectedPR && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 py-6 px-8 flex flex-row items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">รายละเอียดใบขอซื้อ</p>
                  <CardTitle className="text-2xl font-bold text-[#1F2937]">{selectedPR.pr_number}</CardTitle>
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
                        {selectedPR.expand?.project?.code && (
                          <span className="text-blue-600 mr-2">[{selectedPR.expand.project.code}]</span>
                        )}
                        {selectedPR.expand?.project?.name || 'รายการจัดซื้อทั่วไป'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{selectedPR.expand?.project?.location || 'สำนักงานใหญ่'}</p>
                      {selectedPR.po_ref && (
                        <p className="text-sm text-blue-600 mt-2 font-medium">อ้างอิง PO: {selectedPR.po_ref}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ยอดเงินรวมสุทธิ</h4>
                    <p className="text-3xl font-black text-blue-600">฿{selectedPR.total_amount?.toLocaleString() || 0}.00</p>
                    <p className="text-xs text-gray-500 mt-2">
                      สร้างโดย: {selectedPR.expand?.requester?.name || selectedPR.expand?.requester?.email || 'ไม่ระบุ'}
                    </p>
                    <p className="text-xs text-gray-400">
                      วันที่สร้าง: {selectedPR.created ? new Date(selectedPR.created).toLocaleDateString('th-TH') : '-'}
                    </p>
                  </div>
                </div>

                {/* Budget Status Section */}
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

                {/* Edit History Section */}
                {editHistory.length > 0 && (
                  <div className="mb-10 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <History className="w-3 h-3" /> 
                        ประวัติการดำเนินการ 
                        <span className="bg-blue-400 text-white px-2 py-0.5 rounded-full text-[10px]">
                          {editHistory.length} รายการ
                        </span>
                      </h4>
                      {editHistory.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistoryExpanded(!historyExpanded)}
                          className="text-blue-400 hover:text-blue-600 hover:bg-blue-100"
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
                        <div key={index} className="bg-white p-4 rounded-xl border border-blue-100">
                          <div className="flex items-start gap-3 text-sm">
                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                              index === 0 ? 'bg-green-500' : 'bg-blue-500'
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
                          {/* Show old attachments if this was a reject action */}
                          {history.oldAttachments && history.oldAttachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" /> เอกสารแนบก่อนหน้า ({history.oldAttachments.length} ไฟล์)
                              </p>
                              <div className="space-y-2">
                                {history.oldAttachments.map((file: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={getFileUrl(selectedPR?.id, file)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs hover:bg-blue-50 transition-colors"
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

                {/* Current Attachments - Latest */}
                {selectedPR.attachments && selectedPR.attachments.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4 bg-green-50 p-4 rounded-xl border border-green-200">
                      <Paperclip className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-700">เอกสารแนบปัจจุบัน (ล่าสุด)</span>
                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {selectedPR.attachments.length} ไฟล์
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedPR.attachments.map((file: string, index: number) => (
                        <a
                          key={index}
                          href={getFileUrl(selectedPR.id, file)}
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

                {/* Old Attachments from History - Previous versions */}
                {(() => {
                  // Find all old attachments from reject history
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
                            href={getFileUrl(selectedPR?.id, file)}
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

                <div className="mb-10">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> รายการสินค้าและบริการ
                  </h4>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F9FAFB] text-[#6B7280]">
                          <th className="py-3 px-4 text-left font-bold uppercase text-[9px] tracking-wider">ลำดับ</th>
                          <th className="py-3 px-4 text-left font-bold uppercase text-[9px] tracking-wider">รายการ</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">จำนวน</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">ราคา/หน่วย</th>
                          <th className="py-3 px-4 text-right font-bold uppercase text-[9px] tracking-wider">ยอดรวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="py-4 px-4 text-gray-400">{idx + 1}</td>
                            <td className="py-4 px-4 font-medium text-gray-900">{item.name}</td>
                            <td className="py-4 px-4 text-right text-gray-600">{item.quantity} {item.unit}</td>
                            <td className="py-4 px-4 text-right text-gray-600">{item.unit_price?.toLocaleString()}</td>
                            <td className="py-4 px-4 text-right font-bold text-gray-900">{item.total_price?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <Label className="text-[#1F2937] font-bold">ความเห็น/เหตุผลประกอบการตัดสินใจ</Label>
                  <Textarea 
                    placeholder="ระบุเหตุผลในการอนุมัติหรือตีกลับ..." 
                    rows={3} 
                    className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-colors"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <Button 
                    className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                    onClick={() => handleActionClick('rejected')}
                    disabled={submitting}
                  >
                    <X className="w-5 h-5 mr-2" /> ตีกลับไปแก้ไข (Reject)
                  </Button>
                  <Button 
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20"
                    onClick={() => handleActionClick('approved')}
                    disabled={submitting}
                  >
                    <Check className="w-5 h-5 mr-2" /> อนุมัติใบขอซื้อ (Approve)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedPR && (
            <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
              <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl">
                <DialogHeader className="space-y-4">
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                    confirmDialog.action === 'approved' ? 'bg-green-100' : 'bg-orange-100'
                  }`}>
                    <AlertTriangle className={`h-8 w-8 ${
                      confirmDialog.action === 'approved' ? 'text-green-600' : 'text-orange-600'
                    }`} />
                  </div>
                  <DialogTitle className="text-center text-xl font-bold text-gray-900">
                    {confirmDialog.action === 'approved' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการตีกลับ'}
                  </DialogTitle>
                  <DialogDescription className="text-center text-gray-500">
                    คุณต้องการ{confirmDialog.action === 'approved' ? 'อนุมัติ' : 'ตีกลับ'}ใบขอซื้อนี้ใช่หรือไม่?
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 px-5 bg-gray-50 rounded-xl space-y-2 my-4">
                  <p className="font-bold text-gray-900 text-lg">{selectedPR.pr_number}</p>
                  <p className="text-sm text-gray-600">โครงการ: {selectedPR.expand?.project?.name || 'ไม่ระบุ'}</p>
                  <p className="text-sm text-gray-600">จำนวนเงิน: <span className="font-bold text-blue-600">฿{selectedPR.total_amount?.toLocaleString() || 0}</span></p>
                  {comment && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-400 mb-1">ความเห็น:</p>
                      <p className="text-sm text-gray-600">{comment}</p>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-3 sm:gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setConfirmDialog({ open: false, action: null })}
                    className="flex-1 rounded-xl h-12 font-bold border-gray-200 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </Button>
                  <Button 
                    onClick={handleConfirmAction}
                    disabled={submitting}
                    className={`flex-1 rounded-xl h-12 font-bold ${
                      confirmDialog.action === 'approved' 
                        ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20' 
                        : 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                    }`}
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : confirmDialog.action === 'approved' ? (
                      <span className="flex items-center"><Check className="w-4 h-4 mr-2" /> ยืนยันอนุมัติ</span>
                    ) : (
                      <span className="flex items-center"><X className="w-4 h-4 mr-2" /> ยืนยันตีกลับ</span>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}
