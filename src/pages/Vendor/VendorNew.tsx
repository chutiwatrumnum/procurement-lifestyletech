import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building2, 
  User, 
  FileText,
  Save,
  ArrowLeft,
  Loader2,
  DollarSign,
  Upload,
  X,
  File
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';
import { useCreateVendor } from '@/hooks/useVendors';
import { rules, validateForm } from '@/lib/validation';

export default function VendorNew() {
  const navigate = useNavigate();
  const createVendorMutation = useCreateVendor();
  const [paymentTerm, setPaymentTerm] = useState('30days');
  const [paymentTermDetail, setPaymentTermDetail] = useState('');
  const [vendorType, setVendorType] = useState<'domestic' | 'foreign'>('domestic');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (formData: FormData): boolean => {
    const data = {
      name: formData.get('company_name') as string,
      contact_person: formData.get('contact_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      tax_id: formData.get('tax_id') as string,
      payment_term: paymentTerm,
      payment_term_detail: paymentTermDetail,
      website: formData.get('website') as string,
    };

    const schema = {
      name: [rules.required('กรุณากรอกชื่อบริษัท')],
      contact_person: [rules.required('กรุณากรอกชื่อผู้ติดต่อ')],
      email: [
        rules.required('กรุณากรอกอีเมล'),
        rules.email('รูปแบบอีเมลไม่ถูกต้อง')
      ],
      phone: [rules.phone('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง')],
      tax_id: [rules.taxId('เลขผู้เสียภาษีต้องมี 13 หลัก')],
      website: [rules.url('URL ต้องขึ้นต้นด้วย http:// หรือ https://')],
      payment_term_detail: paymentTerm === 'custom' ? [rules.required('กรุณาระบุเงื่อนไขการชำระเงินเพิ่มเติม')] : [],
    };

    const result = validateForm(data, schema);
    
    // Map internal key to form name for display
    const mappedErrors: Record<string, string> = {};
    if (result.errors.name) mappedErrors.company_name = result.errors.name;
    if (result.errors.contact_person) mappedErrors.contact_name = result.errors.contact_person;
    if (result.errors.email) mappedErrors.email = result.errors.email;
    if (result.errors.phone) mappedErrors.phone = result.errors.phone;
    if (result.errors.tax_id) mappedErrors.tax_id = result.errors.tax_id;
    if (result.errors.website) mappedErrors.website = result.errors.website;
    if (result.errors.payment_term_detail) mappedErrors.payment_term_detail = result.errors.payment_term_detail;

    setErrors(mappedErrors);
    if (!result.isValid) {
      toast.error('กรุณาตรวจสอบข้อมูลที่กรอก');
    }
    return result.isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!validate(formData)) return;
    const data = {
      name: formData.get('company_name'),
      tax_id: formData.get('tax_id'),
      category: formData.get('category'),
      address: formData.get('address'),
      contact_person: formData.get('contact_name'),
      email: formData.get('email'),
      phone: formData.get('phone') || null,
      website: formData.get('website'),
      payment_term: paymentTerm,
      payment_term_detail: paymentTerm === 'custom' ? paymentTermDetail : '',
      vendor_type: vendorType,
      status: 'active'
    };

    try {
      const vendor = await createVendorMutation.mutateAsync(data);
      
      // Upload attachments if any
      if (uploadedFiles.length > 0) {
        const uploadFormData = new FormData();
        uploadedFiles.forEach(file => {
          uploadFormData.append('attachments', file);
        });
        await pb.collection('vendors').update(vendor.id, uploadFormData);
      }
      
      toast.success('บันทึกข้อมูลผู้ขายเรียบร้อยแล้ว');
      navigate('/vendors');
    } catch (error) {
      console.error(error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้ กรุณาเช็ค API Rules ใน PocketBase');
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
                  <Label htmlFor="company_name">ชื่อบริษัท <span className="text-red-500">*</span></Label>
                  <Input 
                    name="company_name" 
                    id="company_name" 
                    placeholder="เช่น ABC Construction Ltd." 
                    className={`rounded-xl h-11 bg-gray-50 border ${errors.company_name ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`} 
                    onChange={() => setErrors(prev => ({ ...prev, company_name: '' }))}
                  />
                  {errors.company_name && <p className="text-xs text-red-500 font-medium">{errors.company_name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">เลขประจำตัวผู้เสียภาษี</Label>
                    <Input 
                      name="tax_id" 
                      id="tax_id" 
                      placeholder="0-0000-00000-00-0" 
                      className={`rounded-xl h-11 bg-gray-50 border ${errors.tax_id ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                      onChange={() => setErrors(prev => ({ ...prev, tax_id: '' }))}
                    />
                    {errors.tax_id && <p className="text-xs text-red-500 font-medium">{errors.tax_id}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">หมวดหมู่</Label>
                    <Input name="category" id="category" placeholder="เช่น วัสดุก่อสร้าง" className="rounded-xl h-11 bg-gray-50 border-none" />
                  </div>
                </div>

                {/* ประเภทผู้ขาย */}
                <div className="space-y-3">
                  <Label className="text-gray-700 font-bold">ประเภทผู้ขาย</Label>
                  <div className="flex gap-4">
                    <div 
                      className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        vendorType === 'domestic' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setVendorType('domestic')}
                    >
                      <Checkbox 
                        checked={vendorType === 'domestic'} 
                        className="pointer-events-none"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">🇹🇭 ในประเทศ</p>
                      </div>
                    </div>
                    <div 
                      className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        vendorType === 'foreign' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setVendorType('foreign')}
                    >
                      <Checkbox 
                        checked={vendorType === 'foreign'} 
                        className="pointer-events-none"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">🌍 ต่างประเทศ</p>
                      </div>
                    </div>
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
                  ข้อมูลผู้ติดต่อ (Contact Details)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">ชื่อผู้ติดต่อ (Contact Person) <span className="text-red-500">*</span></Label>
                  <Input 
                    name="contact_name" 
                    id="contact_name" 
                    placeholder="ระบุชื่อผู้ประสานงาน" 
                    className={`rounded-xl h-11 bg-gray-50 border ${errors.contact_name ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                    onChange={() => setErrors(prev => ({ ...prev, contact_name: '' }))}
                  />
                  {errors.contact_name && <p className="text-xs text-red-500 font-medium">{errors.contact_name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล (Email) <span className="text-red-500">*</span></Label>
                    <Input 
                      name="email" 
                      id="email" 
                      placeholder="contact@company.com" 
                      className={`rounded-xl h-11 bg-gray-50 border ${errors.email ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                      onChange={() => setErrors(prev => ({ ...prev, email: '' }))}
                    />
                    {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">เบอร์โทรศัพท์ (Phone)</Label>
                    <Input 
                      name="phone" 
                      id="phone" 
                      placeholder="02-XXX-XXXX" 
                      className={`rounded-xl h-11 bg-gray-50 border ${errors.phone ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                      onChange={() => setErrors(prev => ({ ...prev, phone: '' }))}
                    />
                    {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">เว็บไซต์ (Website)</Label>
                  <Input 
                    name="website" 
                    id="website" 
                    placeholder="https://www.company.com" 
                    className={`rounded-xl h-11 bg-gray-50 border ${errors.website ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                    onChange={() => setErrors(prev => ({ ...prev, website: '' }))}
                  />
                  {errors.website && <p className="text-xs text-red-500 font-medium">{errors.website}</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  ข้อมูลการเงิน (Financials)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-gray-700 font-bold">เงื่อนไขการชำระเงิน (Payment Terms) *</Label>
                  <RadioGroup value={paymentTerm} onValueChange={setPaymentTerm} className="space-y-3">
                    <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border-2 border-transparent hover:border-orange-200 transition-all cursor-pointer">
                      <RadioGroupItem value="30days" id="30days" className="text-orange-600" />
                      <Label htmlFor="30days" className="cursor-pointer flex-1 font-medium">เงินสด 30 วัน</Label>
                    </div>
                    <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border-2 border-transparent hover:border-orange-200 transition-all cursor-pointer">
                      <RadioGroupItem value="45days" id="45days" className="text-orange-600" />
                      <Label htmlFor="45days" className="cursor-pointer flex-1 font-medium">เงินสด 45 วัน</Label>
                    </div>
                    <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border-2 border-transparent hover:border-orange-200 transition-all cursor-pointer">
                      <RadioGroupItem value="60days" id="60days" className="text-orange-600" />
                      <Label htmlFor="60days" className="cursor-pointer flex-1 font-medium">เงินสด 60 วัน</Label>
                    </div>
                    <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border-2 border-transparent hover:border-orange-200 transition-all cursor-pointer">
                      <RadioGroupItem value="custom" id="custom" className="text-orange-600" />
                      <Label htmlFor="custom" className="cursor-pointer flex-1 font-medium">อื่นๆ</Label>
                    </div>
                    {paymentTerm === 'custom' && (
                      <div className="mt-3 p-4 bg-white rounded-xl border-2 border-orange-200">
                        <Label htmlFor="payment_term_detail" className="text-gray-600 font-bold mb-2 block">ระบุเงื่อนไขการชำระเงิน <span className="text-red-500">*</span></Label>
                        <Input 
                          id="payment_term_detail"
                          value={paymentTermDetail}
                          onChange={(e) => {
                            setPaymentTermDetail(e.target.value);
                            setErrors(prev => ({ ...prev, payment_term_detail: '' }));
                          }}
                          placeholder="เช่น มัดจำ 50% ส่วนที่เหลือ 30 วัน Credit"
                          className={`rounded-xl h-11 bg-gray-50 border ${errors.payment_term_detail ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                        />
                        {errors.payment_term_detail && <p className="text-xs text-red-500 font-medium mt-1">{errors.payment_term_detail}</p>}
                      </div>
                    )}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <FileText className="w-5 h-5 text-blue-600" />
                  เอกสารประกอบ (Supporting Documents)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer">
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    multiple 
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                    <div className="p-4 bg-blue-50 rounded-full">
                      <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-700">ลากไฟล์มาวาง หรือคลิกเพื่ือเลือกไฟล์</p>
                      <p className="text-xs text-gray-500 mt-1">รองรับไฟล์ PDF, Word, รูปภาพ (สูงสุด 5 MB ต่อไฟล์)</p>
                    </div>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-600">รายการไฟล์ที่อัพโหลด:</Label>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl group hover:bg-blue-100 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <File className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-800">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-600"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              <Button type="submit" size="lg" className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl h-12 font-bold shadow-lg shadow-blue-500/20" disabled={createVendorMutation.isPending}>
                {createVendorMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
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
