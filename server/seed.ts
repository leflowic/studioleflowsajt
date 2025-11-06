import { db } from "./db";
import { cmsContent } from "../shared/schema";

const defaultCmsContent = [
  // Hero section
  { page: 'home', section: 'hero', contentKey: 'title', contentValue: 'Studio LeFlow' },
  { page: 'home', section: 'hero', contentKey: 'subtitle', contentValue: 'Profesionalna Muzička Produkcija' },
  { page: 'home', section: 'hero', contentKey: 'description', contentValue: 'Mix • Master • Instrumentali • Video Produkcija' },

  // Services
  { page: 'home', section: 'services', contentKey: 'service_1_title', contentValue: 'Snimanje & Mix/Master' },
  { page: 'home', section: 'services', contentKey: 'service_1_description', contentValue: 'Profesionalno snimanje vokala i instrumenata u akustički tretiranom studiju' },
  { page: 'home', section: 'services', contentKey: 'service_1_image', contentValue: '/client/src/assets/generated_images/Apollo_Twin_X_audio_interface_8905cd94.png' },
  { page: 'home', section: 'services', contentKey: 'service_2_title', contentValue: 'Instrumentali & Gotove Pesme' },
  { page: 'home', section: 'services', contentKey: 'service_2_description', contentValue: 'Kreiranje originalnih bitova i kompletna produkcija vaših pesama' },
  { page: 'home', section: 'services', contentKey: 'service_2_image', contentValue: '/client/src/assets/generated_images/Synthesizer_keyboard_with_controls_c7b4f573.png' },
  { page: 'home', section: 'services', contentKey: 'service_3_title', contentValue: 'Video Produkcija' },
  { page: 'home', section: 'services', contentKey: 'service_3_description', contentValue: 'Snimanje i editing profesionalnih muzičkih spotova' },
  { page: 'home', section: 'services', contentKey: 'service_3_image', contentValue: '/client/src/assets/generated_images/Video_camera_production_setup_199f7c64.png' },
  
  // Equipment section
  { page: 'home', section: 'equipment', contentKey: 'equipment_image', contentValue: '/client/src/assets/generated_images/Yamaha_HS8_studio_monitors_d1470a56.png' },

  // CTA section
  { page: 'home', section: 'cta', contentKey: 'title', contentValue: 'Spremni za Vašu Sledeću Produkciju?' },
  { page: 'home', section: 'cta', contentKey: 'description', contentValue: 'Zakažite besplatnu konsultaciju i razgovarajmo o vašoj muzičkoj viziji' },
];

export async function seedCmsContent() {
  try {
    console.log('🌱 Checking CMS content...');
    
    // Check if CMS content already exists
    const existingContent = await db.select().from(cmsContent).limit(1);
    
    if (existingContent.length > 0) {
      console.log('✅ CMS content already exists, skipping seed');
      return;
    }

    console.log('📝 Seeding CMS content...');
    
    // Insert default content
    await db.insert(cmsContent).values(defaultCmsContent);
    
    console.log(`✅ Successfully seeded ${defaultCmsContent.length} CMS content entries`);
  } catch (error) {
    console.error('❌ Error seeding CMS content:', error);
    throw error;
  }
}
