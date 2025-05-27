'use client';

import { useState } from 'react';

export default function ImageGallery() {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search-images?q=${query}`);
      const data = await res.json();
      setImages(data.results || []);
    } catch (err) {
      console.error('Error fetching images:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <input
          type="text"
          placeholder="חפש תמונות..."
          className="border p-2 rounded w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={fetchImages}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
        >
          חפש
        </button>
      </div>

      {loading && <p>טוען...</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img) => (
        <div>
      
    
    
      
      
        <img
            key={img.id}
            src={img.urls.small}
            alt={img.alt_description || 'Image'}
            className="rounded shadow-md hover:scale-105 transition"
          /> 
         
          
           </div>

        ))}
      </div>
    </div>
  );
}
