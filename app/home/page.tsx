"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Spinner from "./components/spinner";

interface CategoryType {
  id: number;
  category_type: string;
  link?: string;
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categorytype")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        return response.json();
      })
      .then((data) => setCategories(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div>
        <Spinner />
      </div>
    );

  if (error) return <p className="text-center text-red-500">Error: {error}</p>;

  return (
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-bold mb-4 text-center">
        איזה משכנתא מתאימה לי? &nbsp;
        <Link href={`/home/guide`} className="text-blue-400 underline hover:text-blue-600 transition-colors">
          למדריך המשכנתא
        </Link>
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="p-4 shadow-md border rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-[1.02] flex flex-col justify-between items-center min-h-[260px] bg-white"
          >
            <h2 className="text-lg font-semibold text-center mb-2">
              {category.category_type}
            </h2>

            <div className="flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-4">
              <Image
                src="/assets/images/svg/home.svg"
                alt="home"
                width={64}
                height={64}
              />
            </div>

            <Link href={`/home/${category.link ?? ""}`} className="w-full">
              <div className="mt-auto bg-[#1d75a1] hover:bg-[#a39d8f] text-[#e5e4e3] font-bold py-2 px-4 rounded-full text-center transition-colors w-full">
                למידע נוסף
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}



