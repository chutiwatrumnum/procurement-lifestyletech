import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Package,
  Download,
  ArrowUpDown,
} from 'lucide-react';

// Mock data
const mockProducts = [
  {
    id: '1',
    code: 'PRD-001',
    name: 'คอมพิวเตอร์ตั้งโต๊ะ',
    nameLocal: 'Desktop Computer',
    category: 'IT Equipment',
    unit: 'เครื่อง',
    currentStock: 15,
    minStock: 5,
    lastPrice: 25000,
    currency: 'THB',
    status: 'active' as const,
  },
  {
    id: '2',
    code: 'PRD-002',
    name: 'โน๊ตบุ๊ค',
    nameLocal: 'Laptop',
    category: 'IT Equipment',
    unit: 'เครื่อง',
    currentStock: 8,
    minStock: 3,
    lastPrice: 35000,
    currency: 'THB',
    status: 'active' as const,
  },
  {
    id: '3',
    code: 'PRD-003',
    name: 'กระดาษ A4',
    nameLocal: 'A4 Paper',
    category: 'Office Supplies',
    unit: 'รีม',
    currentStock: 250,
    minStock: 100,
    lastPrice: 120,
    currency: 'THB',
    status: 'active' as const,
  },
  {
    id: '4',
    code: 'PRD-004',
    name: 'Server Dell PowerEdge',
    nameLocal: 'Dell PowerEdge Server',
    category: 'IT Equipment',
    unit: 'เครื่อง',
    currentStock: 2,
    minStock: 1,
    lastPrice: 4500,
    currency: 'USD',
    status: 'active' as const,
  },
  {
    id: '5',
    code: 'PRD-005',
    name: 'เก้าอี้สำนักงาน',
    nameLocal: 'Office Chair',
    category: 'Furniture',
    unit: 'ตัว',
    currentStock: 0,
    minStock: 10,
    lastPrice: 3500,
    currency: 'THB',
    status: 'inactive' as const,
  },
  {
    id: '6',
    code: 'PRD-006',
    name: 'โปรเจคเตอร์',
    nameLocal: 'Projector',
    category: 'IT Equipment',
    unit: 'เครื่อง',
    currentStock: 5,
    minStock: 2,
    lastPrice: 18000,
    currency: 'THB',
    status: 'active' as const,
  },
];

const categories = ['IT Equipment', 'Office Supplies', 'Furniture', 'Services', 'Raw Materials'];

const formatCurrency = (amount: number, currency: string = 'THB') => {
  const locale = currency === 'THB' ? 'th-TH' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

const getStatusConfig = (status: string) => {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'ใช้งาน', variant: 'default' },
    inactive: { label: 'ไม่ใช้งาน', variant: 'secondary' },
  };
  return config[status] || { label: status, variant: 'outline' as const };
};

const getStockStatus = (current: number, min: number) => {
  if (current === 0) return { label: 'หมด', className: 'bg-red-100 text-red-700' };
  if (current <= min) return { label: 'ใกล้หมด', className: 'bg-orange-100 text-orange-700' };
  return { label: 'พอเพียง', className: 'bg-green-100 text-green-700' };
};

export default function ProductList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Filter data
  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch =
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.nameLocal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">สินค้า / บริการ</h1>
          <p className="text-muted-foreground">จัดการรายการสินค้าและบริการทั้งหมด</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            ส่งออก
          </Button>
          <Button asChild>
            <Link to="/products/new">
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มสินค้า
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ทั้งหมด</CardDescription>
            <CardTitle className="text-3xl">{mockProducts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ใช้งาน</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {mockProducts.filter((p) => p.status === 'active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>สต็อกใกล้หมด</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {mockProducts.filter((p) => p.currentStock <= p.minStock && p.currentStock > 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>สต็อกหมด</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {mockProducts.filter((p) => p.currentStock === 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหารหัส, ชื่อ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="หมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" className="h-8 p-0 hover:bg-transparent">
                    รหัส
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>ชื่อสินค้า</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead>หน่วย</TableHead>
                <TableHead className="text-right">สต็อก</TableHead>
                <TableHead className="text-right">ราคาล่าสุด</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8" />
                      <p>ไม่พบสินค้า</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const statusConfig = getStatusConfig(product.status);
                  const stockStatus = getStockStatus(product.currentStock, product.minStock);

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.code}</TableCell>
                      <TableCell>
                        <Link
                          to={`/products/${product.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{product.nameLocal}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium">{product.currentStock}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${stockStatus.className}`}>
                            {stockStatus.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">ขั้นต่ำ: {product.minStock}</p>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.lastPrice, product.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>จัดการ</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to={`/products/${product.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                ดูรายละเอียด
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/products/${product.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                แก้ไข
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              ลบ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          แสดง {filteredProducts.length} จาก {mockProducts.length} รายการ
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            ก่อนหน้า
          </Button>
          <Button variant="outline" size="sm" disabled>
            ถัดไป
          </Button>
        </div>
      </div>
    </div>
  );
}
