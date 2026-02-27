import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { Search, Package, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectProduct?: (product: { name: string; unit: string; unit_price: number; category: string }) => void;
  placeholder?: string;
  className?: string;
}

export default function ProductSearchInput({ 
  value, 
  onChange, 
  onSelectProduct, 
  placeholder = 'พิมพ์ค้นหาหรือระบุชื่อสินค้า...',
  className = ''
}: ProductSearchInputProps) {
  const { data: catalog = [] } = useProductCatalog();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position from input element
  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // Close dropdown when clicking outside  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current && !wrapperRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalculate position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Filter catalog by search query
  const filtered = catalog.filter((p: any) => {
    const q = (search || value).toLowerCase();
    if (!q) return true;
    return p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, any[]>>((acc, p: any) => {
    const cat = p.category || 'อื่นๆ';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    updatePosition();
    setIsOpen(true);
  };

  const handleSelect = (product: any) => {
    onChange(product.name);
    setSearch('');
    setIsOpen(false);
    if (onSelectProduct) {
      onSelectProduct({
        name: product.name,
        unit: product.unit || '',
        unit_price: product.unit_price || 0,
        category: product.category || ''
      });
    }
  };

  const handleFocus = () => {
    updatePosition();
    setIsOpen(true);
  };

  const dropdownContent = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 9999,
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto"
    >
      {catalog.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">
          <Package className="w-5 h-5 mx-auto mb-1 text-gray-300" />
          ยังไม่มีสินค้าในระบบ
          <Link to="/products" className="flex items-center justify-center gap-1 text-xs mt-2 text-blue-500 hover:text-blue-700 font-medium">
            <ExternalLink className="w-3 h-3" /> ไปเพิ่มสินค้า
          </Link>
          <p className="text-xs mt-1 text-gray-300">หรือพิมพ์ชื่อสินค้าเองได้เลย</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">
          <Package className="w-5 h-5 mx-auto mb-1 text-gray-300" />
          ไม่พบสินค้าที่ตรงกัน
          <p className="text-xs mt-1 text-gray-300">พิมพ์ชื่อสินค้าเองได้เลย</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, products]) => (
          <div key={category}>
            <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky top-0">
              {category}
            </div>
            {products.map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{p.unit || '-'}</p>
                </div>
                {p.unit_price > 0 && (
                  <span className="text-xs font-bold text-blue-600 whitespace-nowrap">
                    ฿{p.unit_price.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={`h-10 border-none bg-gray-50 rounded-xl pl-9 ${className}`}
        />
      </div>
      {dropdownContent}
    </div>
  );
}
