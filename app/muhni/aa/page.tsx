//port ImageGallery from 'ImageGallery';
import ImageGallery from "./ImageGallery";


export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <h1 className="text-center text-3xl font-bold mb-6">גלריית תמונות מ־Unsplash</h1>
      <ImageGallery />
    </main>
  );
}
