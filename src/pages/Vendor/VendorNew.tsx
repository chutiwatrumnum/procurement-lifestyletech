import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  User, 
  Mail,
  Phone,
  FileText,
  Save,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { vendorService } from '@/services/api';
import { toast } from 'sonner';

export default function VendorNew() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('company_name'),
      tax_id: formData.get('tax_id'),
      category: formData.get('category'),
      address: formData.get('address'),
      contact_person: formData.get('contact_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      status: 'active'
    };

    try {
      await vendorService.create(data);
      toast.success('บันทึกข้อมูลผู้ขายเรียบร้อยแล้ว');
      navigate('/vendors');
    } catch (error) {
      console.error(error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้ กรุณาเช็ค API Rules ใน PocketBase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">เพิ่มรายชื่อผู้ขายใหม่</h1>
          <p className="text-gray-500 text-sm mt-1">กรอกข้อมูลผู้ขายเพื่อเพิ่มเข้าระบบฐานข้อมูล</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  ข้อมูลบริษัท
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">ชื่อบริษัท *</Label>
                  <Input name="company_name" id="company_name" placeholder="เช่น ABC Construction Ltd." required className="rounded-xl h-11 bg-gray-50 border-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">เลขประจำตัวผู้เสียภาษี</Label>
                    <Input name="tax_id" id="tax_id" placeholder="0-0000-00000-00-0" className="rounded-xl h-11 bg-gray-50 border-none" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">หมวดหมู่</Label>
                    <Input name="category" id="category" placeholder="เช่น วัสดุก่อสร้าง" className="rounded-xl h-11 bg-gray-50 border-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">ที่อยู่</Label>
                  <Textarea name="address" id="address" placeholder="ที่อยู่สำนักงาน..." rows={3} className="rounded-xl bg-gray-50 border-none" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <User className="w-5 h-5 text-blue-600" />
                  ข้อมูลผู้ติดต่อ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">ชื่อผู้ติดต่อ *</Label>
                  <Input name="contact_name" id="contact_name" placeholder="ระบุชื่อผู้ประสานงาน" required className="rounded-xl h-11 bg-gray-50 border-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล *</Label>
                    <Input name="email" id="email" type="email" placeholder="contact@company.com" required className="rounded-xl h-11 bg-gray-50 border-none" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">เบอร์โทรศัพท์ *</Label>
                    <Input name="phone" id="phone" placeholder="02-XXX-XXXX" required className="rounded-xl h-11 bg-gray-50 border-none" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              <Button type="submit" size="lg" className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl h-12 font-bold shadow-lg shadow-blue-500/20" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                บันทึกลงระบบฐานข้อมูล
              </Button>
              <Button type="button" variant="outline" size="lg" className="w-full rounded-xl h-12 border-[#E5E7EB] text-gray-600" onClick={() => navigate(-1)}>
                ยกเลิก
              </Button>
            </div>

            <Card className="bg-blue-50 border-none rounded-2xl p-2">
              <CardContent className="p-4">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> หมายเหตุ
                </h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  ข้อมูลที่บันทึกจะถูกเก็บไว้ใน PocketBase และพร้อมใช้งานในการออกใบขอซื้อ (PR) และใบสั่งซื้อ (PO) ทันที
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
