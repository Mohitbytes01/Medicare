import React, { useEffect } from 'react';
import {
  MedicineCategoryId,
  StoreMedicineItem,
} from '../types/prescription';

interface SEOManagerProps {
  activeTab: string;
  searchQuery: string;
  selectedCategory: MedicineCategoryId;
  medicines?: StoreMedicineItem[];
}

const CATEGORY_SEO_META: Record<
  MedicineCategoryId,
  { title: string; description: string }
> = {
  all: {
    title: 'VeriMed — Online Medicine Price Comparison & Prescription Scanner India',
    description:
      'Compare live medicine prices across Tata 1mg, PharmEasy, Netmeds, Apollo 24|7 & Jan Aushadhi generics, shop healthcare essentials, and scan prescriptions in English, Bengali & Hindi.',
  },
  personal_hygiene: {
    title: 'Buy Diapers, Sanitary Pads & Wet Wipes Online at Lowest Price | VeriMed',
    description:
      'Compare live prices for Whisper Ultra, Stayfree, Sofy sanitary pads, Friends adult diapers, MamyPoko, Pampers baby diapers & Himalaya wet wipes across 4 Indian stores.',
  },
  antiseptic_skin: {
    title: 'Dettol, Medicated Soaps (Tetmosol, Ketostar) & First Aid Prices | VeriMed',
    description:
      'Compare lowest online prices for Dettol Antiseptic Liquid, Tetmosol, Ketostar & Acnestar medicated soaps, Betadine ointment, Hansaplast & Electral ORS across India.',
  },
  diabetes: {
    title: 'Diabetes & Sugar Medicines Price Comparison (Glycomet, Galvus, Jardiance) | VeriMed',
    description:
      'Compare live prices for Glycomet-GP 2, Glycomet-GP 1, Galvus Met, Jardiance 10mg & Jan Aushadhi diabetes generic substitutes across Tata 1mg, PharmEasy, Netmeds & Apollo.',
  },
  cardiac: {
    title: 'BP & Heart Medicines Price Comparison (Telma 40, Ecosprin 75, Rosuvas) | VeriMed',
    description:
      'Compare lowest online prices for Telma 40, Telma-AM, Ecosprin 75, Rosuvas 10, Atorva 20 & Clopilet 75 across 4 Indian pharmacies and PMBJP Jan Aushadhi generics.',
  },
  acidity: {
    title: 'Acidity & Gas Medicines Price Comparison (Pan-D, Pan 40, Omez 20) | VeriMed',
    description:
      'Find the cheapest online price for Pan-D Capsule, Pan 40 Tablet, Omez 20 & Pantocid DSR across Tata 1mg, PharmEasy, Netmeds, Apollo 24|7 and Jan Aushadhi generics.',
  },
  fever_pain: {
    title: 'Fever, Cold & Painkiller Medicines Price (Dolo 650, Zerodol-SP, Montair-LC) | VeriMed',
    description:
      'Compare live prices for Dolo 650, Brufen 400, Zerodol-SP & Montair-LC across Tata 1mg, PharmEasy, Netmeds & Apollo 24|7 with instant drug interaction safety checks.',
  },
  vitamins: {
    title: 'Vitamins, Calcium & D3 Supplements Price (Shelcal 500, Neurobion, Uprise-D3) | VeriMed',
    description:
      'Compare prices for Shelcal 500, Neurobion Forte & Uprise-D3 60K capsules across 4 top Indian online pharmacies and save up to 75% with generic alternatives.',
  },
  thyroid: {
    title: 'Thyroid Medicines Price Comparison (Thyronorm 50mcg, Eltroxin) | VeriMed',
    description:
      'Compare live prices for Thyronorm 50mcg & Levothyroxine tablets across Tata 1mg, PharmEasy, Netmeds & Apollo 24|7 with morning dosage reminders.',
  },
  antibiotics: {
    title: 'Antibiotics Price Comparison India (Augmentin 625, Azithral 500) | VeriMed',
    description:
      'Compare verified prices for Augmentin 625 Duo, Azithral 500 & generic amoxicillin/azithromycin substitutes across top Indian online pharmacies.',
  },
};

