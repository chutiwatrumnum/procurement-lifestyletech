import { useState, useEffect } from 'react';
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
  Settings2,
  X,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';
import { rules, validateForm } from '@/lib/validation';
import { useProductCatalog, catalogKeys } from '@/hooks/useProductCatalog';
import ProductImportModal from '@/components/ProductImportModal';

interface ProductForm {
  product_code: string;
  name: string;
  unit_price: number;
  category: string;
  factory_code: string;
  factory_name: string;
  cost_dollars: number;
  normal_price_excl_vat: number;
  normal_price_incl_vat: number;
  brand: string;
}

const emptyForm: ProductForm = { 
  product_code: '', 
  name: '', 
  unit_price: 0, 
  category: '',
  factory_code: '',
  factory_name: '',
  cost_dollars: 0,
  normal_price_excl_vat: 0,
  normal_price_incl_vat: 0,
  brand: ''
};

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Dynamic categories from PocketBase
  const [pbCategories, setPbCategories] = useState<any[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Fetch categories from PocketBase
  const fetchCategories = async () => {
    try {
      const result = await pb.collection('product_categories').getFullList({ sort: 'category' });
      setPbCategories(result);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('กรุณาระบุชื่อหมวดหมู่');
      return;
    }
    // Check duplicate
    if (pbCategories.some(c => c.category === newCategoryName.trim())) {
      toast.error('หมวดหมู่นี้มีอยู่แล้ว');
      return;
    }
    setSavingCategory(true);
    try {
      await pb.collection('product_categories').create({ category: newCategoryName.trim() });
      toast.success('เพิ่มหมวดหมู่เรียบร้อย');
      setNewCategoryName('');
      await fetchCategories();
    } catch (err) {
      console.error(err);
      toast.error('เพิ่มหมวดหมู่ไม่สำเร็จ');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await pb.collection('product_categories').delete(id);
      toast.success('ลบหมวดหมู่เรียบร้อย');
      await fetchCategories();
    } catch (err) {
      console.error(err);
      toast.error('ลบหมวดหมู่ไม่สำเร็จ');
    }
  };

  // Filter products - include new fields in search
  const filtered = products.filter((p: any) => {
    const matchSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.factory_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.factory_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase());
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

  // ใช้หมวดหมู่จาก PocketBase เป็นตัวหลัก
  const categories = pbCategories.map((c: any) => c.category);

  const openAddDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (product: any) => {
    setEditingId(product.id);
    setForm({
      product_code: product.product_code || '',
      name: product.name || '',
      unit_price: product.unit_price || 0,
      category: product.category || '',
      factory_code: product.factory_code || '',
      factory_name: product.factory_name || '',
      cost_dollars: product.cost_dollars || 0,
      normal_price_excl_vat: product.normal_price_excl_vat || 0,
      normal_price_incl_vat: product.normal_price_incl_vat || 0,
      brand: product.brand || ''
    });
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const schema = {
      product_code: [rules.required('กรุณาระบุรหัสสินค้า')],
      name: [rules.required('กรุณาระบุชื่อสินค้า')],
    };
    
    const result = validateForm(form, schema);
    setErrors(result.errors);
    
    if (!result.isValid) {
      toast.error('กรุณาตรวจสอบข้อมูลที่กรอก');
    }
    return result.isValid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">รายการอุปกรณ์</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการรายการอุปกรณ์สำหรับใช้ในใบขอซื้อ — ทั้งหมด {products.length} รายการ</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="pl-10 h-10 w-full sm:w-64 rounded-xl bg-white border border-gray-200 shadow-sm text-sm transition-all focus:w-72"
            />
          </div>
          <Button variant="outline" onClick={() => setCategoryDialogOpen(true)} className="rounded-xl font-bold h-10 shadow-sm bg-white">
            <Settings2 className="w-4 h-4 mr-2" /> จัดการ
          </Button>
          <Button variant="outline" onClick={() => setImportModalOpen(true)} className="rounded-xl font-bold h-10 shadow-sm bg-white">
            <Upload className="w-4 h-4 mr-2" /> นำเข้า
          </Button>
          <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold h-10 shadow-sm text-white">
            <Plus className="w-4 h-4 mr-2" /> เพิ่ม
          </Button>
        </div>
      </div>

      {/* Categories Filter */}
      <div className="flex gap-2 flex-wrap bg-gray-50/50 p-2 rounded-2xl border border-gray-100/50">
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
                      <th className="py-3 px-6 text-left w-32">รหัส</th>
                      <th className="py-3 px-6 text-left w-24">รหัสโรงงาน</th>
                      <th className="py-3 px-6 text-left">ชื่ออุปกรณ์</th>
                      <th className="py-3 px-6 text-left w-24">แบรนด์</th>
                      <th className="py-3 px-4 text-right w-24 text-orange-600" title="ราคาทุน (ไทย)">ทุน (฿)</th>
                      <th className="py-3 px-4 text-right w-24 text-orange-600" title="ราคาทุน (ดอลลาร์)">ทุน ($)</th>
                      <th className="py-3 px-4 text-right w-28 text-blue-600" title="ราคา (ไม่รวม VAT)">ราคา (Ex.VAT)</th>
                      <th className="py-3 px-4 text-right w-28 text-green-600" title="ราคา (รวม VAT)">ราคา (Inc.VAT)</th>
                      <th className="py-3 px-4 text-right w-20">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((p: any) => (
                      <tr key={p.id} className="group hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-6">
                          <p className="font-bold text-gray-900">{p.product_code || '-'}</p>
                        </td>
                        <td className="py-3 px-6">
                          <p className="font-medium text-gray-600 whitespace-nowrap">{p.factory_code || '-'}</p>
                        </td>
                        <td className="py-3 px-6">
                          <p className="font-bold text-gray-900">{p.name}</p>
                        </td>
                        <td className="py-3 px-6">
                          <p className="font-medium text-gray-600 whitespace-nowrap">{p.brand || '-'}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-orange-600">
                          {p.unit_price > 0 ? `฿${p.unit_price.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-orange-600">
                          {p.cost_dollars > 0 ? `$${p.cost_dollars.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600">
                          {p.normal_price_excl_vat > 0 ? `฿${p.normal_price_excl_vat.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-green-600">
                          {p.normal_price_incl_vat > 0 ? `฿${p.normal_price_incl_vat.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(p)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setDeletingId(p.id); setDeleteDialogOpen(true); }}
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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
        <DialogContent className="sm:max-w-3xl rounded-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="p-6 border-b border-gray-100 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {editingId ? <Pencil className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
                {editingId ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {editingId ? 'อัปเดตข้อมูลรายละเอียดสินค้าและราคา' : 'เพิ่มสินค้าเข้าสู่แคตตาล็อกเพื่อใช้ในระบบจัดซื้อ'}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Basic Info */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" /> ข้อมูลทั่วไป (General Info)
                </h3>
                
                <div className="space-y-2 relative">
                  <Label className="font-bold text-gray-700">รหัสสินค้า <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.product_code}
                    onChange={(e) => {
                      setForm({ ...form, product_code: e.target.value });
                      setErrors(prev => ({ ...prev, product_code: '' }));
                    }}
                    placeholder="เช่น PRD-001"
                    className={`h-11 rounded-xl bg-white shadow-sm border ${errors.product_code ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10'}`}
                  />
                  {errors.product_code && <p className="text-xs text-red-500 font-medium absolute -bottom-5">{errors.product_code}</p>}
                </div>
                
                <div className="space-y-2 relative pt-2">
                  <Label className="font-bold text-gray-700">ชื่ออุปกรณ์ / สินค้า <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      setErrors(prev => ({ ...prev, name: '' }));
                    }}
                    placeholder="ชื่อสินค้า..."
                    className={`h-11 rounded-xl bg-white shadow-sm border ${errors.name ? 'border-red-400 bg-red-50/30' : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10'}`}
                  />
                  {errors.name && <p className="text-xs text-red-500 font-medium absolute -bottom-5">{errors.name}</p>}
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="font-bold text-gray-700">แบรนด์ (Brand)</Label>
                  <Input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    placeholder="เช่น Apple, Samsung"
                    className="h-11 rounded-xl bg-white shadow-sm border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="font-bold text-gray-700 mb-2 block">หมวดหมู่</Label>
                  <div className="flex flex-wrap gap-2">
                    {pbCategories.map(cat => (
                      <Button
                        key={cat.id}
                        type="button"
                        variant={form.category === cat.category ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setForm({ ...form, category: form.category === cat.category ? '' : cat.category })}
                        className={`rounded-xl text-xs font-semibold ${form.category === cat.category ? 'bg-blue-600 shadow-md shadow-blue-500/20' : 'bg-white hover:bg-gray-100'}`}
                      >
                        {cat.category}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing & Factory */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> ข้อมูลโรงงาน (Factory Info)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-gray-700">รหัสจากโรงงาน</Label>
                      <Input
                        value={form.factory_code}
                        onChange={(e) => setForm({ ...form, factory_code: e.target.value })}
                        placeholder="Factory Code"
                        className="h-11 rounded-xl bg-white shadow-sm border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-gray-700">ชื่อจากโรงงาน</Label>
                      <Input
                        value={form.factory_name}
                        onChange={(e) => setForm({ ...form, factory_name: e.target.value })}
                        placeholder="Factory Name"
                        className="h-11 rounded-xl bg-white shadow-sm border-gray-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="text-xl leading-none font-sans">$</span> ราคา (Pricing)
                  </h3>
                  <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold text-orange-700">ต้นทุนรวม (THB)</Label>
                        <Input
                          type="number"
                          value={form.unit_price || ''}
                          onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                          placeholder="0.00"
                          className="h-11 rounded-xl bg-orange-50 border-orange-100 focus:border-orange-400 font-bold text-orange-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-orange-700 cursor-pointer" title="ต้นทุน (Dollars)">ต้นทุน ($)</Label>
                        <Input
                          type="number"
                          value={form.cost_dollars || ''}
                          onChange={(e) => setForm({ ...form, cost_dollars: Number(e.target.value) })}
                          placeholder="0.00"
                          className="h-11 rounded-xl bg-orange-50 border-orange-100 focus:border-orange-400 font-bold text-orange-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                      <div className="space-y-2">
                        <Label className="font-bold text-blue-700">ราคา Ex.VAT (THB)</Label>
                        <Input
                          type="number"
                          value={form.normal_price_excl_vat || ''}
                          onChange={(e) => setForm({ ...form, normal_price_excl_vat: Number(e.target.value) })}
                          placeholder="0.00"
                          className="h-11 rounded-xl bg-blue-50 border-blue-100 focus:border-blue-400 font-bold text-blue-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-green-700">ราคา Inc.VAT (THB)</Label>
                        <Input
                          type="number"
                          value={form.normal_price_incl_vat || ''}
                          onChange={(e) => setForm({ ...form, normal_price_incl_vat: Number(e.target.value) })}
                          placeholder="0.00"
                          className="h-11 rounded-xl bg-green-50 border-green-100 focus:border-green-400 font-bold text-green-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-100 bg-white flex-shrink-0">
            <DialogFooter className="flex gap-2 sm:gap-0 sm:justify-between w-full">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 sm:flex-none h-12 rounded-xl border-gray-200 font-bold text-gray-600 hover:bg-gray-50">
                ยกเลิก
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 px-8">
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  editingId ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มเข้าระบบ'
                )}
              </Button>
            </DialogFooter>
          </div>
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

      {/* Category Management Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-500" /> จัดการหมวดหมู่สินค้า
            </DialogTitle>
            <DialogDescription>เพิ่มหรือลบหมวดหมู่ที่ใช้จัดกลุ่มสินค้า</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Add new category */}
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="ชื่อหมวดหมู่ใหม่..."
                className="h-10 rounded-xl bg-gray-50 border-none flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button
                onClick={handleAddCategory}
                disabled={savingCategory}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold h-10 px-4"
              >
                {savingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>

            {/* Category list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {pbCategories.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีหมวดหมู่</p>
              ) : (
                pbCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl group hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-sm font-medium text-gray-800">{cat.category}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="h-7 w-7 text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} className="rounded-xl">ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Import Modal */}
      <ProductImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: catalogKeys.all });
          fetchCategories();
        }}
        existingProducts={products.map(p => ({ product_code: p.product_code, name: p.name }))}
      />
    </div>
  );
}
