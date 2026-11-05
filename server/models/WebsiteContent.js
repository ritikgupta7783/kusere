const mongoose = require('mongoose');

// Editable site copy. Wording is deliberately modest: no claims beyond the supplied label/PDF.
const websiteContentSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    heroHeading: { type: String, default: 'Gentle Ayurvedic oral care for growing smiles' },
    heroDescription: {
      type: String,
      default:
        'Cavi-Care Herbal Toothpaste is an Ayurvedic proprietary formulation for children and teens aged 2 to 18 years - SLS-free, fluoride-free and made with traditional herbs.',
    },
    heroImage: { type: String, default: '/assets/cavi-care-front.jpg' },
    promoBanner: { type: String, default: 'Cavi-Care Herbal Toothpaste - SLS & Fluoride Free' },
    promoImage: { type: String, default: '/assets/promo-usage-collage.jpg' },
    aboutIntro: {
      type: String,
      default:
        'Bimari Mitao Herbs is an Ayurvedic healthcare brand from Jonai, Dhemaji, Assam. Our first product, Cavi-Care Herbal Toothpaste, is made for children and teens between 2 and 18 years.',
    },
    mission: {
      type: String,
      default:
        'To make gentle, herbal oral care accessible to families, and to help children build healthy brushing habits from an early age.',
    },
    vision: {
      type: String,
      default: 'To be a trusted name in Ayurvedic healthcare that families in Assam and across India can rely on.',
    },
    philosophy: {
      type: String,
      default:
        'Ayurveda looks at health as balance. Our formulations draw on traditional herbs such as Kantkari, Babool, Turmeric, Tomar, Majufal, Clove and Nilgiri, prepared as an Ayurvedic proprietary medicine.',
    },
    footerTagline: { type: String, default: 'Ayurvedic healthcare from Jonai, Dhemaji, Assam.' },
    footerNote: {
      type: String,
      default:
        'Cavi-Care is an Ayurvedic proprietary medicine. Adult supervision is recommended while children brush. Marketed by Bimari Mitao Herbs.',
    },
    contactIntro: { type: String, default: 'Questions about Cavi-Care or your order? Write to us and we will get back to you.' },
  },
  { timestamps: true }
);

websiteContentSchema.statics.getSingleton = async function getSingleton() {
  return this.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { new: true, upsert: true });
};

module.exports = mongoose.model('WebsiteContent', websiteContentSchema);
