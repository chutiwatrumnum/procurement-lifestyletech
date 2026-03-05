import { useState, useRef, useCallback } from 'react';
import { Upload, X, File, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// --- Types ---
export interface ExistingFile {
  /** Display name of the file */
  name: string;
  /** Optional URL to view/download the file */
  url?: string;
}

interface FileUploadManagerProps {
  /** Existing files already saved on the server */
  existingFiles?: ExistingFile[];
  /** Newly selected files (not yet saved) */
  newFiles?: File[];
  /** Called when user adds files (via drag or click) */
  onAddFiles: (files: File[]) => void;
  /** Called when user removes an existing file by index */
  onRemoveExisting?: (index: number) => void;
  /** Called when user removes a new file by index */
  onRemoveNew?: (index: number) => void;
  /** Accepted file types */
  accept?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Label for the drop zone */
  label?: string;
  /** Sub-label for the drop zone */
  sublabel?: string;
  /** Accent color theme: 'blue' | 'purple' | 'green' */
  accent?: 'blue' | 'purple' | 'green';
  /** Unique id for the hidden input */
  id?: string;
}

const accentClasses = {
  blue: {
    existing: 'bg-blue-50 hover:bg-blue-100',
    existingIcon: 'bg-blue-100 text-blue-600',
    existingLabel: 'text-blue-500',
    new: 'bg-green-50 hover:bg-green-100',
    newIcon: 'bg-green-100 text-green-600',
    dragBorder: 'border-blue-500 bg-blue-50',
    dragIcon: 'bg-blue-200',
    dragIconColor: 'text-blue-700',
    normalIcon: 'bg-blue-50',
    normalIconColor: 'text-blue-600',
  },
  purple: {
    existing: 'bg-purple-50 hover:bg-purple-100',
    existingIcon: 'bg-purple-100 text-purple-600',
    existingLabel: 'text-purple-500',
    new: 'bg-green-50 hover:bg-green-100',
    newIcon: 'bg-green-100 text-green-600',
    dragBorder: 'border-purple-500 bg-purple-50',
    dragIcon: 'bg-purple-200',
    dragIconColor: 'text-purple-700',
    normalIcon: 'bg-purple-50',
    normalIconColor: 'text-purple-600',
  },
  green: {
    existing: 'bg-blue-50 hover:bg-blue-100',
    existingIcon: 'bg-blue-100 text-blue-600',
    existingLabel: 'text-blue-500',
    new: 'bg-green-50 hover:bg-green-100',
    newIcon: 'bg-green-100 text-green-600',
    dragBorder: 'border-green-500 bg-green-50',
    dragIcon: 'bg-green-200',
    dragIconColor: 'text-green-700',
    normalIcon: 'bg-green-50',
    normalIconColor: 'text-green-600',
  },
};

export default function FileUploadManager({
  existingFiles = [],
  newFiles = [],
  onAddFiles,
  onRemoveExisting,
  onRemoveNew,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls',
  multiple = true,
  label = 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์',
  sublabel = 'รองรับไฟล์ PDF, Word, Excel, รูปภาพ (สูงสุด 10 MB ต่อไฟล์)',
  accent = 'blue',
  id = 'file-upload-manager',
}: FileUploadManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const colors = accentClasses[accent];

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
    if (dragCounter.current === 0) setIsDragging(false);
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
    if (files.length > 0) onAddFiles(multiple ? files : [files[0]]);
  }, [onAddFiles, multiple]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onAddFiles(Array.from(files));
    e.target.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const totalFiles = existingFiles.length + newFiles.length;

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? `${colors.dragBorder} scale-[1.01] shadow-lg`
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
            isDragging ? `${colors.dragIcon} scale-110` : colors.normalIcon
          }`}>
            <Upload className={`w-6 h-6 transition-all ${
              isDragging ? colors.dragIconColor : colors.normalIconColor
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

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            ไฟล์ที่มีอยู่ ({existingFiles.length})
          </Label>
          {existingFiles.map((file, index) => (
            <div
              key={`existing-${index}`}
              className={`flex items-center justify-between p-3 rounded-xl transition-all group ${colors.existing}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2 rounded-lg shrink-0 ${colors.existingIcon}`}>
                  <File className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{file.name}</p>
                  <p className={`text-xs ${colors.existingLabel}`}>ไฟล์เดิม</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {file.url && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {onRemoveExisting && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-gray-300 hover:bg-red-100 hover:text-red-600"
                    onClick={() => onRemoveExisting(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Files */}
      {newFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-bold text-green-500 uppercase tracking-wider">
            ไฟล์ใหม่ ({newFiles.length})
          </Label>
          {newFiles.map((file, index) => (
            <div
              key={`new-${index}`}
              className={`flex items-center justify-between p-3 rounded-xl transition-all group ${colors.new}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`p-2 rounded-lg shrink-0 ${colors.newIcon}`}>
                  <File className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                </div>
              </div>
              {onRemoveNew && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg shrink-0 text-gray-300 hover:bg-red-100 hover:text-red-600"
                  onClick={() => onRemoveNew(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {totalFiles > 0 && (
        <p className="text-xs text-gray-400 text-right">
          รวมทั้งหมด {totalFiles} ไฟล์
        </p>
      )}
    </div>
  );
}
