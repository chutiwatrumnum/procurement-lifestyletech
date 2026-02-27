import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { poService } from '@/services/api';

export const poKeys = {
    all: ['purchaseOrders'] as const,
};

export function usePurchaseOrders() {
    return useQuery({
        queryKey: poKeys.all,
        queryFn: () => poService.getAll(),
    });
}

export function useCreatePO() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ prId, data }: { prId: string; data: any }) => poService.createFromPR(prId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: poKeys.all });
        },
    });
}
