import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { prService } from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Loader2, Lock, Mail, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('เข้าสู่ระบบสำเร็จ');
      
      // เช็ครายการรออนุมัติและโดนตีกลับ
      try {
        const allPRs = await prService.getAll();
        const pendingCount = allPRs.filter(p => p.status === 'pending').length;
        const rejectedCount = allPRs.filter(p => p.status === 'rejected').length;
        
        if (pendingCount > 0 || rejectedCount > 0) {
          let message = '';
          if (pendingCount > 0) message += `📋 รออนุมัติ: ${pendingCount} รายการ`;
          if (rejectedCount > 0) message += `\n🔴 ถูกตีกลับ: ${rejectedCount} รายการ`;
          toast.info(message);
        }
      } catch (err) {
        console.log('Could not fetch PR notifications');
      }
      
      navigate('/');
    } catch (err: any) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      toast.error('เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(email, password, name);
      toast.success('สมัครสมาชิกและเข้าสู่ระบบสำเร็จ');
      navigate('/');
    } catch (err: any) {
      setError(err.data?.message || 'ไม่สามารถสมัครสมาชิกได้');
      toast.error('การสมัครสมาชิกขัดข้อง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4 font-sans">
      <div className="w-full max-w-[440px]">
        {/* Branding */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-[#2563EB] rounded-2xl shadow-lg shadow-blue-500/20">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-black text-[#1F2937] tracking-tighter">ProcureReal</h1>
              <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em] leading-none mt-1">REAL ESTATE ERP</p>
            </div>
          </div>
        </div>

        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-16 bg-[#F9FAFB] rounded-none p-1">
                <TabsTrigger 
                  value="login" 
                  className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#2563EB] font-bold text-gray-400 border-none h-full"
                >
                  เข้าสู่ระบบ
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="rounded-none data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-[#2563EB] font-bold text-gray-400 border-none h-full"
                >
                  สมัครสมาชิก
                </TabsTrigger>
              </TabsList>

              {/* Login Content */}
              <TabsContent value="login" className="p-8 pt-6 outline-none">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1F2937]">ยินดีต้อนรับกลับมา</h2>
                  <p className="text-sm text-[#6B7280] font-medium mt-1">กรอกข้อมูลบัญชีเพื่อเข้าจัดการระบบจัดซื้อ</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">อีเมลบริษัท</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        className="pl-12 h-14 bg-[#F9FAFB] border-none rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-gray-300"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <Label htmlFor="password" className="text-xs font-black text-gray-400 uppercase tracking-widest">รหัสผ่าน</Label>
                      <Button variant="link" className="px-0 h-auto text-[10px] font-black text-[#2563EB] uppercase tracking-widest hover:no-underline">ลืมรหัสผ่าน?</Button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-12 h-14 bg-[#F9FAFB] border-none rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-gray-300"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl animate-in fade-in slide-in-from-top-1">
                      {error}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] mt-4 uppercase text-xs tracking-[0.2em]" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Content */}
              <TabsContent value="register" className="p-8 pt-6 outline-none">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[#1F2937]">เริ่มต้นใช้งานจริง</h2>
                  <p className="text-sm text-[#6B7280] font-medium mt-1">สร้างบัญชีผู้ใช้งานใหม่สำหรับพนักงานในบริษัท</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ชื่อ-นามสกุล</Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="สมชาย ใจดี"
                        className="pl-12 h-14 bg-[#F9FAFB] border-none rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-gray-300"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">อีเมลบริษัท</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="name@company.com"
                        className="pl-12 h-14 bg-[#F9FAFB] border-none rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-gray-300"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">กำหนดรหัสผ่าน</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-12 h-14 bg-[#F9FAFB] border-none rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-gray-300"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-[#1F2937] hover:bg-[#111827] text-white font-black rounded-2xl shadow-xl shadow-gray-900/10 transition-all active:scale-[0.98] mt-4 uppercase text-xs tracking-[0.2em]" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-[0.2em]">
            © 2024 ProcureReal ERP. สงวนลิขสิทธิ์
          </p>
        </div>
      </div>
    </div>
  );
}
