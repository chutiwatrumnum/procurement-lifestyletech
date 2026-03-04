import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  Save,
  Loader2,
  Phone,
  Mail,
  Globe,
  Landmark,
  FileText,
  CheckCircle2,
  Upload,
  X,
  ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';

export default function CompanySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    name_th: '',
    address_th: '',
    address_en: '',
    phone: '',
    email: '',
    tax_id: '',
    website: '',
    bank_name: '',
    bank_account: '',
    bank_branch: '',
    branch_name: '',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const records = await pb.collection('company_settings').getFullList();
        if (records.length > 0) {
          const rec = records[0];
          setRecordId(rec.id);
          setForm({
            name: rec.name || '',
            name_th: rec.name_th || '',
            address_th: rec.address_th || '',
            address_en: rec.address_en || '',
            phone: rec.phone || '',
            email: rec.email || '',
            tax_id: rec.tax_id || '',
            website: rec.website || '',
            bank_name: rec.bank_name || '',
            bank_account: rec.bank_account || '',
            bank_branch: rec.bank_branch || '',
            branch_name: rec.branch_name || '',
          });
          if (rec.logo) {
            setExistingLogo(`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${rec.collectionId}/${rec.id}/${rec.logo}`);
          }
        }
      } catch (err) {
        console.error('Failed to load company settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('ไฟล์โลโก้ต้องมีขนาดไม่เกิน 5 MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // Required fields
    if (!form.name.trim()) errs.name = 'กรุณากรอกชื่อบริษัท (ภาษาอังกฤษ)';
    if (!form.name_th.trim()) errs.name_th = 'กรุณากรอกชื่อบริษัท (ภาษาไทย)';
    if (!form.tax_id.trim()) errs.tax_id = 'กรุณากรอกเลขประจำตัวผู้เสียภาษี';
    if (!form.address_th.trim()) errs.address_th = 'กรุณากรอกที่อยู่ (ภาษาไทย)';

    // Tax ID: must be 13 digits (allow dashes)
    if (form.tax_id.trim()) {
      const digitsOnly = form.tax_id.replace(/[-\s]/g, '');
      if (!/^\d{13}$/.test(digitsOnly)) {
        errs.tax_id = 'เลขผู้เสียภาษีต้องมี 13 หลัก';
      }
    }

    // Email format
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    // Phone format (allow digits, dashes, spaces, +)
    if (form.phone.trim() && !/^[\d\s\-+().]{6,20}$/.test(form.phone)) {
      errs.phone = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง';
    }

    // Website format
    if (form.website.trim() && !/^https?:\/\/.+/.test(form.website)) {
      errs.website = 'URL ต้องขึ้นต้นด้วย http:// หรือ https://';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('กรุณาตรวจสอบข้อมูลที่กรอก');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        formData.append(key, val);
      });
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      if (recordId) {
        await pb.collection('company_settings').update(recordId, formData);
      } else {
        const rec = await pb.collection('company_settings').create(formData);
        setRecordId(rec.id);
      }
      toast.success('บันทึกข้อมูลบริษัทเรียบร้อยแล้ว');
      
      // Reload to get logo URL
      if (logoFile && recordId) {
        const updated = await pb.collection('company_settings').getOne(recordId);
        if (updated.logo) {
          setExistingLogo(`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${updated.collectionId}/${updated.id}/${updated.logo}`);
        }
        setLogoFile(null);
        setLogoPreview(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const displayLogo = logoPreview || existingLogo;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">ข้อมูลบริษัท</h1>
          <p className="text-sm text-gray-500 mt-1 font-bold uppercase tracking-widest">COMPANY SETTINGS</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 h-11"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          บันทึกข้อมูล
        </Button>
      </div>

      {recordId && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl text-sm font-bold">
          <CheckCircle2 className="w-4 h-4" />
          ข้อมูลถูกบันทึกอยู่ในระบบแล้ว
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info */}
        <div className="space-y-6">
          {/* Logo */}
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <ImageIcon className="w-5 h-5 text-blue-600" /> โลโก้บริษัท
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {displayLogo ? (
                  <div className="relative">
                    <img src={displayLogo} alt="Logo" className="w-32 h-32 object-contain border border-gray-200 rounded-xl p-2 bg-white" />
                    {logoPreview && (
                      <button onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo-upload"
                    className="hidden"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoSelect}
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition-colors text-sm font-bold text-gray-700"
                  >
                    <Upload className="w-4 h-4" /> เลือกรูปโลโก้
                  </label>
                  <p className="text-xs text-gray-400 mt-2">PNG, JPG, SVG, WebP (แนะนำ 200×200px ขึ้นไป)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Building2 className="w-5 h-5 text-blue-600" /> ข้อมูลทั่วไป
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ชื่อบริษัท (ภาษาอังกฤษ) <span className="text-red-500">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="เช่น LIFESTYLE TECHNOLOGY CO., LTD."
                  className={`rounded-xl h-11 bg-gray-50 border ${errors.name ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                />
                {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>ชื่อบริษัท (ภาษาไทย) <span className="text-red-500">*</span></Label>
                <Input
                  value={form.name_th}
                  onChange={(e) => handleChange('name_th', e.target.value)}
                  placeholder="เช่น บริษัท ไลฟ์สไตล์ เทคโนโลยี จำกัด"
                  className={`rounded-xl h-11 bg-gray-50 border ${errors.name_th ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                />
                {errors.name_th && <p className="text-xs text-red-500 font-medium">{errors.name_th}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>สาขา</Label>
                  <Input
                    value={form.branch_name}
                    onChange={(e) => handleChange('branch_name', e.target.value)}
                    placeholder="เช่น สำนักงานใหญ่"
                    className="rounded-xl h-11 bg-gray-50 border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>เลขประจำตัวผู้เสียภาษี <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.tax_id}
                    onChange={(e) => handleChange('tax_id', e.target.value)}
                    placeholder="0-0000-00000-00-0"
                    className={`rounded-xl h-11 bg-gray-50 border ${errors.tax_id ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                  />
                  {errors.tax_id && <p className="text-xs text-red-500 font-medium">{errors.tax_id}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>ที่อยู่ (ภาษาไทย) <span className="text-red-500">*</span></Label>
                <Textarea
                  value={form.address_th}
                  onChange={(e) => handleChange('address_th', e.target.value)}
                  placeholder="ที่อยู่สำนักงาน (ภาษาไทย)..."
                  rows={3}
                  className={`rounded-xl bg-gray-50 border ${errors.address_th ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                />
                {errors.address_th && <p className="text-xs text-red-500 font-medium">{errors.address_th}</p>}
              </div>
              <div className="space-y-2">
                <Label>ที่อยู่ (ภาษาอังกฤษ)</Label>
                <Textarea
                  value={form.address_en}
                  onChange={(e) => handleChange('address_en', e.target.value)}
                  placeholder="Office address (English)..."
                  rows={3}
                  className="rounded-xl bg-gray-50 border-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact + Bank */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Phone className="w-5 h-5 text-blue-600" /> ข้อมูลติดต่อ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> เบอร์โทรศัพท์</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="02-XXX-XXXX"
                  className={`rounded-xl h-11 bg-gray-50 border ${errors.phone ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                />
                {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> อีเมล</Label>
                <Input
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="info@company.com"
                  className={`rounded-xl h-11 bg-gray-50 border ${errors.email ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                />
                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-gray-400" /> เว็บไซต์</Label>
                <Input
                  value={form.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.company.com"
                  className={`rounded-xl h-11 bg-gray-50 border ${errors.website ? 'border-red-400 bg-red-50/30' : 'border-transparent'}`}
                />
                {errors.website && <p className="text-xs text-red-500 font-medium">{errors.website}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Landmark className="w-5 h-5 text-orange-600" /> ข้อมูลธนาคาร
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ชื่อธนาคาร</Label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  placeholder="เช่น ธนาคารกสิกรไทย"
                  className="rounded-xl h-11 bg-white border-none"
                />
              </div>
              <div className="space-y-2">
                <Label>เลขที่บัญชี</Label>
                <Input
                  value={form.bank_account}
                  onChange={(e) => handleChange('bank_account', e.target.value)}
                  placeholder="XXX-X-XXXXX-X"
                  className="rounded-xl h-11 bg-white border-none"
                />
              </div>
              <div className="space-y-2">
                <Label>สาขาธนาคาร</Label>
                <Input
                  value={form.bank_branch}
                  onChange={(e) => handleChange('bank_branch', e.target.value)}
                  placeholder="เช่น สาขาสยามพารากอน"
                  className="rounded-xl h-11 bg-white border-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 border-none rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 mb-1">ข้อมูลนี้ใช้ที่ไหน?</h4>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    ข้อมูลบริษัทจะถูกนำไปแสดงใน<strong>ใบสั่งซื้อ (PO)</strong> โดยอัตโนมัติ รวมถึงเอกสารอื่นๆ ในระบบ
                    กรุณากรอกข้อมูลให้ครบถ้วนเพื่อความถูกต้องของเอกสาร
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