export const SEOManager: React.FC<SEOManagerProps> = ({
  activeTab,
  searchQuery,
  selectedCategory,
  medicines = [],
}) => {
  useEffect(() => {
    let pageTitle = CATEGORY_SEO_META.all.title;
    let pageDesc = CATEGORY_SEO_META.all.description;

    if (activeTab === 'store') {
      if (searchQuery.trim().length >= 2) {
        const clean = searchQuery.trim();
        pageTitle = `${clean} Price in India — Compare 1mg, PharmEasy, Netmeds & Apollo | VeriMed`;
        pageDesc = `Compare live discounted prices, same-salt substitutes, and Jan Aushadhi generic rates for ${clean} across Tata 1mg, PharmEasy, Netmeds, and Apollo 24|7 on VeriMed.`;
      } else {
        const catMeta =
          CATEGORY_SEO_META[selectedCategory] || CATEGORY_SEO_META.all;
        pageTitle = catMeta.title;
        pageDesc = catMeta.description;
      }
    } else if (activeTab === 'basket') {
      pageTitle = 'My Medicine Comparison Basket & Multi-Pharmacy Checkout | VeriMed';
      pageDesc =
        'Review your selected medicines and daily essentials, check drug interactions, and compare your combined bill across Tata 1mg, PharmEasy, Netmeds, and Apollo 24|7.';
    } else if (activeTab === 'schedule') {
      pageTitle =
        'AI Prescription Scanner & Trilingual Medicine Schedule (English, বাংলা, हिन्दी) | VeriMed';
      pageDesc =
        'Upload a photo of your doctor’s handwritten prescription to get a clear morning, afternoon, and night dosage schedule with spoken audio in English, Bengali, and Hindi.';
    } else if (activeTab === 'safety') {
      pageTitle = 'Drug Interaction & Clinical Safety Checker | VeriMed India';
      pageDesc =
        'Check your prescription medicines for dangerous drug-to-drug interactions, bleeding risks, and timing gaps with trilingual voice explanations.';
    } else if (activeTab === 'prices') {
      pageTitle =
        'Compare Prescription Bill Across 1mg, PharmEasy, Netmeds & Apollo | VeriMed';
      pageDesc =
        'Compare your full prescription bill across India’s top 4 online pharmacies and Government Jan Aushadhi generics to save up to 80%.';
    } else if (activeTab === 'care_circle') {
      pageTitle = 'Family Care Circle & Elderly Medicine Reminders | VeriMed';
      pageDesc =
        'Track daily medicine adherence and send one-tap check-in alerts for parents and elderly family members across India.';
    }

    document.title = pageTitle;

    const setMetaTag = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };

    setMetaTag('meta[name="description"]', pageDesc);
    setMetaTag('meta[property="og:title"]', pageTitle);
    setMetaTag('meta[property="og:description"]', pageDesc);
    setMetaTag('meta[name="twitter:title"]', pageTitle);
    setMetaTag('meta[name="twitter:description"]', pageDesc);

    const canonical = document.getElementById('canonical-link');
    if (canonical && typeof window !== 'undefined') {
      canonical.setAttribute(
        'href',
        `${window.location.origin}${window.location.pathname}`
      );
    }
  }, [activeTab, searchQuery, selectedCategory]);

  // Dynamically generate Schema.org ItemList of Products for Google Rich Snippets
  const productListSchema =
    medicines.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name:
            searchQuery.trim().length >= 2
              ? `Medicine Price Comparison Results for ${searchQuery.trim()}`
              : `VeriMed Popular Indian Medicines & Healthcare Essentials (${selectedCategory})`,
          numberOfItems: Math.min(medicines.length, 18),
          itemListElement: medicines.slice(0, 18).map((med, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            item: {
              '@type': 'Product',
              name: med.name,
              description: `${med.genericComposition} — ${med.purpose}. Pack size: ${med.packSize}. Compare prices across Tata 1mg, PharmEasy, Netmeds, and Apollo 24|7.`,
              brand: {
                '@type': 'Brand',
                name: med.manufacturer,
              },
              category: med.categoryLabel,
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'INR',
                lowPrice: med.lowestPrice.toFixed(2),
                highPrice: med.mrp.toFixed(2),
                offerCount: med.pharmacyQuotes?.length || 4,
                availability: 'https://schema.org/InStock',
              },
            },
          })),
        }
      : null;

  if (!productListSchema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(productListSchema) }}
    />
  );
};
