import api from './apiClient';

export async function fetchCategories(restaurantId) {
    const res = await api.get(`/restaurants/${restaurantId}/categories`);
    // Handle various response structures: { data: { categories: [] } } or { data: [] } or just []
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && data.data && Array.isArray(data.data.categories)) return data.data.categories;
    if (data && Array.isArray(data.categories)) return data.categories;
    return [];
}

export async function updateCategory(restaurantId, categoryId, data) {
    const res = await api.patch(`/restaurants/${restaurantId}/categories/${categoryId}`, data);
    return res.data;
}
