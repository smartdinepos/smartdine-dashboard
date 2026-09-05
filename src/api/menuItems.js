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

  const rawLabels = Array.isArray(x.labels) ? x.labels : Array.isArray(x.tags) ? x.tags : [];
  const labels = rawLabels.map(l => (typeof l === 'string' ? l : l?.name || l?.label || '')).filter(Boolean);
  const veg = (x.veg ?? x.isVeg) ? 'Veg' : (x.nonVeg ?? x.isNonVeg) ? 'Non-Veg' : null;
  const bestseller = x.bestseller ? 'Bestseller' : null;
  const tags = Array.from(new Set([...labels, ...(veg ? [veg] : []), ...(bestseller ? [bestseller] : [])]));

  let images = [];
  if (Array.isArray(x.images)) {
    images = x.images.map((u, i) => {
      if (typeof u === 'string') return { id: `img-${i + 1}`, type: 'menu', url: u };
      if (u && typeof u === 'object') {
        return {
          id: String(u.id || u._id || `img-${i + 1}`),
          type: u.type || 'menu',
          url: u.url || ''
        };
      }
      return null;
    }).filter(im => im && im.url);
  } else if (typeof x.image === 'string' && x.image) {
    images = [{ id: 'img-1', type: 'menu', url: x.image }];
  } else if (Array.isArray(x.photos)) {
    images = x.photos.map((u, i) => {
      const url = typeof u === 'string' ? u : (u?.url ?? '');
      return url ? { id: `img-${i + 1}`, type: 'menu', url } : null;
    }).filter(Boolean);
  }

  let videos = [];
  if (Array.isArray(x.videos)) {
    videos = x.videos.map((v, i) => {
      if (typeof v === 'string') return { id: `vid-${i + 1}`, type: 'promo', url: v };
      if (v && typeof v === 'object') {
        return {
          id: String(v.id || v._id || `vid-${i + 1}`),
          type: v.type || 'promo',
          url: v.url || ''
        };
      }
      return null;
    }).filter(v => v && v.url);
  }

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
  const posId = x.posId ?? null;
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
    id,
    posId,
    name,
    description,
    price,
    labels,
    tags,
    images,
    videos,
    categoryId,
    category,
    menuName,
    posCategoryId,
    posItemId,
    status,
    displayOrder: x.displayOrder ?? 0,
    comboItems,
    isRestaurantRecommended,
    isRecomended: isRestaurantRecommended,
    variations: Array.isArray(x.variations) ? x.variations : [],
    addonGroups: Array.isArray(x.addonGroups) ? x.addonGroups : [],
    defaultVariationPosId: x.defaultVariationPosId ?? null,
    smartDineRank: x.smartDineRank ?? null
  };
};

// Fetch all menu items for a restaurant (endpoint returns all items without pagination)
export async function getAllMenuItemsByRestaurant (restaurantId, params = {}) {
  const res = await api.get(`/restaurants/${restaurantId}/menu-items`, { params });
  const data = res.data;
  const rawList =
    (Array.isArray(data) && data) ||
    (data && Array.isArray(data.data) && data.data) ||
    (data?.data && Array.isArray(data.data.menuItems) && data.data.menuItems) ||
    (data?.data && Array.isArray(data.data.items) && data.data.items) ||
    (data && Array.isArray(data.menuItems) && data.menuItems) ||
    (data && Array.isArray(data.items) && data.items) ||
    [];
  const items = rawList.map(normalizeItem);
  return {
    items,
    pagination: {
      totalItems: items.length,
      totalPages: 1,
      currentPage: 1,
      pageSize: items.length,
      nextPage: null,
      prevPage: null
    }
  };
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
      next.isRecomended ??
      next.isRestaurantPromoted;

    if ('isRecomended' in next) delete next.isRecomended;
    if ('isRestaurantRecomended' in next) delete next.isRestaurantRecomended;
    if ('isRestaurantPromoted' in next) delete next.isRestaurantPromoted;

    if (recValue !== undefined) {
      next.isRestaurantRecommended = Boolean(recValue);
    }

    if ('tags' in next && !('labels' in next)) {
      next.labels = next.tags;
      delete next.tags;
    }

    if (next.comboItems || next.combos || next.comboIds || next.upsellItems) {
      next.comboItems = normalizeCombos(
        next.comboItems ?? next.combos ?? next.comboIds ?? next.upsellItems ?? []
      );
      delete next.combos;
      delete next.comboIds;
      delete next.upsellItems;
    }

    payload = next;
  }
  const res = payload instanceof FormData
    ? await api.patch(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
    : await api.patch(url, payload);
  // API returns { data: { menuItem } }; fall back to bare body
  const out = res.data?.data?.menuItem ?? res.data?.data ?? res.data;
  return normalizeItem(out);
}

export async function uploadMenuItemVideos (restaurantId, itemId, formData) {
  const url = `/restaurants/${restaurantId}/menu-items/${itemId}/videos`;
  const res = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  const out = res.data?.data?.menuItem ?? res.data?.data ?? res.data;
  return normalizeItem(out);
}

export async function uploadMenuItemImages (restaurantId, itemId, formData) {
  const url = `/restaurants/${restaurantId}/menu-items/${itemId}/images`;
  const res = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  const out = res.data?.data?.menuItem ?? res.data?.data ?? res.data;
  return normalizeItem(out);
}

export async function syncMenu (restaurantId) {
  const res = await api.post(`/restaurants/${restaurantId}/menus/sync`);
  return res.data;
}
