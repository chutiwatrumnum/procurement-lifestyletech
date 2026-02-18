// PRProjectEdit.tsx - Edit mode for Project PR (draft only)
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
  Upload, 
  Plus, 
  Trash2,
  FileText,
  Save,
  Send,
  Loader2,
  ArrowLeft,
  X
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { prService, projectService, vendorService } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/pocketbase';

interface LineItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  isExisting?: boolean;
  existingId?: string;
}

export default function PRProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prData, setPrData] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [items, setItems] = useState<LineItem[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  
  // Form state
  const [selectedProject, setSelectedProject] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [pr, prItems, projList, vendList] = await Promise.all([
          prService.getById(id),
          prService.getItems(id),
          projectService.getAll(),
          vendorService.getAll()
        ]);
        
        // Check if it's a draft and project type
        if (pr.status !== 'draft') {
          toast.error('สามารถแก้ไขได้เฉพาะรายการที่ยังเป็น Draft เท่านั้น');
          navigate('/purchase-requests');
          return;
        }
        
        if (pr.type !== 'project') {
          toast.error('รายการนี้ไม่ใช่ประเภท Project');
          navigate('/purchase-requests');
          return;
        }
        
        setPrData(pr);
        setProjects(projList);
        setVendors(vendList);
        setAttachments(pr.attachments || []);
        setSelectedProject(pr.project || '');
        setDeliveryLocation(pr.delivery_location || '');
        
        if (pr.vendor) {
          setVendorIds(Array.isArray(pr.vendor) ? pr.vendor : [pr.vendor]);
        }
        
        // Convert pr_items to LineItems
        setItems(prItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
          isExisting: true,
          existingId: item.id
        })));
        
      } catch (err) {
        console.error('Error loading PR:', err);
        toast.error('ไม่สามารถโหลดข้อมูลใบขอซื้อได้');
        navigate('/purchase-requests');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, navigate]);

  const addItem = () => {
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      unit: '',
      quantity: 0,
      unit_price: 0,
      total_price: 0
    }]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewAttachments([...newAttachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number, isNew: boolean) => {
    if (isNew) {
      setNewAttachments(newAttachments.filter((_, i) => i !== index));
    } else {
      setAttachments(attachments.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const handleSave = async (submit = false) => {
    if (!id) return;
    
    // Validation
    if (!selectedProject) {
      toast.error('กรุณาเลือกโครงการ');
      return;
    }
    if (items.length === 0) {
      toast.error('กรุณาเพิ่มรายการสินค้า');
      return;
    }
    if (items.some(item => !item.name || item.quantity <= 0)) {
      toast.error('กรุณากรอกข้อมูลรายการสินค้าให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload new attachments
      const uploadedFiles: string[] = [];
      for (const file of newAttachments) {
        const formData = new FormData();
        formData.append('file', file);
        const record = await pb.collection('purchase_requests').create(formData);
        uploadedFiles.push(record.id);
      }

      // Update PR
      await prService.update(id, {
        project: selectedProject,
        vendor: vendorIds.length > 0 ? vendorIds : null,
        delivery_location: deliveryLocation,
        total_amount: calculateTotal(),
        attachments: [...attachments, ...uploadedFiles],
        status: submit ? 'pending' : 'draft',
        requester_name: user?.name || user?.email || 'Unknown'
      });

      // Update items - delete old ones and create new
      await prService.deleteItems(id);
      for (const item of items) {
        await prService.createItem({
          pr: id,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
      }

      toast.success(submit ? 'ส่งคำขอจัดซื้อเรียบร้อยแล้ว' : 'บันทึกแบบร่างเรียบร้อยแล้ว');
      navigate('/purchase-requests');
    } catch (err) {
      console.error('Error saving PR:', err);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // ถ้าไม่มีข้อมูล ให้ redirect กลับ
  if (!prData) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <p className="text-gray-500">ไม่พบข้อมูลใบขอซื้อ</p>
        <Button onClick={() => navigate('/purchase-requests')}>
          กลับไปหน้ารายการ
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">แก้ไขใบขอซื้อโครงการ (Draft)</h1>
          <p className="text-sm text-gray-500">{prData?.pr_number}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลโครงการ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>เลือกโครงการ *</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกโครงการ..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>ผู้จัดจำหน่าย (Vendor)</Label>
            <Select 
              value={vendorIds[0] || 'none'} 
              onValueChange={(v) => setVendorIds(v === 'none' ? [] : [v])}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกผู้จัดจำหน่าย..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ไม่ระบุ</SelectItem>
                {vendors.map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>สถานที่จัดส่ง</Label>
            <Textarea 
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              placeholder="ระบุสถานที่จัดส่ง..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายการสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <Label className="text-xs">รายการ</Label>
                  <Input 
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="ชื่อสินค้า/บริการ"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">หน่วย</Label>
                  <Input 
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                    placeholder="เช่น ชิ้น, กล่อง"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">จำนวน</Label>
                  <Input 
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">ราคา/หน่วย</Label>
                  <Input 
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-1">
                  <Label className="text-xs">รวม</Label>
                  <p className="font-bold">฿{item.total_price.toLocaleString()}</p>
                </div>
                <div className="col-span-1 flex items-end">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button variant="outline" onClick={addItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> เพิ่มรายการ
            </Button>
          </div>

          <div className="mt-6 text-right">
            <p className="text-sm text-gray-500">รวมทั้งสิ้น</p>
            <p className="text-2xl font-bold">฿{calculateTotal().toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ไฟล์แนบ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Existing attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">ไฟล์ที่มีอยู่:</p>
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{file}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeAttachment(i, false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* New attachments */}
            {newAttachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">ไฟล์ใหม่:</p>
                {newAttachments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm">{file.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeAttachment(i, true)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" /> อัพโหลดไฟล์
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button 
          variant="outline" 
          onClick={() => handleSave(false)}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          บันทึกแบบร่าง
        </Button>
        <Button 
          onClick={() => handleSave(true)}
          disabled={isSubmitting}
          className="bg-blue-600"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          ส่งคำขอจัดซื้อ
        </Button>
      </div>
    </div>
  );
}
