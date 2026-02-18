import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, 
  User, 
  MapPin, 
  Upload, 
  Plus, 
  Trash2,
  FileText,
  Save,
  Send,
  Loader2,
  Paperclip,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { prService, projectService, vendorService } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/pocketbase';

interface LineItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;        // จำนวนเดิม (initial)
  remaining: number;       // จำนวนคงเหลือ
  unit_price: number;
  total_price: number;
  isExisting?: boolean;
  existingId?: string;
  addedQuantity?: number;
}

interface Attachment {
  id: string;
  file: File;
  name: string;
  size: string;
}

export default function PRProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data lists
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  
  // Form state
  const [projectId, setProjectId] = useState('');
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [projList, vendList] = await Promise.all([
          projectService.getAll(),
          vendorService.getAll()
        ]);
        setProjects(projList);
        setVendors(vendList);
      } catch (err) {
        console.error('Data load failed');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', unit: '', quantity: 1, remaining: 0, unit_price: 0, total_price: 0 }]);
  };

  // Load existing project items when project changes
  useEffect(() => {
    async function loadProjectItems() {
      if (!projectId) {
        setItems([{ id: Date.now().toString(), name: '', unit: '', quantity: 1, remaining: 0, unit_price: 0, total_price: 0 }]);
        return;
      }
      try {
        const projectItems = await pb.collection('project_items').getFullList({
          filter: `project = "${projectId}"`,
          sort: 'name'
        });

        // Get approved PR Subs to calculate remaining
        const prSubsApproved = await pb.collection('purchase_requests').getFullList({
          filter: `project = "${projectId}" && type = "sub" && status = "approved"`
        }).catch(() => []);

        // Calculate withdrawn quantities
        const withdrawnMap: Record<string, number> = {};
        for (const prSub of prSubsApproved) {
          const prItems = await pb.collection('pr_items').getFullList({
            filter: `pr = "${prSub.id}"`
          });
          for (const item of prItems) {
            if (item.project_item) {
              withdrawnMap[item.project_item] = (withdrawnMap[item.project_item] || 0) + (item.quantity || 0);
            }
          }
        }

        if (projectItems.length > 0) {
          setItems(projectItems.map((item: any) => {
            const initialQty = item.initial_quantity || item.quantity || 0;
            const withdrawn = withdrawnMap[item.id] || 0;
            const remaining = Math.max(0, initialQty - withdrawn);
            
            return {
              id: item.id,
              existingId: item.id,
              name: item.name,
              unit: item.unit || '',
              quantity: initialQty, // จำนวนเดิม
              remaining: remaining, // จำนวนคงเหลือ
              unit_price: item.unit_price || 0,
              total_price: 0,
              isExisting: true,
              addedQuantity: 0
            };
          }));
        } else {
          setItems([{ id: Date.now().toString(), name: '', unit: '', quantity: 1, remaining: 0, unit_price: 0, total_price: 0 }]);
        }
      } catch (err) {
        console.error('Load project items failed:', err);
        setItems([{ id: Date.now().toString(), name: '', unit: '', quantity: 1, remaining: 0, unit_price: 0, total_price: 0 }]);
      }
    }
    loadProjectItems();
  }, [projectId]);

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
        }
        // ถ้าเพิ่มจำนวน (addedQuantity) ให้คำนวณ total ใหม่
        if (field === 'addedQuantity') {
          const baseQty = item.isExisting ? (item.quantity || 0) : 0;
          const addedQty = Number(value) || 0;
          updated.total_price = (baseQty + addedQty) * Number(updated.unit_price || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      file,
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const uploadAttachments = async (prId: string) => {
    if (attachments.length === 0) return;

    const formData = new FormData();
    attachments.forEach(att => {
      formData.append('attachments', att.file);
    });

    try {
      await pb.collection('purchase_requests').update(prId, formData);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('อัปโหลดไฟล์ไม่สำเร็จ');
    }
  };

  // Save items to project_items as master data
  const saveItemsToProject = async (projId: string, prItems: any[]) => {
    if (!projId || prItems.length === 0) return;

    try {
      for (const item of prItems) {
        if (!item.name?.trim()) continue;

        if (item.isExisting && item.existingId) {
          // อัปเดตของเดิม - บวกจำนวนเพิ่ม
          const addedQty = Number(item.addedQuantity) || 0;
          if (addedQty > 0) {
            const existingItem = await pb.collection('project_items').getOne(item.existingId);
            const currentQty = existingItem.quantity || 0;
            const currentInitial = existingItem.initial_quantity || currentQty;
            const newQty = currentQty + addedQty;
            const newInitial = currentInitial + addedQty;
            
            await pb.collection('project_items').update(item.existingId, {
              quantity: newQty,
              initial_quantity: newInitial,
              unit_price: item.unit_price || existingItem.unit_price,
              total_price: newQty * (item.unit_price || existingItem.unit_price)
            });
          }
        } else {
          // สร้างใหม่
          await pb.collection('project_items').create({
            project: projId,
            name: item.name,
            unit: item.unit || '',
            quantity: item.quantity || 1,
            initial_quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: (item.quantity || 1) * (item.unit_price || 0)
          });
        }
      }
    } catch (error) {
      console.error('Error saving items to project:', error);
    }
  };

  const totalAmount = items.reduce((sum, item) => {
    if (item.isExisting) {
      // ของเดิม: คิดเฉพาะจำนวนที่เพิ่มใหม่
      const addedQty = Number(item.addedQuantity) || 0;
      return sum + (addedQty * Number(item.unit_price || 0));
    } else {
      // ของใหม่: คิดจำนวนทั้งหมด
      return sum + (Number(item.quantity || 0) * Number(item.unit_price || 0));
    }
  }, 0);

  const handleSubmit = async (status: string) => {
    if (!projectId || vendorIds.length === 0) {
      toast.error('กรุณาเลือกโครงการและผู้ขาย');
      return;
    }

    if (!user?.id) {
      toast.error('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    setIsSubmitting(true);
    try {
      const prData: any = {
        type: 'project',
        project: projectId,
        vendor: vendorIds[0] || '', // Use first vendor as primary (for backward compatibility)
        delivery_location: location,
        status: status,
        total_amount: totalAmount,
      };

      // Only add requester if user is logged in and exists in users collection
      // Skip if causes validation error - can be updated later
      try {
        if (user?.id) {
          // Verify user exists in collection
          await pb.collection('users').getOne(user.id);
          prData.requester = user.id;
        }
      } catch (e) {
        console.log('User not found in users collection, skipping requester field');
        // requester field will be empty, can be updated later
      }

      const prItems = items.map((item) => {
        if (item.isExisting) {
          // ของเดิม: ส่งจำนวนที่เพิ่มใหม่
          const addedQty = Number(item.addedQuantity) || 0;
          return {
            name: item.name,
            unit: item.unit,
            quantity: addedQty, // จำนวนที่เพิ่ม
            unit_price: item.unit_price,
            total_price: addedQty * (item.unit_price || 0),
            existingId: item.existingId
          };
        } else {
          // ของใหม่: ส่งตามปกติ
          return {
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          };
        }
      }).filter(item => item.quantity > 0 && item.name?.trim()); // กรองเฉพาะที่มีจำนวน > 0 และมีชื่อ

      const pr = await prService.create(prData, prItems);
      
      // Save items to project_items for future use
      await saveItemsToProject(projectId, items);
      
      // Upload attachments if any
      if (attachments.length > 0) {
        await uploadAttachments(pr.id);
      }

      toast.success(status === 'draft' ? 'บันทึกร่างเรียบร้อย' : 'ส่งใบขอซื้อเรียบร้อยแล้ว');
      
      // Navigate to approval page after submit
      if (status === 'pending') {
        navigate('/purchase-requests/approval');
      } else {
        navigate('/purchase-requests');
      }
    } catch (error) {
      console.error(error);
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVendors = vendors.filter(v => vendorIds.includes(v.id));

  if (loading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png"
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">สร้างใบขอซื้อ - โครงการ</h1>
          <p className="text-sm text-gray-500 mt-1">วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl px-6 border-[#E5E7EB] font-bold" onClick={() => handleSubmit('draft')} disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" /> บันทึกร่าง
          </Button>
          <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl px-8 font-bold shadow-lg shadow-blue-500/20" onClick={() => handleSubmit('pending')} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            ส่งอนุมัติ
          </Button>
        </div>
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
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">ชื่อโครงการ *</Label>
                <Select onValueChange={setProjectId}>
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกโครงการที่ต้องการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between py-5 px-6">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="w-5 h-5 text-blue-600" /> รายการวัสดุอุปกรณ์
              </CardTitle>
              <Button variant="ghost" onClick={addItem} className="text-blue-600 font-bold hover:bg-blue-50 h-9">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#9CA3AF] font-bold border-b border-gray-50 uppercase text-[10px] tracking-widest">
                      <th className="py-4 text-left">รายละเอียดสินค้า</th>
                      <th className="py-4 text-center w-24">คงเหลือ</th>
                      <th className="py-4 text-center w-24 text-green-600">เพิ่ม</th>
                      <th className="py-4 text-right w-28">ราคา/หน่วย</th>
                      <th className="py-4 text-right w-28">รวม</th>
                      <th className="py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => (
                      <tr key={item.id} className={`group ${item.isExisting ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-4 pr-4">
                          {item.isExisting ? (
                            <div>
                              <p className="font-bold text-gray-900">{item.name}</p>
                              <p className="text-xs text-blue-500">อุปกรณ์เดิมในโครงการ</p>
                            </div>
                          ) : (
                            <Input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="ระบุชื่อสินค้าใหม่..." className="h-10 border-none bg-gray-50 rounded-xl" />
                          )}
                        </td>
                        <td className="py-4 px-1 text-center">
                          {item.isExisting ? (
                            <p className="font-bold text-gray-600">{item.remaining}</p>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-4 px-1">
                          {item.isExisting ? (
                            <Input 
                              type="number" 
                              value={item.addedQuantity || ''} 
                              onChange={(e) => updateItem(item.id, 'addedQuantity', e.target.value)} 
                              placeholder="0"
                              className="h-10 border-none bg-green-50 rounded-xl text-center font-bold text-green-700" 
                            />
                          ) : (
                            <Input 
                              type="number" 
                              value={item.quantity} 
                              onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} 
                              className="h-10 border-none bg-gray-50 rounded-xl text-center font-bold" 
                            />
                          )}
                        </td>
                        <td className="py-4 px-1">
                          <Input 
                            type="number" 
                            value={item.unit_price} 
                            onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)} 
                            className="h-10 border-none bg-gray-50 rounded-xl text-right font-bold" 
                          />
                        </td>
                        <td className="py-4 pl-4 text-right font-black text-gray-900 leading-10">
                          {item.total_price.toLocaleString()}
                        </td>
                        <td className="py-4 pl-2 text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-red-200 hover:text-red-500 rounded-full">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-gray-50 flex justify-end">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดรวมทั้งหมด</p>
                  <p className="text-4xl font-black text-blue-600 tracking-tighter">฿{totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Vendor Card */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-white pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <User className="w-5 h-5 text-blue-600" /> ข้อมูลผู้ขาย
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้ขายหลัก *</Label>
                <Select 
                  onValueChange={(value) => {
                    if (!vendorIds.includes(value)) {
                      setVendorIds([...vendorIds, value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none">
                    <SelectValue placeholder="เลือกบริษัทผู้ขาย" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.filter(v => !vendorIds.includes(v.id)).map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Selected vendors tags */}
                {vendorIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedVendors.map(vendor => (
                      <span 
                        key={vendor.id} 
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {vendor.name}
                        <button 
                          onClick={() => setVendorIds(vendorIds.filter(id => id !== vendor.id))}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {selectedVendors.length > 0 && (
                <div className="space-y-3">
                  {selectedVendors.map(vendor => (
                    <div key={vendor.id} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">{vendor.name}</p>
                      <p className="font-bold text-blue-900">{vendor.contact_person}</p>
                      <p className="text-sm text-blue-700">{vendor.email}</p>
                      <p className="text-sm text-blue-700">{vendor.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments Card */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">เอกสารแนบ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 cursor-pointer transition-colors group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-3 bg-white rounded-2xl shadow-sm w-fit mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm font-bold text-gray-700">อัปโหลดไฟล์</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">PDF, XLSX (MAX 10MB)</p>
              </div>
              
              {attachments.map((att) => (
                <div key={att.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-xs"><FileText className="h-4 w-4 text-red-500" /></div>
                    <div>
                      <p className="text-xs font-bold text-gray-700 truncate w-32">{att.name}</p>
                      <p className="text-[10px] text-gray-400">{att.size}</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-300 hover:text-red-500 transition-colors"
                    onClick={() => removeAttachment(att.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="bg-[#1F2937] text-white border-none rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <FileText className="h-32 w-32" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">สถานะปัจจุบัน</p>
              <div className="flex items-center gap-2 text-yellow-400 mb-4">
                <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></div>
                <p className="font-black">โดยแบบร่าง (Draft)</p>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                เมื่อกรอกข้อมูลเสร็จสิ้น ระบบจะส่งเรื่องไปยัง ผู้จัดการโครงการ (Project Manager) เพื่อทำการตรวจสอบและอนุมัติต่อไปค่ะ
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
