import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prService } from '@/services/api';

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
        queryFn: () => prService.getById(id!),
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

export function usePRHistory(prId: string | undefined) {
    return useQuery({
        queryKey: prKeys.history(prId!),
        queryFn: () => prService.getHistory(prId!),
        enabled: !!prId,
    });
}

export function useProjectTotalSpent(projectId: string | undefined) {
    return useQuery({
        queryKey: prKeys.projectSpent(projectId!),
        queryFn: () => prService.getProjectTotalSpent(projectId!),
        enabled: !!projectId,
    });
}

export function useCreatePR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ data, items }: { data: any; items: any[] }) => prService.create(data, items),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: prKeys.all });
        },
    });
}

export function useUpdatePR() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => prService.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: prKeys.all });
            queryClient.invalidateQueries({ queryKey: prKeys.detail(variables.id) });
        },
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

export function useUpdatePRStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason, userId, oldAttachments }: { id: string; status: string; reason?: string; userId?: string; oldAttachments?: string[] }) =>
            prService.updateStatus(id, status, reason, userId, oldAttachments),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: prKeys.all });
        },
    });
}

export function useApprovePRSub() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, userId, comment }: { id: string; userId?: string; comment?: string }) =>
            prService.approveSub(id, userId, comment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: prKeys.all });
        },
    });
}

export function useDeletePRItems() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (prId: string) => prService.deleteItems(prId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: prKeys.all });
        },
    });
}

export function useCreatePRItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => prService.createItem(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: prKeys.all });
        },
    });
}
