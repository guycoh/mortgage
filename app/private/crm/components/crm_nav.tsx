import Link from 'next/link';
import { useState } from 'react';

const CrmNav = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-gray-500 p-4">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo/Brand */}
        <Link href="/" className="text-white text-xl font-bold">
          מורגי מערכות תוכנה
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6 rtl:space-x-reverse">
          <Link href="/private/crm/wa" className="text-white hover:text-orange-400 transition-colors duration-300 font-medium text-lg">
          הודעות ווצאפ
          </Link>

          <Link href="/private/crm/leadweb" className="text-white hover:text-orange-400 transition-colors duration-300 font-medium text-lg">
            לידים חדשים מהאתר
          </Link>
          
          <Link href="/private/crm/leadweb" className="text-white hover:text-orange-400 transition-colors duration-300 font-medium text-lg">
            לידים חדשים מהאתר
          </Link>
          <Link href="/about" className="text-white hover:text-orange-400 transition-colors duration-300 font-medium text-lg">
            פגישות
          </Link>p
          <Link href="/services" className="text-white hover:text-orange-400 transition-colors duration-300 font-medium text-lg">
            לקוחות
          </Link>
          <Link href="/contact" className="text-white hover:text-orange-400 transition-colors duration-300 font-medium text-lg">
            משכנתאות
          </Link>
        </div>


        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={toggleMobileMenu} className="text-gray-300 hover:text-white focus:outline-none">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu (collapsible) */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-gray-700 mt-2 py-2">
          <div className="container mx-auto flex flex-col space-y-2">
            <Link href="/private/crm/leadweb"
             className="text-gray-300 hover:text-white block px-4 py-2">
             לידים חדשים מהאתר
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white block px-4 py-2">
            פגישות
            </Link>
            <Link href="/services" className="text-gray-300 hover:text-white block px-4 py-2">
            לקוחות
            </Link>
            <Link href="/contact" className="text-gray-300 hover:text-white block px-4 py-2">
              משכנתאות
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default CrmNav;
