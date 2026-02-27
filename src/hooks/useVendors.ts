import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorService } from '@/services/api';

export const vendorKeys = {
    all: ['vendors'] as const,
    detail: (id: string) => ['vendors', id] as const,
};

export function useVendors() {
    return useQuery({
        queryKey: vendorKeys.all,
        queryFn: () => vendorService.getAll(),
    });
}

export function useVendor(id: string | undefined) {
    return useQuery({
        queryKey: vendorKeys.detail(id!),
        queryFn: () => vendorService.getById(id!),
        enabled: !!id,
    });
}

export function useCreateVendor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => vendorService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorKeys.all });
        },
    });
}

export function useUpdateVendor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => vendorService.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: vendorKeys.all });
            queryClient.invalidateQueries({ queryKey: vendorKeys.detail(variables.id) });
        },
    });
}

export function useDeleteVendor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => vendorService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorKeys.all });
        },
    });
}
