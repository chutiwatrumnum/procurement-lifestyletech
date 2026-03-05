import { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileDropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  id?: string;
}

export default function FileDropZone({ 
  onFiles, 
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  multiple = true,
  label = 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์',
  sublabel = 'รองรับไฟล์ PDF, Word, รูปภาพ (สูงสุด 5 MB ต่อไฟล์)',
  id = 'file-drop-zone'
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFiles(multiple ? files : [files[0]]);
    }
  }, [onFiles, multiple]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFiles(Array.from(files));
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-lg shadow-blue-500/10'
          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        id={id}
      />
      <div className="flex flex-col items-center gap-3">
        <div className={`p-4 rounded-full transition-all ${
          isDragging ? 'bg-blue-200 scale-110' : 'bg-blue-50'
        }`}>
          <Upload className={`w-6 h-6 transition-all ${
            isDragging ? 'text-blue-700' : 'text-blue-600'
          }`} />
        </div>
        <div>
          <p className="font-bold text-gray-700">
            {isDragging ? '📥 ปล่อยไฟล์เพื่ออัพโหลด' : label}
          </p>
          <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
        </div>
      </div>
    </div>
  );
}
