'use client';

import { useState } from 'react';

type MediaType = 'images' | 'videos';

export default function PexelsGallery() {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('images');
  const [results, setResults] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchPage = async (newPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/pexels-${mediaType}?q=${encodeURIComponent(query)}&page=${newPage}`
      );
      const data = await res.json();
      const items = mediaType === 'images' ? data.photos : data.videos || [];
      setResults(prev => (newPage === 1 ? items : [...prev, ...items]));
      const perPage = mediaType === 'images' ? 15 : 10;
      const total  = data.total_results || items.length;
      setHasMore(newPage * perPage < total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchPage(1);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  };

  const handleMediaTypeChange = (newType: MediaType) => {
    setMediaType(newType);
    setResults([]);
    setPage(1);
    setHasMore(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          className="border rounded p-2 flex-grow"
          placeholder="חפש..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select
          className="border rounded p-2"
          value={mediaType}
          onChange={e => handleMediaTypeChange(e.target.value as MediaType)}
        >
          <option value="images">תמונות</option>
          <option value="videos">סרטונים</option>
        </select>
        <button
          onClick={handleSearch}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          חפש
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {mediaType === 'images' &&
          results.map(photo => (
            <div key={photo.id} className="space-y-2">
              <img
                src={photo.src.medium}
                alt={photo.alt}
                className="rounded shadow-md w-full"
                loading="lazy"
              />
              <details className="text-sm text-gray-600">
                <summary className="cursor-pointer">הצג API Info</summary>
                <div className="mt-2">
                  <p className="font-mono mb-2">
                    GET https://api.pexels.com/v1/photos/{photo.id}
                  </p>
                  <pre className="overflow-auto max-h-48 bg-gray-100 p-2 rounded text-xs">
{JSON.stringify(photo, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          ))}

        {mediaType === 'images' &&
  results.map(photo => (
    <div key={photo.id} className="space-y-2">
      {/* עטיפה בלינק לפתיחת ה-URL המלא */}
      <a
        href={photo.src.original}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded overflow-hidden shadow-md hover:scale-105 transition"
      >
        <img
          src={photo.src.medium}
          alt={photo.alt}
          className="w-full h-auto"
          loading="lazy"
        />
      </a>

      {/* תצוגה של ה-URL מתחת, שניתן גם להעתיק */}
      <p className="text-xs font-mono break-all">
        {photo.src.original}
      </p>
    </div>
  ))
}
      </div>

      {hasMore && !loading && results.length > 0 && (
        <div className="text-center mt-6">
          <button
            onClick={loadMore}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            טען עוד…
          </button>
        </div>
      )}
      {loading && <p className="text-center mt-4">טוען עוד תוצאות…</p>}
    </div>
  );
}


























// 'use client';

// import { useState } from 'react';

// type MediaType = 'images' | 'videos';

// export default function PexelsGallery() {
//   const [query, setQuery] = useState('');
//   const [mediaType, setMediaType] = useState<MediaType>('images');
//   const [results, setResults] = useState<any[]>([]);
//   const [page, setPage] = useState(1);
//   const [hasMore, setHasMore] = useState(true);
//   const [loading, setLoading] = useState(false);

//   const fetchPage = async (newPage: number) => {
//     setLoading(true);
//     try {
//       const res = await fetch(
//         `/api/pexels-${mediaType}?q=${encodeURIComponent(query)}&page=${newPage}`
//       );
//       const data = await res.json();
//       const items = mediaType === 'images' ? data.photos : data.videos || [];

//       // אם זו טעינה של דף ראשון, מאפסים; אחרת מצרפים
//       setResults(prev => (newPage === 1 ? items : [...prev, ...items]));

//       // אם הגיע לדף האחרון (פיונל הדרוש: data.total_results, per_page)
//       const perPage = mediaType === 'images' ? 15 : 10;
//       const total  = data.total_results || items.length;
//       setHasMore(newPage * perPage < total);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSearch = () => {
//     setPage(1);
//     fetchPage(1);
//   };

//   const loadMore = () => {
//     const next = page + 1;
//     setPage(next);
//     fetchPage(next);
//   };

//   const handleMediaTypeChange = (newType: MediaType) => {
//     setMediaType(newType);
//     setResults([]);
//     setPage(1);
//     setHasMore(true);
//   };

//   return (
//     <div className="max-w-6xl mx-auto p-6">
//       {/* כותרת וחיפוש */}
//       <div className="flex flex-col sm:flex-row gap-4 mb-6">
//         <input
//           className="border rounded p-2 flex-grow"
//           placeholder="חפש..."
//           value={query}
//           onChange={e => setQuery(e.target.value)}
//         />
//         <select
//           className="border rounded p-2"
//           value={mediaType}
//           onChange={e => handleMediaTypeChange(e.target.value as MediaType)}
//         >
//           <option value="images">תמונות</option>
//           <option value="videos">סרטונים</option>
//         </select>
//         <button
//           onClick={handleSearch}
//           className="bg-green-600 text-white px-4 py-2 rounded"
//         >
//           חפש
//         </button>
//       </div>

//       {/* תצוגת מדיה */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
//         {mediaType === 'images' &&
//           results.map(photo => (
//             <img
//               key={photo.id}
//               src={photo.src.medium}
//               alt={photo.alt}
//               className="rounded shadow-md w-full"
//               loading="lazy"
//             />
//           ))}

//         {mediaType === 'videos' &&
//           results.map(video => {
//             const sd = video.video_files?.find((f: any) => f.quality === 'sd');
//             return (
//               <video
//                 key={video.id}
//                 controls
//                 className="rounded shadow-md w-full"
//                 poster={video.image}
//               >
//                 {sd && <source src={sd.link} type="video/mp4" />}
//               </video>
//             );
//           })}
//       </div>

//       {/* Load More */}
//       {hasMore && !loading && results.length > 0 && (
//         <div className="text-center mt-6">
//           <button
//             onClick={loadMore}
//             className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
//           >
//             טען עוד…
//           </button>
//         </div>
//       )}

//       {loading && <p className="text-center mt-4">טוען עוד תוצאות…</p>}
//     </div>
//   );
// }
