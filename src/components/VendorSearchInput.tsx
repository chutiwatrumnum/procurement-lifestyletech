import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { vendorService } from '@/services/api';
import { Search, User, Building2 } from 'lucide-react';

interface VendorSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectVendor?: (vendor: { id: string; name: string; contact_person: string; email: string; phone: string }) => void;
  placeholder?: string;
  className?: string;
}

export default function VendorSearchInput({ 
  value, 
  onChange, 
  onSelectVendor, 
  placeholder = 'พิมพ์ค้นหาชื่อบริษัท...',
  className = ''
}: VendorSearchInputProps) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load vendors on mount
  useEffect(() => {
    async function loadVendors() {
      setLoading(true);
      try {
        const data = await vendorService.getAll();
        setVendors(data);
      } catch (err) {
        console.error('Failed to load vendors:', err);
      } finally {
        setLoading(false);
      }
    }
    loadVendors();
  }, []);

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

  // Filter vendors by search query
  const filtered = vendors.filter((v: any) => {
    const q = (search || value).toLowerCase();
    if (!q) return true;
    return v.name?.toLowerCase().includes(q) || 
           v.contact_person?.toLowerCase().includes(q) || 
           v.email?.toLowerCase().includes(q) ||
           v.phone?.toLowerCase().includes(q);
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    updatePosition();
    setIsOpen(true);
  };

  const handleSelect = (vendor: any) => {
    onChange(vendor.name);
    setSearch('');
    setIsOpen(false);
    if (onSelectVendor) {
      onSelectVendor({
        id: vendor.id,
        name: vendor.name,
        contact_person: vendor.contact_person || '',
        email: vendor.email || '',
        phone: vendor.phone || ''
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
      {loading ? (
        <div className="p-4 text-center text-sm text-gray-400">
          กำลังโหลดข้อมูล...
        </div>
      ) : vendors.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">
          <Building2 className="w-5 h-5 mx-auto mb-1 text-gray-300" />
          ยังไม่มีบริษัทผู้รับเหมาในระบบ
          <p className="text-xs mt-1 text-gray-300">พิมพ์ชื่อบริษัทเองได้เลย</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">
          <Search className="w-5 h-5 mx-auto mb-1 text-gray-300" />
          ไม่พบบริษัทที่ตรงกัน
          <p className="text-xs mt-1 text-gray-300">พิมพ์ชื่อบริษัทเองได้เลย</p>
        </div>
      ) : (
        filtered.map((vendor: any) => (
          <button
            key={vendor.id}
            type="button"
            onClick={() => handleSelect(vendor)}
            className="w-full px-3 py-2.5 text-left hover:bg-purple-50 transition-colors flex items-center justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{vendor.name}</p>
              {vendor.contact_person && (
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {vendor.contact_person}
                </p>
              )}
            </div>
            <div className="text-right text-[10px] text-gray-400 whitespace-nowrap">
              {vendor.email && <p className="truncate max-w-[120px]">{vendor.email}</p>}
              {vendor.phone && <p>{vendor.phone}</p>}
            </div>
          </button>
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
