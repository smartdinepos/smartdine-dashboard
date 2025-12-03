import api from './apiClient';

export async function fetchCategories (restaurantId) {
  const res = await api.get(`/restaurants/${restaurantId}/categories`);
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && data.data && Array.isArray(data.data.categories)) return data.data.categories;
  if (data && Array.isArray(data.categories)) return data.categories;
  return [];
}

export async function updateCategory (restaurantId, categoryId, data) {
  // Category type is immutable after creation; strip it from update payloads to avoid accidental edits.
  const { type: _ignoredType, ...payload } = data || {};
  const res = await api.patch(`/restaurants/${restaurantId}/categories/${categoryId}`, payload);
  return res.data;
}

export async function createCategory (restaurantId, data) {
  const res = await api.post(`/restaurants/${restaurantId}/categories`, data);
  return res.data;
}

export async function deleteCategory (restaurantId, categoryId) {
  const res = await api.delete(`/restaurants/${restaurantId}/categories/${categoryId}`);
  return res.data;
}
