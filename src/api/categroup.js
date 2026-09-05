import api from './apiClient';

export async function fetchCategoryGroups (restaurantId) {
  const res = await api.get(`/restaurants/${restaurantId}/menu-category-groups`);
  return res.data?.data?.categoryGroups || res.data?.categoryGroups || [];
}

export async function createCategoryGroup (restaurantId, data) {
  const res = await api.post(`/restaurants/${restaurantId}/menu-category-groups`, data);
  return res.data;
}

export async function updateCategoryGroup (restaurantId, categoryGroupId, data) {
  const res = await api.patch(`/restaurants/${restaurantId}/menu-category-groups/${categoryGroupId}`, data);
  return res.data;
}

export async function deleteCategoryGroup (restaurantId, categoryGroupId) {
  const res = await api.delete(`/restaurants/${restaurantId}/menu-category-groups/${categoryGroupId}`);
  return res.data;
}
