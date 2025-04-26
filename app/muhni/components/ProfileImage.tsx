'use client';

import Image from 'next/image';

type ProfileImageProps = {
  size?: number;
  position?: string;
};

export default function ProfileImage({ size = 160, position = 'items-center justify-center' }: ProfileImageProps) {
  const fontScale = size / 130; // שינוי מ-160 ל-130 כדי להגדיל קצת את הטקסט

  return (
    <div className={`flex flex-col ${position} items-center p-6`}>
      <div
        className="relative rounded-full overflow-hidden shadow-lg border-4 border-main"
        style={{ width: size, height: size }}
      >
        <Image
          src="/assets/images/imgFiles/my_image.jpg"
          alt="גיא כהן"
          fill
          style={{ objectFit: 'cover' }}
          sizes={`${size}px`}
        />
      </div>
      <div
        className="text-center mt-0.5"
        style={{ fontSize: `${fontScale}rem` }}
      >
        <h2 className="font-bold text-gray-800">גיא כהן</h2>
        <p className="text-main">יועץ המשכנתא שלך</p>
      </div>
    </div>
  );
}
