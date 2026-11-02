import { useQuery } from '@tanstack/react-query';
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
