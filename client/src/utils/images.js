/**
 * Single place that decides where images come from.
 *
 * PHASE 2 (Cloudinary or another host): product/content images are already stored as strings in MongoDB.
 * When those strings become full https URLs, `imageUrl` returns them unchanged, so no component changes.
 * If you prefer storing only a public id, build the URL here (e.g. `${CDN_BASE}/${src}`).
 */
const CDN_BASE = ''; // '' = serve from the website's own /assets folder (client/public/assets)

export const imageUrl = (src) => {
  if (!src) return BRAND.logo;
  if (/^https?:\/\//i.test(src)) return src;
  return `${CDN_BASE}${src}`;
};

/** Fixed brand artwork used by page layouts (not editable per product). */
export const BRAND = {
  logo: '/assets/brand-logo.png',
  packFront: '/assets/cavi-care-front.jpg',
  packBack: '/assets/cavi-care-back.jpg',
  howToUse: '/assets/product-advertisement.jpg',
  promoCollage: '/assets/promo-usage-collage.jpg',
};
