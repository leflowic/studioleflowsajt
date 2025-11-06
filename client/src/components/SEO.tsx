import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  structuredData?: object;
}

export function SEO({
  title = "Studio LeFlow - Profesionalni Muzički Studio u Beogradu | Snimanje, Miks, Mastering",
  description = "Studio LeFlow - vrhunski muzički studio u Beogradu. Snimanje pesama, miks i mastering, voice over, podcast produkcija. Najsavremenija oprema, iskusni producenti. Rezervišite termin!",
  keywords = [
    "muzički studio beograd",
    "snimanje pesme beograd",
    "miks i mastering",
    "mix mastering beograd",
    "studio leflow",
    "leflow",
    "voice over studio",
    "podcast studio beograd",
    "muzička produkcija",
    "audio produkcija beograd",
    "snimanje vokala",
    "mastering beograd",
    "producent muzike beograd",
    "recording studio belgrade"
  ],
  ogImage = "/og-image.jpg",
  ogType = "website",
  structuredData,
}: SEOProps) {
  useEffect(() => {
    // Set document title
    document.title = title;
    
    // Set/update meta tags
    const setMetaTag = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };
    
    // Standard meta tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords.join(', '));
    
    // Open Graph tags
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', ogImage, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:site_name', 'Studio LeFlow', true);
    setMetaTag('og:locale', 'sr_RS', true);
    
    // Twitter cards
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImage);
    
    // Structured data
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }
  }, [title, description, keywords, ogImage, ogType, structuredData]);
  
  return <></>;
}
