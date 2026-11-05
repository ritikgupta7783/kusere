/**
 * Catalogue of local images the admin may pick from.
 *
 * PHASE 2 (cloud storage): replace this list with a lookup against your storage
 * provider (e.g. Cloudinary) and relax `isAllowedImage` to accept the provider's
 * URLs. Product.image / WebsiteContent image fields already store a plain string,
 * so no model change is needed. See README "Upgrading to Cloudinary".
 */
const IMAGE_CATALOG = [
  { path: '/assets/cavi-care-front.jpg', label: 'Cavi-Care tube - front (photo)', kind: 'product' },
  { path: '/assets/cavi-care-back.jpg', label: 'Cavi-Care tube - back (ingredients & directions)', kind: 'product' },
  { path: '/assets/product-advertisement.jpg', label: 'Cavi-Care advertisement - how to use', kind: 'promo' },
  { path: '/assets/promo-usage-collage.jpg', label: 'Promotional collage - usage', kind: 'promo' },
  { path: '/assets/brand-logo.png', label: 'Bimari Mitao Herbs logo', kind: 'logo' },
];

const allowed = new Set(IMAGE_CATALOG.map((i) => i.path));

const isAllowedImage = (p) => typeof p === 'string' && allowed.has(p);

module.exports = { IMAGE_CATALOG, isAllowedImage };
