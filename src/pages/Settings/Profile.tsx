import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Camera,
  Save,
  Loader2,
  Shield,
  Key,
  Eye,
  EyeOff,
  Signature,
  Upload,
  X,
  Check,
  MessageCircle,
  Link,
  Unlink
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfileSettings() {
  const { user: currentUser, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);
  const sigDragCounter = useRef(0);
  
  // LINE Integration State
  const [lineUserId, setLineUserId] = useState('');
  const [lineLinked, setLineLinked] = useState(false);
  const [linkingLine, setLinkingLine] = useState(false);
  const [unlinkingLine, setUnlinkingLine] = useState(false);
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    departmentName: '',
    role: '',
    avatar: '',
    signature: '',
    line_user_id: ''
  });
  
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const refreshUserData = async () => {
    if (!currentUser?.id) return;
    try {
      const userData = await pb.collection('users').getOne(currentUser.id);
      setProfile(prev => ({
        ...prev,
        signature: userData.signature || '',
        avatar: userData.avatar || ''
      }));
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
  };

  // ดึงสถานะ LINE เมื่อโหลด component
  useEffect(() => {
    const fetchLineStatus = async () => {
      if (!currentUser?.id) return;
      try {
        const response = await pb.send('/api/line-status', { method: 'GET' });
        if (response.success) {
          setLineLinked(response.linked);
          setLineUserId(response.line_user_id || '');
        }
      } catch (err) {
        console.error('Failed to fetch LINE status:', err);
      }
    };
    
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        position: currentUser.position || '',
        departmentName: currentUser.departmentName || '',
        role: currentUser.role || '',
        avatar: currentUser.avatar || '',
        signature: (currentUser as any).signature || '',
        line_user_id: (currentUser as any).line_user_id || ''
      });
      setLoading(false);
      
      // ดึงข้อมูลล่าสุดจาก API เพื่อให้แน่ใจว่าได้ signature ล่าสุด
      refreshUserData();
      
      // ดึงสถานะ LINE
      fetchLineStatus();
    }
  }, [currentUser]);

  // ฟังก์ชันผูก LINE
  const handleLinkLine = async () => {
    if (!lineUserId.trim()) {
      toast.error('กรุณากรอก LINE User ID');
      return;
    }
    
    setLinkingLine(true);
    try {
      const response = await pb.send('/api/link-line', {
        method: 'POST',
        body: { line_user_id: lineUserId.trim() }
      });
      
      if (response.success) {
        setLineLinked(true);
        toast.success('ผูก LINE สำเร็จ!');
      } else {
        toast.error(response.message || 'ผูก LINE ไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error('Link LINE failed:', err);
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLinkingLine(false);
    }
  };

  // ฟังก์ชันยกเลิกผูก LINE
  const handleUnlinkLine = async () => {
    setUnlinkingLine(true);
    try {
      const response = await pb.send('/api/unlink-line', { method: 'POST' });
      
      if (response.success) {
        setLineLinked(false);
        setLineUserId('');
        toast.success('ยกเลิกการผูก LINE สำเร็จ');
      } else {
        toast.error(response.message || 'ยกเลิกไม่สำเร็จ');
      }
    } catch (err: any) {
      console.error('Unlink LINE failed:', err);
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setUnlinkingLine(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser?.id) return;
    
    setSaving(true);
    try {
      await pb.collection('users').update(currentUser.id, {
        name: profile.name,
        phone: profile.phone || undefined
      });
      
      toast.success('อัปเดตโปรไฟล์สำเร็จ');
    } catch (err: any) {
      console.error('Update profile failed:', err);
      toast.error(err.message || 'อัปเดตไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser?.id) return;
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    
    setChangingPassword(true);
    try {
      // Verify current password
      await pb.collection('users').authWithPassword(currentUser.email, passwordForm.currentPassword);
      
      // Update password
      await pb.collection('users').update(currentUser.id, {
        password: passwordForm.newPassword,
        passwordConfirm: passwordForm.newPassword
      });
      
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Logout after 2 seconds
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err: any) {
      console.error('Change password failed:', err);
      toast.error(err.message || 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('รองรับเฉพาะไฟล์รูปภาพ (PNG, JPG)');
      return;
    }
    
    setUploadingSignature(true);
    const formData = new FormData();
    formData.append('signature', file);
    
    try {
      const updated = await pb.collection('users').update(currentUser.id, formData);
      setProfile({ ...profile, signature: updated.signature });
      await refreshUserData();
      toast.success('อัปโหลดลายเซ็นสำเร็จ');
    } catch (err: any) {
      console.error('Upload signature failed:', err);
      toast.error('อัปโหลดลายเซ็นไม่สำเร็จ');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!currentUser?.id) return;
    
    try {
      await pb.collection('users').update(currentUser.id, {
        signature: null
      });
      setProfile({ ...profile, signature: '' });
      await refreshUserData();
      toast.success('ลบลายเซ็นสำเร็จ');
    } catch (err: any) {
      console.error('Delete signature failed:', err);
      toast.error('ลบลายเซ็นไม่สำเร็จ');
    }
  };

  const processSignatureFile = async (file: File) => {
    if (!currentUser?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('รองรับเฉพาะไฟล์รูปภาพ (PNG, JPG)');
      return;
    }
    setUploadingSignature(true);
    const formData = new FormData();
    formData.append('signature', file);
    try {
      const updated = await pb.collection('users').update(currentUser.id, formData);
      setProfile({ ...profile, signature: updated.signature });
      await refreshUserData();
      toast.success('อัปโหลดลายเซ็นสำเร็จ');
    } catch (err: any) {
      console.error('Upload signature failed:', err);
      toast.error('อัปโหลดลายเซ็นไม่สำเร็จ');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleSigDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    sigDragCounter.current++;
    if (e.dataTransfer.items?.length) setIsDraggingSignature(true);
  };
  const handleSigDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    sigDragCounter.current--;
    if (sigDragCounter.current === 0) setIsDraggingSignature(false);
  };
  const handleSigDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleSigDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDraggingSignature(false);
    sigDragCounter.current = 0;
    const file = e.dataTransfer.files[0];
    if (file) processSignatureFile(file);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('ไฟล์ต้องมีขนาดไม่เกิน 2MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      await pb.collection('users').update(currentUser.id, formData);
      toast.success('อัปโหลดรูปโปรไฟล์สำเร็จ');
    } catch (err: any) {
      console.error('Upload avatar failed:', err);
      toast.error('อัปโหลดรูปไม่สำเร็จ');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      superadmin: 'ผู้ดูแลระบบ',
      head_of_dept: 'ผู้จัดการแผนก',
      manager: 'ผู้บริหาร',
      employee: 'พนักงาน'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      superadmin: 'bg-purple-100 text-purple-700',
      head_of_dept: 'bg-blue-100 text-blue-700',
      manager: 'bg-green-100 text-green-700',
      employee: 'bg-gray-100 text-gray-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">ตั้งค่าบัญชี</h1>
        <p className="text-sm text-gray-500 mt-1">จัดการโปรไฟล์และความปลอดภัยของคุณ</p>
      </div>

      {/* Profile Card */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-blue-600" />
            ข้อมูลส่วนตัว
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-blue-50">
                <AvatarImage 
                  src={profile.avatar ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${currentUser?.id}/${profile.avatar}` : ''} 
                />
                <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
                  {profile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            
            <div className="flex-1">
              <p className="font-bold text-lg text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${getRoleColor(profile.role)} border-none`}>
                  {getRoleLabel(profile.role)}
                </Badge>
                {profile.departmentName && (
                  <Badge variant="outline" className="text-gray-600">
                    <Building2 className="w-3 h-3 mr-1" />
                    {profile.departmentName}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                ชื่อ-นามสกุล *
              </Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="ระบุชื่อ-นามสกุล"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                อีเมล (ไม่สามารถแก้ไข)
              </Label>
              <Input
                value={profile.email}
                disabled
                className="h-11 rounded-xl bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                เบอร์โทรศัพท์ (ตัวเลขเท่านั้น)
              </Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="h-11 rounded-xl"
                placeholder="0xxxxxxxxx"
                maxLength={10}
              />
            </div>


            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                ตำแหน่ง (ไม่สามารถแก้ไข)
              </Label>
              <div className="h-11 rounded-xl bg-gray-50 flex items-center px-3">
                {profile.role ? (
                  <Badge className={`${getRoleColor(profile.role)} border-none`}>
                    {getRoleLabel(profile.role)}
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-400">ยังไม่ได้กำหนดตำแหน่ง</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                แผนก (ไม่สามารถแก้ไข)
              </Label>
              <Input
                value={profile.departmentName || 'ยังไม่ได้กำหนดแผนก'}
                disabled
                className="h-11 rounded-xl bg-gray-50"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleUpdateProfile}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  บันทึกการเปลี่ยนแปลง
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-orange-600" />
            เปลี่ยนรหัสผ่าน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                รหัสผ่านปัจจุบัน
              </Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="h-11 rounded-xl pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                รหัสผ่านใหม่
              </Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="h-11 rounded-xl pr-10"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                ยืนยันรหัสผ่านใหม่
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="h-11 rounded-xl pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="bg-orange-600 hover:bg-orange-700 rounded-xl px-6"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังเปลี่ยนรหัสผ่าน...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  เปลี่ยนรหัสผ่าน
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Signature Card */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Signature className="w-5 h-5 text-purple-600" />
            ลายเซ็นดิจิทัล
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-sm text-purple-700">
              ลายเซ็นจะถูกใช้ในการอนุมัติเอกสาร PR/PO ควรใช้รูปลายเซ็นที่ชัดเจน พื้นหลังโปร่งใส (PNG) ขนาดประมาณ 300x100 พิกเซล
            </p>
          </div>


          {profile.signature ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <Check className="w-5 h-5" />
                <span>มีลายเซ็นแล้ว</span>
              </div>
              <Label>ตัวอย่างลายเซ็น</Label>
              <div
                className={`p-6 bg-white rounded-xl border-2 flex items-center justify-center min-h-[120px] transition-all cursor-pointer ${
                  isDraggingSignature ? 'border-purple-500 bg-purple-50 scale-[1.01] shadow-lg' : 'border-green-200 hover:border-purple-300'
                }`}
                onDragEnter={handleSigDragEnter}
                onDragLeave={handleSigDragLeave}
                onDragOver={handleSigDragOver}
                onDrop={handleSigDrop}
                onClick={() => signatureInputRef.current?.click()}
              >
                {isDraggingSignature ? (
                  <p className="text-purple-600 font-bold">📥 ปล่อยรูปเพื่อเปลี่ยนลายเซ็น</p>
                ) : (
                  <img
                    src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${currentUser?.id}/${profile.signature}?t=${Date.now()}`}
                    alt="ลายเซ็น"
                    className="max-h-24 object-contain"
                    onError={(e) => {
                      console.error('Failed to load signature image:', profile.signature);
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-red-500 text-sm">โหลดรูปไม่สำเร็จ</span>';
                    }}
                  />
                )}
              </div>
              <p className="text-xs text-gray-400 text-center">ลากรูปมาวางเพื่อเปลี่ยน หรือคลิกเพื่อเลือกไฟล์</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => signatureInputRef.current?.click()}
                  disabled={uploadingSignature}
                  className="rounded-xl flex-1"
                >
                  {uploadingSignature ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  เปลี่ยนลายเซ็น
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteSignature}
                  disabled={uploadingSignature}
                  className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                >
                  <X className="w-4 h-4 mr-2" />
                  ลบ
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`p-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  isDraggingSignature
                    ? 'border-purple-500 bg-purple-50 scale-[1.01] shadow-lg'
                    : 'border-gray-200 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/30'
                }`}
                onDragEnter={handleSigDragEnter}
                onDragLeave={handleSigDragLeave}
                onDragOver={handleSigDragOver}
                onDrop={handleSigDrop}
                onClick={() => signatureInputRef.current?.click()}
              >
                {isDraggingSignature ? (
                  <>
                    <Upload className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                    <p className="text-purple-600 font-bold">📥 ปล่อยรูปเพื่ออัปโหลดลายเซ็น</p>
                  </>
                ) : (
                  <>
                    <Signature className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-700 font-bold">ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์</p>
                    <p className="text-gray-400 text-xs mt-1">รองรับ PNG, JPG (สูงสุด 5 MB)</p>
                  </>
                )}
              </div>
            </div>
          )}
          <input
            type="file"
            ref={signatureInputRef}
            onChange={handleSignatureUpload}
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* LINE Integration Card */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="w-5 h-5 text-green-500" />
            LINE Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="text-sm text-green-700">
              ผูก LINE กับบัญชีของคุณเพื่อรับการแจ้งเตือนและยืนยันตัวตนผ่าน LINE
            </p>
          </div>

          {/* QR Code Section - แสกนเพิ่มเพื่อน */}
          <div className="flex flex-col md:flex-row gap-6 p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200">
            <div className="flex-shrink-0">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                {/* QR Code for LINE Bot @672fdxrk */}
                <img 
                  src="https://qr-official.line.me/gs/M_672fdxrk_GW.png" 
                  alt="LINE QR Code" 
                  className="w-40 h-40 object-contain"
                  onError={(e) => {
                    // Fallback to direct link if QR fails
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <h3 className="font-bold text-green-800 text-lg">เพิ่มเพื่อน LINE Bot</h3>
              </div>
              <p className="text-sm text-green-700">
                <strong>Bot ID:</strong> @672fdxrk
              </p>
              <p className="text-sm text-green-600">
                แสกน QR Code ด้านบน หรือกดปุ่มด้านล่างเพื่อเพิ่มเพื่อน
              </p>
              <Button
                onClick={() => window.open('https://line.me/R/ti/p/@672fdxrk', '_blank')}
                className="bg-green-600 hover:bg-green-700 rounded-xl"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                เพิ่มเพื่อน LINE
              </Button>
              <p className="text-xs text-green-600 mt-2">
                💡 หลังจากเพิ่มเพื่อนแล้ว ส่งข้อความใดๆ เพื่อดู LINE User ID ของคุณ
              </p>
            </div>
          </div>

          {/* สถานะการเชื่อมต่อ */}
          <div className="flex items-center gap-3 p-4 rounded-xl border-2">
            {lineLinked ? (
              <>
                <div className="p-3 bg-green-100 rounded-full">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">เชื่อมต่อแล้ว</p>
                  <p className="text-sm text-gray-500">LINE User ID: {lineUserId}</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-gray-100 rounded-full">
                  <Link className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">ยังไม่ได้เชื่อมต่อ</p>
                  <p className="text-sm text-gray-500">ผูก LINE เพื่อรับการแจ้งเตือน</p>
                </div>
              </>
            )}
          </div>

          {/* ฟอร์มกรอก LINE User ID */}
          {!lineLinked && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  LINE User ID
                </Label>
                <div className="flex gap-3">
                  <Input
                    value={lineUserId}
                    onChange={(e) => setLineUserId(e.target.value)}
                    className="h-11 rounded-xl flex-1"
                    placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <Button
                    onClick={handleLinkLine}
                    disabled={linkingLine || !lineUserId.trim()}
                    className="bg-green-600 hover:bg-green-700 rounded-xl px-6"
                  >
                    {linkingLine ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังผูก...
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4 mr-2" />
                        ผูก LINE
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-700">
                  <strong>วิธีดู LINE User ID:</strong> ส่งข้อความใดๆ ไปยัง Bot @672fdxrk แล้ว Bot จะตอบกลับพร้อมรหัส คัดลอกมาวางในช่องด้านบน
                </p>
              </div>
            </div>
          )}

          {/* ปุ่มยกเลิกการเชื่อมต่อ */}
          {lineLinked && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => window.open('https://line.me/R', '_blank')}
                className="rounded-xl flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                เปิด LINE
              </Button>
              <Button
                variant="outline"
                onClick={handleUnlinkLine}
                disabled={unlinkingLine}
                className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              >
                {unlinkingLine ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4 mr-2" />
                )}
                ยกเลิกการเชื่อมต่อ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
