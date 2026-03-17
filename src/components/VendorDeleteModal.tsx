import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface VendorDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  vendorName: string;
  isDeleting: boolean;
}

export default function VendorDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  vendorName,
  isDeleting,
}: VendorDeleteModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={isDeleting ? undefined : onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center gap-2 pt-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <DialogTitle className="text-xl font-black text-center text-gray-900 mt-2">
            ยืนยันการลบผู้ขาย?
          </DialogTitle>
          <DialogDescription className="text-center text-gray-500 font-medium pb-2">
            คุณแน่ใจหรือไม่ที่จะลบผู้ขาย{' '}
            <span className="font-bold text-gray-900">"{vendorName}"</span>{' '}
            ออกจากระบบ? ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้กลับมาได้
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:gap-0 mt-4 sm:justify-between w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 sm:flex-none font-bold rounded-xl border-gray-200"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              'ยืนยันการลบ'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
