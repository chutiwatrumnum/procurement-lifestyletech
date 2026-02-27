import { useQuery } from '@tanstack/react-query';
import { prService, projectService } from '@/services/api';

export const dashboardKeys = {
    all: ['dashboard'] as const,
};

export function useDashboardData() {
    return useQuery({
        queryKey: dashboardKeys.all,
        queryFn: async () => {
            const [allPRs, projects] = await Promise.all([
                prService.getAll(),
                projectService.getAll(),
            ]);
            return { allPRs, projects };
        },
    });
}
