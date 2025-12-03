import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCategories, updateCategory, createCategory, deleteCategory } from '../api/categories';

export function useCategories (restaurantId) {
  return useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: () => fetchCategories(restaurantId),
    enabled: !!restaurantId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false
  });
}

export function useUpdateCategory () {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ restaurantId, categoryId, data }) => updateCategory(restaurantId, categoryId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['categories', variables.restaurantId]);
    }
  });
}

export function useCreateCategory () {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ restaurantId, data }) => createCategory(restaurantId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['categories', variables.restaurantId]);
    }
  });
}

export function useDeleteCategory () {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ restaurantId, categoryId }) => deleteCategory(restaurantId, categoryId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['categories', variables.restaurantId]);
      queryClient.invalidateQueries(['menu-items-all', variables.restaurantId]);
    }
  });
}
