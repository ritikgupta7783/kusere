/**
 * Catalogue of bundled images plus validated Cloudinary-hosted URLs.
 */
const IMAGE_CATALOG = [
  { path: '/assets/cavi-care-front.jpg', label: 'Cavi-Care tube - front (photo)', kind: 'product' },
  { path: '/assets/cavi-care-back.jpg', label: 'Cavi-Care tube - back (ingredients & directions)', kind: 'product' },
  { path: '/assets/product-advertisement.jpg', label: 'Cavi-Care advertisement - how to use', kind: 'promo' },
  { path: '/assets/promo-usage-collage.jpg', label: 'Promotional collage - usage', kind: 'promo' },
  { path: '/assets/brand-logo.png', label: 'Bimari Mitao Herbs logo', kind: 'logo' },
];

const allowed = new Set(IMAGE_CATALOG.map((i) => i.path));

const isAllowedImage = (p) => {
  if (typeof p !== 'string') return false;
  if (allowed.has(p)) return true;
  try {
    const url = new URL(p);
    return url.protocol === 'https:' && /^res\.cloudinary\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
};

module.exports = { IMAGE_CATALOG, isAllowedImage };
