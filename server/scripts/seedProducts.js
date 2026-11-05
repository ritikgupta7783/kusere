/**
 * Seeds Cavi-Care Herbal Toothpaste (data from the supplied BMH.pdf and pack label) plus
 * default site content and store settings. Idempotent: re-running updates nothing that the
 * owner already edited unless you pass --force.
 * Run:  npm run seed:products   (from the server folder)
 */
const { connectDB, disconnectDB } = require('../config/db');
const Product = require('../models/Product');
const WebsiteContent = require('../models/WebsiteContent');
const StoreSettings = require('../models/StoreSettings');

const caviCare = {
  name: 'Cavi-Care Herbal Toothpaste',
  slug: 'cavi-care-herbal-toothpaste',
  category: 'Ayurvedic Proprietary Medicine',
  shortDescription: 'SLS-free, fluoride-free Ayurvedic toothpaste for children and teens aged 2 to 18 years.',
  description:
    "A safe Ayurvedic proprietary formulation crafted specifically to safeguard your child's dental health. Designed for kids and teens aged 2 to 18 years, Cavi-Care provides cavity defense while remaining gentle on tender enamel and sensitive gums. It helps remove plaque, fights tooth decay, and supports healthy oral care habits naturally.",
  mrp: 99,
  price: 99, // no discount was specified; the owner can lower it in Admin > Products
  netWeight: '8 g',
  targetAge: '2 to 18 years',
  ingredientsNote: 'Each 5g contains',
  ingredients: [
    { name: 'Kantkari', percentage: 50, description: 'Traditional core botanical known to strengthen gum tissues and inhibit bacterial growth.' },
    { name: 'Babool', percentage: 10, description: 'Renowned natural astringent that tightens gums and prevents plaque formation.' },
    { name: 'Turmeric Rhizome', percentage: 10, description: 'Anti-inflammatory and antimicrobial agent that soothes oral tissue.' },
    { name: 'Nilgiri', percentage: 9, description: 'Provides long-lasting breath freshness and antimicrobial defense.' },
    { name: 'Tomar', percentage: 8, description: 'Traditional herb widely used to relieve tooth sensitivity and fight bad breath.' },
    { name: 'Majufal', percentage: 7, description: 'Helps tone oral mucous membranes and protect against gum bleeding.' },
    { name: 'Clove Bud', percentage: 6, description: 'Natural antiseptic with analgesic properties to combat toothache and decay.' },
    { name: 'Permitted Preservatives', percentage: 0.1, description: '' },
  ],
  benefits: [
    'SLS-free and fluoride-free formulation',
    'Cavity and plaque defense',
    'Gentle on enamel and sensitive gums',
    'Ayurvedic herbal formulation made for ages 2 to 18',
  ],
  usage: [
    'Apply a small pea-sized amount onto a soft-bristled toothbrush.',
    'Brush thoroughly for 2 minutes, preferably three times a day after meals.',
    'Adult supervision is recommended during brushing to minimize accidental swallowing.',
    'Spit out and rinse the mouth thoroughly with clean water.',
  ],
  specifications: [
    { label: 'Product type', value: 'Ayurvedic Proprietary Medicine' },
    { label: 'Target age', value: '2 to 18 years' },
    { label: 'Net volume / weight', value: '8 g' },
    { label: 'MRP', value: 'Rs. 99.00 (USP: Rs. 12.375/g)' },
    { label: 'Mfg. Lic. No.', value: '711 Ay-Pb' },
    { label: 'Manufactured by', value: 'Deep Ayurveda Healthcare Pvt. Ltd., D-27, Industrial Area, Phase-1, Mohali, Punjab - 160055' },
    { label: 'Marketed by', value: 'Bimari Mitao Herbs, Santipur, P.O. Lalmekuri, P.S. Jonai, Dist. Dhemaji, Assam - 787060' },
    { label: 'Customer support', value: '+91 6002928927 | bimarimitaoherbs@gmail.com' },
  ],
  image: '/assets/cavi-care-front.jpg',
  gallery: ['/assets/cavi-care-front.jpg', '/assets/cavi-care-back.jpg', '/assets/product-advertisement.jpg'],
  inStock: true,
  isActive: true,
  isFeatured: true,
};

async function run() {
  const force = process.argv.includes('--force');
  await connectDB();
  const existing = await Product.findOne({ slug: caviCare.slug });
  if (existing && !force) {
    console.log('Cavi-Care already exists - left untouched (use --force to overwrite with the label defaults).');
  } else if (existing) {
    Object.assign(existing, caviCare);
    await existing.save();
    console.log('Cavi-Care overwritten with defaults.');
  } else {
    await Product.create(caviCare);
    console.log('Cavi-Care created.');
  }
  await WebsiteContent.getSingleton();
  await StoreSettings.getSingleton();
  console.log('Default website content and store settings are in place.');
}

run()
  .catch((e) => {
    console.error('Seed failed:', e.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
