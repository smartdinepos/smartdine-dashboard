// hooks/useMenuItems.js
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllMenuItemsByRestaurant, updateMenuItem } from '../api/menuItems';

const normalizeId = (value) => (value === undefined || value === null ? '' : String(value));

export function useMenuItems (restaurantId, filters = {}) {
  const stableFilterKey = useMemo(
    () => JSON.stringify(filters || {}),
    [filters]
  );
  const baseKey = useMemo(() => ['menu-items-all', restaurantId], [restaurantId]);
  const normalizedFilters = useMemo(
    () => (filters && typeof filters === 'object' ? filters : {}),
    [stableFilterKey]
  );

  return useQuery({
    queryKey: [...baseKey, stableFilterKey],
    queryFn: () => getAllMenuItemsByRestaurant(restaurantId, normalizedFilters),
    enabled: !!restaurantId,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
}

export function useUpdateMenuItem (restaurantId) {
  const qc = useQueryClient();
  const baseKey = useMemo(() => ['menu-items-all', restaurantId], [restaurantId]);

  return useMutation({
    mutationFn: ({ itemId, data }) => updateMenuItem(restaurantId, itemId, data),

    async onMutate ({ itemId, data }) {
      await qc.cancelQueries({ queryKey: baseKey });
      const previous = qc.getQueriesData({ queryKey: baseKey });

      if (data && (data.description != null || data.name != null || data.comboItems != null || data.combos != null || data.categoryId != null || data.category != null)) {
        qc.setQueriesData({ queryKey: baseKey }, (old) => {
          if (!old?.items) return old;
          const comboItems =
            data.comboItems ??
            data.comboIds ??
            data.upsellItems ??
            (Array.isArray(data.combos) ? data.combos : undefined);

          return {
            ...old,
            items: old.items.map((it) => {
              if (normalizeId(it._id) !== normalizeId(itemId)) return it;
              return {
                ...it,
                ...data,
                ...(comboItems ? { comboItems } : {})
              };
            })
          };
        });
      }
      return { previous };
    },

    onError (_err, _vars, ctx) {
      if (ctx?.previous) {
        ctx.previous.forEach(([key, data]) => {
          qc.setQueryData(key, data);
        });
      }
    },

    onSuccess (updated) {
      if (!updated?._id) return;
      qc.setQueriesData({ queryKey: baseKey }, (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map(it => (normalizeId(it._id) === normalizeId(updated._id) ? { ...it, ...updated } : it))
        };
      });
    },

    onSettled () {
      qc.invalidateQueries({ queryKey: baseKey });
    }
  });
}
