import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  User, 
  DollarSign, 
  FileText,
  ArrowLeft, 
  Loader2,
  Edit,
  Phone,
  Mail,
  Globe,
  MapPin,
  Hash,
  ExternalLink,
  File
} from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useVendor } from '@/hooks/useVendors';
import pb from '@/lib/pocketbase';

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: vendor, isLoading, error } = useVendor(id);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center text-gray-500">
        <Building2 className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">ไม่พบข้อมูลผู้ขาย</h2>
        <Button variant="outline" onClick={() => navigate('/vendors')} className="mt-4 rounded-xl">
          กลับหน้ารายชื่อผู้ขาย
        </Button>
      </div>
    );
  }

  const getPaymentTermLabel = (term: string) => {
    const labels: Record<string, string> = {
      'cash': 'เงินสด',
      '30days': 'เงินสด 30 วัน',
      '45days': 'เงินสด 45 วัน',
      '60days': 'เงินสด 60 วัน',
      'custom': 'กำหนดเอง',
    };
    return labels[term] || term || '-';
  };

  const attachments = vendor.attachments 
    ? (Array.isArray(vendor.attachments) ? vendor.attachments : [vendor.attachments])
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-white shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{vendor.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`rounded-full px-3 py-0.5 font-black uppercase text-[9px] tracking-widest border-none ${
                vendor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {vendor.status === 'active' ? '● ใช้งานอยู่' : '○ ไม่ใช้งาน'}
              </Badge>
              {vendor.vendor_type && (
                <Badge variant="outline" className="rounded-full px-3 py-0.5 font-bold text-[10px] border-gray-200">
                  {vendor.vendor_type === 'domestic' ? '🇹🇭 ในประเทศ' : '🌍 ต่างประเทศ'}
                </Badge>
              )}
              {vendor.category && (
                <Badge variant="outline" className="rounded-full px-3 py-0.5 font-bold text-[10px] bg-gray-50 border-gray-200 text-gray-600">
                  {vendor.category}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Link to={`/vendors/edit/${vendor.id}`}>
          <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 h-11 rounded-xl font-bold shadow-lg shadow-blue-500/20">
            <Edit className="w-4 h-4 mr-2" /> แก้ไขข้อมูล
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Info */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-900">
                <Building2 className="w-5 h-5 text-blue-600" />
                ข้อมูลบริษัท
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem icon={<Building2 className="w-4 h-4" />} label="ชื่อบริษัท" value={vendor.name} bold />
                <InfoItem icon={<Hash className="w-4 h-4" />} label="เลขผู้เสียภาษี" value={vendor.tax_id} />
              </div>
              {vendor.address && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <InfoItem icon={<MapPin className="w-4 h-4" />} label="ที่อยู่" value={vendor.address} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-green-900">
                <User className="w-5 h-5 text-green-600" />
                ข้อมูลผู้ติดต่อ
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem icon={<User className="w-4 h-4" />} label="ชื่อผู้ติดต่อ" value={vendor.contact_person} bold />
                <InfoItem icon={<Phone className="w-4 h-4" />} label="เบอร์โทรศัพท์" value={vendor.phone} />
                <InfoItem icon={<Mail className="w-4 h-4" />} label="อีเมล" value={vendor.email} isLink={vendor.email ? `mailto:${vendor.email}` : undefined} />
                <InfoItem icon={<Globe className="w-4 h-4" />} label="เว็บไซต์" value={vendor.website} isLink={vendor.website} />
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-b border-purple-100 px-6 py-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-purple-900">
                  <FileText className="w-5 h-5 text-purple-600" />
                  เอกสารประกอบ ({attachments.length} ไฟล์)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {attachments.map((filename: string, index: number) => {
                    const fileUrl = `${import.meta.env.VITE_POCKETBASE_URL}/api/files/vendors/${vendor.id}/${filename}`;
                    return (
                      <a
                        key={index}
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-all">
                            <File className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-800">{filename}</p>
                            <p className="text-xs text-purple-500">คลิกเพื่อดูไฟล์</p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-all" />
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Terms */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-6 py-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-orange-900">
                <DollarSign className="w-5 h-5 text-orange-600" />
                ข้อมูลการเงิน
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">เงื่อนไขการชำระเงิน</p>
                  <p className="font-bold text-gray-900">{getPaymentTermLabel(vendor.payment_term)}</p>
                </div>
                {vendor.payment_term === 'custom' && vendor.payment_term_detail && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">รายละเอียดเพิ่มเติม</p>
                    <p className="text-sm text-gray-700">{vendor.payment_term_detail}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">สร้างเมื่อ</p>
                <p className="text-sm font-medium text-gray-700">
                  {new Date(vendor.created).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">อัปเดตล่าสุด</p>
                <p className="text-sm font-medium text-gray-700">
                  {new Date(vendor.updated).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ID</p>
                <p className="text-xs font-mono text-gray-400">{vendor.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Reusable info row component
function InfoItem({ icon, label, value, bold, isLink }: { 
  icon: React.ReactNode; 
  label: string; 
  value?: string; 
  bold?: boolean;
  isLink?: string;
}) {
  const displayValue = value || '-';
  
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-gray-100 rounded-lg text-gray-500 mt-0.5 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        {isLink && value ? (
          <a href={isLink} target="_blank" rel="noopener noreferrer" className={`text-blue-600 hover:underline ${bold ? 'font-bold text-sm' : 'text-sm'}`}>
            {displayValue} <ExternalLink className="w-3 h-3 inline ml-1" />
          </a>
        ) : (
          <p className={`text-gray-800 ${bold ? 'font-bold text-sm' : 'text-sm'}`}>{displayValue}</p>
        )}
      </div>
    </div>
  );
}
