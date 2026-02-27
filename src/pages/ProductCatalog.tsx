import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';
import { useProductCatalog, catalogKeys } from '@/hooks/useProductCatalog';

interface ProductForm {
  name: string;
  unit_price: number;
  category: string;
}

const emptyForm: ProductForm = { name: '', unit_price: 0, category: '' };

const CATEGORIES = [
  'เซ็นเซอร์',
  'ตัวควบคุม',
  'อุปกรณ์เครือข่าย',
  'โมดูล',
  'บอร์ด',
  'จอแสดงผล',
  'แหล่งจ่ายไฟ',
  'สายไฟและสายสัญญาณ',
  'อุปกรณ์เสริม',
  'อื่นๆ',
];

export default function ProductCatalog() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useProductCatalog();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter products
  const filtered = products.filter((p: any) => {
    const matchSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  // Group by category for display
  const grouped = filtered.reduce<Record<string, any[]>>((acc, p: any) => {
    const cat = p.category || 'ไม่ระบุหมวด';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  // Get unique categories from data
  const categories = [...new Set(products.map((p: any) => p.category).filter(Boolean))];

  const openAddDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (product: any) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      unit_price: product.unit_price || 0,
      category: product.category || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('กรุณาระบุชื่อสินค้า');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await pb.collection('product_catalog').update(editingId, form);
        toast.success('แก้ไขสินค้าเรียบร้อย');
      } else {
        await pb.collection('product_catalog').create(form);
        toast.success('เพิ่มสินค้าเรียบร้อย');
      }
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await pb.collection('product_catalog').delete(deletingId);
      toast.success('ลบสินค้าเรียบร้อย');
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      toast.error('ลบไม่สำเร็จ');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">รายการอุปกรณ์ IOT</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการรายการอุปกรณ์สำหรับใช้ในใบขอซื้อ — ทั้งหมด {products.length} รายการ</p>
        </div>
        <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold">
          <Plus className="w-4 h-4 mr-2" /> เพิ่มสินค้า
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="pl-10 h-11 rounded-xl bg-gray-50 border-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterCategory === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory('')}
            className="rounded-xl text-xs"
          >
            ทั้งหมด
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={filterCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
              className="rounded-xl text-xs"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Product List */}
      {Object.keys(grouped).length === 0 ? (
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">
              {searchTerm ? 'ไม่พบสินค้าที่ตรงกัน' : 'ยังไม่มีสินค้าในระบบ'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'กดปุ่ม "เพิ่มสินค้า" เพื่อเริ่มต้นเพิ่มสินค้า'}
            </p>
            {!searchTerm && (
              <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> เพิ่มสินค้าตัวแรก
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <Card key={category} className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="py-4 px-6 bg-gray-50/50">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-600">
                <Tag className="w-4 h-4 text-blue-500" />
                {category}
                <Badge variant="secondary" className="ml-2 text-[10px]">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#9CA3AF] font-bold border-b border-gray-50 uppercase text-[10px] tracking-widest">
                      <th className="py-3 px-6 text-left">ชื่ออุปกรณ์</th>
                      <th className="py-3 px-4 text-right w-32">ราคา</th>
                      <th className="py-3 px-4 text-right w-24">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((p: any) => (
                      <tr key={p.id} className="group hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-6">
                          <p className="font-bold text-gray-900">{p.name}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-gray-900">
                          {p.unit_price > 0 ? `฿${p.unit_price.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(p)}
                              className="h-8 w-8 text-blue-500 hover:text-blue-700 rounded-full"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setDeletingId(p.id); setDeleteDialogOpen(true); }}
                              className="h-8 w-8 text-red-300 hover:text-red-500 rounded-full"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'แก้ไขข้อมูลสินค้าที่ต้องการ' : 'เพิ่มสินค้าเข้าสู่รายการเพื่อเลือกใช้ในใบขอซื้อ'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold">ชื่ออุปกรณ์ *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น ESP32, DHT22, Relay Module"
                className="h-11 rounded-xl bg-gray-50 border-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">ราคา (฿)</Label>
              <Input
                type="number"
                value={form.unit_price || ''}
                onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                placeholder="0"
                className="h-11 rounded-xl bg-gray-50 border-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">หมวดหมู่</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <Button
                    key={cat}
                    type="button"
                    variant={form.category === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm({ ...form, category: form.category === cat ? '' : cat })}
                    className="rounded-xl text-xs"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="หรือพิมพ์หมวดหมู่เอง..."
                className="h-10 rounded-xl bg-gray-50 border-none mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'บันทึก' : 'เพิ่มสินค้า'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600">ยืนยันการลบ</DialogTitle>
            <DialogDescription>คุณต้องการลบสินค้านี้ออกจากรายการหรือไม่?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">ยกเลิก</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold">ลบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
