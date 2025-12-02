import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCategories, updateCategory } from '../api/categories';

export function useCategories(restaurantId) {
    return useQuery({
        queryKey: ['categories', restaurantId],
        queryFn: () => fetchCategories(restaurantId),
        enabled: !!restaurantId,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ restaurantId, categoryId, data }) => updateCategory(restaurantId, categoryId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['categories', variables.restaurantId]);
        }
    });
}
