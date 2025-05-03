import Link from "next/link";



export default function Nav_admin() {
  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center" dir="rtl">
          {/* Empty div to push buttons to the left */}
          <div></div>
          
          {/* Buttons container */}
          <div className="flex space-x-4">
            <Link href="/muhni" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow focus:outline-none">
              לאתר הבית
            </Link>
           
            
            {/* <Link href="/home" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow focus:outline-none">
              log out
            </Link> */}
          </div>
        </div>
      </div>
    </nav>
  );
}


  


   
  