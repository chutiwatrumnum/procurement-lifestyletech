import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prService } from '@/services/api';
import pb from '@/lib/pocketbase';

export const prKeys = {
    all: ['purchaseRequests'] as const,
    list: (filter?: string) => ['purchaseRequests', 'list', filter ?? ''] as const,
    detail: (id: string) => ['purchaseRequests', id] as const,
    items: (prId: string) => ['purchaseRequests', prId, 'items'] as const,
    history: (prId: string) => ['purchaseRequests', prId, 'history'] as const,
    projectSpent: (projectId: string) => ['purchaseRequests', 'projectSpent', projectId] as const,
};

export function usePurchaseRequests(filter = '', options?: { expand?: string }) {
    return useQuery({
        queryKey: prKeys.list(filter),
        queryFn: () => prService.getAll(filter, options),
    });
}

export function usePurchaseRequest(id: string | undefined) {
    return useQuery({
        queryKey: prKeys.detail(id!),
        queryFn: async () => {
            const pr = await prService.getById(id!);
            // ถ้ามี vendor แต่ expand.vendor ไม่มี (อาจถูกลบ) ให้ดึงข้อมูล vendor โดยตรง
            if (pr.vendor && !pr.expand?.vendor) {
                try {
                    const vendor = await pb.collection('vendors').getOne(pr.vendor);
                    pr.expand = { ...pr.expand, vendor };
                } catch {
                    // vendor ถูกลบไปแล้ว
                }
            }
            return pr;
        },
        enabled: !!id,
    });
}

export function usePRItems(prId: string | undefined) {
    return useQuery({
        queryKey: prKeys.items(prId!),
        queryFn: () => prService.getItems(prId!),
        enabled: !!prId,
    });
}

export function useDeletePR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => prService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: prKeys.all });
        },
    });
}
