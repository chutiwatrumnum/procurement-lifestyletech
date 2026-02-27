import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services/api';
import pb from '@/lib/pocketbase';

export const projectKeys = {
    all: ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
    detailFull: (id: string) => ['projects', id, 'full'] as const,
    items: (id: string) => ['projects', id, 'items'] as const,
};

export function useProjects() {
    return useQuery({
        queryKey: projectKeys.all,
        queryFn: () => projectService.getAll(),
    });
}

export function useProject(id: string | undefined) {
    return useQuery({
        queryKey: projectKeys.detail(id!),
        queryFn: () => projectService.getById(id!),
        enabled: !!id,
    });
}

export function useProjectItems(projectId: string | undefined) {
    return useQuery({
        queryKey: projectKeys.items(projectId!),
        queryFn: () => pb.collection('project_items').getFullList({
            filter: `project = "${projectId}"`,
            sort: 'name'
        }),
        enabled: !!projectId,
    });
}

export function useProjectDetail(projectId: string | undefined) {
    return useQuery({
        queryKey: projectKeys.detailFull(projectId!),
        queryFn: async () => {
            const project = await pb.collection('projects').getOne(projectId!);

            const prProjects = await pb.collection('purchase_requests').getFullList({
                filter: `project = "${projectId}" && type = "project"`,
                sort: '-created'
            });

            const itemsData = await pb.collection('project_items').getFullList({
                filter: `project = "${projectId}"`,
                sort: 'name'
            });

            const prSubs = await pb.collection('purchase_requests').getFullList({
                filter: `project = "${projectId}" && type = "sub"`,
                sort: '-created'
            });

            const prSubsApproved = await pb.collection('purchase_requests').getFullList({
                filter: `project = "${projectId}" && type = "sub" && status = "approved"`,
                expand: 'pr_items'
            });

            const withdrawnMap: Record<string, number> = {};
            const withdrawnDetailsMap: Record<string, any[]> = {};

            for (const prSub of prSubsApproved) {
                const prItems = await pb.collection('pr_items').getFullList({
                    filter: `pr = "${prSub.id}" && (item_type = "regular" || item_type = "")`,
                    expand: 'project_item'
                });

                for (const item of prItems) {
                    const projectItemId = item.project_item;
                    if (projectItemId) {
                        withdrawnMap[projectItemId] = (withdrawnMap[projectItemId] || 0) + (item.quantity || 0);
                        if (!withdrawnDetailsMap[projectItemId]) {
                            withdrawnDetailsMap[projectItemId] = [];
                        }
                        withdrawnDetailsMap[projectItemId].push({
                            pr_number: (prSub as any).pr_number,
                            quantity: item.quantity || 0,
                            unit_price: item.unit_price || 0,
                            total: (item.quantity || 0) * (item.unit_price || 0),
                            date: prSub.created
                        });
                    }
                }
            }

            const projectItems = itemsData.map((item: any) => ({
                ...item,
                withdrawn: withdrawnMap[item.id] || 0,
                withdrawnDetails: withdrawnDetailsMap[item.id] || []
            }));

            const reserveItems: any[] = [];
            let reserveTotal = 0;

            for (const prSub of prSubsApproved) {
                const prItems = await pb.collection('pr_items').getFullList({
                    filter: `pr = "${prSub.id}" && item_type = "reserve"`
                });

                for (const item of prItems) {
                    reserveItems.push({
                        id: item.id,
                        name: item.name,
                        unit: item.unit || 'งาน',
                        quantity: item.quantity || 0,
                        unit_price: item.unit_price || 0,
                        total_price: item.total_price || 0,
                        pr_number: (prSub as any).pr_number,
                        created: prSub.created
                    });
                    reserveTotal += item.total_price || 0;
                }
            }

            const totalPlanned = projectItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
            const totalWithdrawn = projectItems.reduce((sum: number, item: any) => {
                const wTotal = item.withdrawnDetails?.reduce((ds: number, d: any) => ds + d.total, 0) || 0;
                return sum + wTotal;
            }, 0);

            return {
                project,
                prProjects,
                prSubs,
                projectItems,
                reserveItems,
                reserveTotal,
                stats: {
                    totalPlanned,
                    totalWithdrawn,
                    remaining: totalPlanned - totalWithdrawn,
                    totalReserve: reserveTotal
                }
            };
        },
        enabled: !!projectId,
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => projectService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.all });
        },
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => pb.collection('projects').update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: projectKeys.all });
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
        },
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => pb.collection('projects').delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.all });
        },
    });
}
