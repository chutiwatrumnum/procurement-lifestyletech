import { useQuery } from '@tanstack/react-query';
import pb from '@/lib/pocketbase';

export const catalogKeys = {
    all: ['productCatalog'] as const,
};

export function useProductCatalog() {
    return useQuery({
        queryKey: catalogKeys.all,
        queryFn: async () => {
            try {
                return await pb.collection('product_catalog').getFullList({
                    sort: 'category,name',
                });
            } catch {
                // Collection might not exist yet — return empty array
                return [];
            }
        },
        staleTime: 5 * 60 * 1000, // cache 5 minutes
        retry: false
    });
}
