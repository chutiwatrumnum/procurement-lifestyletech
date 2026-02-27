import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import pb from '@/lib/pocketbase';

export const userKeys = {
    all: ['users'] as const,
    departments: ['departments'] as const,
};

export function useUsers() {
    return useQuery({
        queryKey: userKeys.all,
        queryFn: async () => {
            const users = await pb.collection('users').getFullList({
                sort: '-created',
            });
            return users;
        },
    });
}

export function useDepartments() {
    return useQuery({
        queryKey: userKeys.departments,
        queryFn: async () => {
            try {
                const departments = await pb.collection('departments').getFullList();
                return departments;
            } catch {
                return [];
            }
        },
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => pb.collection('users').create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => pb.collection('users').update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => pb.collection('users').delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
    });
}
