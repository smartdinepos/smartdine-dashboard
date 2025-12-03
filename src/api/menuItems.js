// api/menuItems.js
import api from './apiClient';

const normalizeCombos = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, idx) => {
      if (entry == null) return null;
      const id =
        typeof entry === 'string' || typeof entry === 'number'
          ? String(entry)
          : entry?._id ??
            entry?.id ??
            entry?.itemId ??
            entry?.menuItemId ??
            entry?.comboItemId ??
            null;
      if (!id) return null;
      const quantityRaw = entry.quantity ?? entry.qty;
      const rankRaw = entry.smartDineRank ?? entry.rank ?? entry.order ?? entry.priority;
      const quantity = quantityRaw == null ? null : (Number(quantityRaw) || 1);
      const smartDineRank = rankRaw == null ? null : (Number(rankRaw) || idx + 1);
      return {
        id: String(id),
        quantity,
        smartDineRank
      };
    })
    .filter(Boolean);
};

const normalizeItem = (x = {}) => {
  const id = x._id || x.id;
  const name = x.name ?? '';
  const description = x.description ?? x.desc ?? '';
  const price = typeof x.price === 'number' ? x.price : Number(x.price) || 0;

  const tags = Array.isArray(x.tags) ? x.tags : [];
  const veg = (x.veg ?? x.isVeg) ? 'Veg' : (x.nonVeg ?? x.isNonVeg) ? 'Non-Veg' : null;
  const bestseller = x.bestseller ? 'Bestseller' : null;

  let images = [];
  if (typeof x.image === 'string') images = [x.image];
  else if (Array.isArray(x.images)) images = x.images.map(u => typeof u === 'string' ? u : (u?.url ?? ''));
  else if (Array.isArray(x.photos)) images = x.photos.map(u => typeof u === 'string' ? u : (u?.url ?? ''));
  images = images.filter(Boolean);

  const categorySource = x.category ?? x.categoryName ?? null;
  const categoryId =
    x.categoryId ??
    x.category_id ??
    (typeof categorySource === 'object' ? (categorySource?._id || categorySource?.id) : null) ??
    null;
  const category =
    x.categoryName ??
    (typeof categorySource === 'string' ? categorySource : categorySource?.name) ??
    null;
  const menuName = x.menuName ?? null;
  const posCategoryId = x.posCategoryId ?? null;
  const posItemId = x.posItemId ?? null;
  const status = x.status ?? 'active';
  const isRestaurantRecommended = !!(
    x.isRestaurantRecommended ??
    x.isRecommended ??
    x.isRestaurantRecomended ??
    x.isRestaurantPromoted ??
    x.isRecomended ??
    false
  );

  const comboItems = normalizeCombos(
    x.comboItems ?? x.combos ?? x.comboIds ?? x.upsellItems ?? x.upsellCombos ?? []
  );

  return {
    _id: id,
    name,
    description,
    price,
    tags: [...tags, ...(veg ? [veg] : []), ...(bestseller ? [bestseller] : [])],
    images,
    categoryId,
    category,
    menuName,
    posCategoryId,
    posItemId,
    status,
    displayOrder: x.displayOrder ?? 0,
    comboItems,
    isRestaurantRecommended,
    isRecomended: isRestaurantRecommended
  };
};

// single page fetch (used internally)
async function getMenuItemsByRestaurantPaged (restaurantId, params = {}) {
  const res = await api.get(`/restaurants/${restaurantId}/menu-items`, { params });
  const d = res.data?.data || {};
  const items = (d.menuItems || d.items || []).map(normalizeItem);
  const pagination = d.pagination || {
    totalItems: items.length,
    totalPages: 1,
    currentPage: Number(params.page || 1),
    pageSize: Number(params.limit || items.length || 20),
    nextPage: null,
    prevPage: null
  };
  return { items, pagination };
}

// public: fetch ALL items (auto-paginates until done)
export async function getAllMenuItemsByRestaurant (restaurantId, params = {}) {
  const limit = Math.max(1, Number(params.limit || 100)); // 100 works with your backend cap
  let page = 1;

  const out = [];
  let totalPages = 1;

  // first page
  const { items, pagination } = await getMenuItemsByRestaurantPaged(restaurantId, { ...params, page, limit });
  out.push(...items);
  totalPages = Number(pagination.totalPages || 1);

  // remaining pages (if any)
  while (page < totalPages) {
    page += 1;
    const r = await getMenuItemsByRestaurantPaged(restaurantId, { ...params, page, limit });
    out.push(...r.items);
  }

  // return a flat list (admin wants everything in one page)
  return { items: out, pagination: { totalItems: out.length, totalPages: 1, currentPage: 1, pageSize: out.length } };
}

export async function updateMenuItem (restaurantId, itemId, payload) {
  const url = `/restaurants/${restaurantId}/menu-items/${itemId}`;
  // Bridge any legacy fields before hitting the API
  if (!(payload instanceof FormData)) {
    const next = { ...payload };
    // Fold all legacy keys into a single boolean
    const recValue =
      next.isRestaurantRecommended ??
      next.isRestaurantRecomended ??
      next.isRecomended;

    if ('isRecomended' in next) delete next.isRecomended;
    if ('isRestaurantRecomended' in next) delete next.isRestaurantRecomended;
    if ('isRestaurantPromoted' in next) delete next.isRestaurantPromoted;

    const normalizedRecommended = recValue == null ? undefined : Boolean(recValue);
    if (normalizedRecommended !== undefined) next.isRestaurantRecommended = normalizedRecommended;
    else delete next.isRestaurantRecommended;

    payload = next;
  }
  const res = payload instanceof FormData
    ? await api.patch(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
    : await api.patch(url, payload);
  // API returns { data: { menuItem } }; fall back to bare body
  const out = res.data?.data?.menuItem ?? res.data?.data ?? res.data;
  return normalizeItem(out);
}
