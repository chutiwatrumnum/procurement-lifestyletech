import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';

export function useCompanyLogo() {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    // Attempt to load from localStorage first for immediate display
    const cached = localStorage.getItem('companyLogoUrl');
    return cached || '/logo.png';
  });
  const [loading, setLoading] = useState(() => {
    // If we have a cached logo, we don't need to show a loading screen initially
    return !localStorage.getItem('companyLogoUrl');
  });

  useEffect(() => {
    async function fetchLogo() {
      try {
        const records = await pb.collection('company_settings').getFullList();
        if (records.length > 0 && records[0].logo) {
          const rec = records[0];
          const fetchedUrl = `${import.meta.env.VITE_POCKETBASE_URL}/api/files/${rec.collectionId}/${rec.id}/${rec.logo}`;
          
          // If the fetched URL is different from what we have cached, update state and cache
          const cachedUrl = localStorage.getItem('companyLogoUrl');
          if (fetchedUrl !== cachedUrl) {
            setLogoUrl(fetchedUrl);
            localStorage.setItem('companyLogoUrl', fetchedUrl);
          }
        }
      } catch (err) {
        console.error('Failed to load company logo:', err);
      } finally {
        setLoading(false);
      }
    }
    
    // Always fetch in the background to ensure we have the latest logo
    fetchLogo();
  }, []);

  return { logoUrl, loading };
}
