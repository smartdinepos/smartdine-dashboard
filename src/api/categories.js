import api from './apiClient';

export async function fetchCategories (restaurantId, params = {}) {
  const res = await api.get(`/restaurants/${restaurantId}/menu-categories`, { params });
  const data = res.data;
  if (data?.data && Array.isArray(data.data.categories)) return data.data.categories;
  if (data && Array.isArray(data.categories)) return data.categories;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function updateCategory (restaurantId, categoryId, data) {
  // Category type is immutable after creation; strip it from update payloads to avoid accidental edits.
  const { type: _ignoredType, ...payload } = data || {};
  const res = await api.patch(`/restaurants/${restaurantId}/menu-categories/${categoryId}`, payload);
  return res.data;
}

export async function createCategory (restaurantId, data) {
  const res = await api.post(`/restaurants/${restaurantId}/menu-categories`, data);
  return res.data;
}

export async function deleteCategory (restaurantId, categoryId) {
  const res = await api.delete(`/restaurants/${restaurantId}/menu-categories/${categoryId}`);
  return res.data;
}
