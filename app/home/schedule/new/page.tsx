"use client"
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import NameIcon from "@/app/svgFiles/name";
import MorgyIco from "@/app/svgFiles/morgy";
import MailIcon from "@/app/svgFiles/mail";


import { useSearchParams } from 'next/navigation';





//   const searchParams = useSearchParams();
//   const selectedDate = searchParams.get('selectedDate');
//   const selectedTime = searchParams.get('selectedTime');

// //   const date_zoom=selectedDate?.valueOf();
// //   const hour_zoom=selectedTime?.valueOf();







// // Initialize Supabase client


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const NewAppointment: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cell: '',
    date_zoom:'',
    hour_zoom:'',
    zoom_comment:'',
    zoom:true

  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle input changes
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

// Handle input changes
const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };






  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.from('leads').insert([
        {
          name: formData.name,
          email: formData.email,
          cell: formData.cell,
          date_zoom: formData.date_zoom,
          hour_zoom: formData.hour_zoom,
          zoom_comment: formData.zoom_comment,
          zoom:true
        },
      ]);

      if (error) {
        throw error;
      }

      setSuccess('Form submitted successfully!');
      setFormData({ name: '', email: '', cell: '', date_zoom:'', hour_zoom:'', zoom_comment:'',zoom:true}); // Reset form
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };
  









  return (

<div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
    <div className="max-w-4xl w-full bg-white shadow-lg rounded-lg overflow-hidden flex flex-col md:flex-row">
      {/* קביעת פגישה      */}

           
      <div className="w-full md:w-1/2 p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
        קביעת פגישת זום
        </h2>

        <h2 className="text-2xl font-bold mb-6 text-gray-800">
       
        </h2>
      
        <form onSubmit={handleSubmit}  className="space-y-4">
             <input
              name="date_zoom"
              type="hidden"
              readOnly
              value={formData.date_zoom}              
              onChange={handleChange}
              />
              <input
              name="hour_zoom"
              type="hidden"
              readOnly
              value={formData.hour_zoom}            
              onChange={handleChange}
     
              />


          {/* שם*/}
          <div className="relative">
          < div className="absolute bottom-1 left-1  w-[36px] h-[36px]">
                <NameIcon/>          
          </div>
           
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              שם מלא
            </label>
            <input
              type="text"
              name="name"
              placeholder="הכנס שם מלא"
              onChange={handleChange}
              value={formData.name}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:bg-orange-50  "
            />
          </div>
          {/* מייל*/}         
          <div className="relative" >
          < div className="absolute bottom-1 left-1  w-[36px] h-[36px]">
                <MailIcon/>          
          </div>
            
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              דוא"ל
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="כתובת מייל "
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:bg-orange-50   "
            />
          </div>
         
          {/* טלפון*/}
          <div className="relative" >            
          < div className="absolute bottom-1 left-1  w-[36px] h-[36px]">
                     
          </div>
            <label
              htmlFor="cell"
              className="block text-sm font-medium text-gray-700"
            >
            טלפון
            </label>
            <input
              type="text"
              placeholder="טלפון "
              name="cell"
              value={formData.cell}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:bg-orange-50 "
              onChange={handleChange}
            />
          </div>
         
          {/* zoom_comment*/}
          <div>
            <label
              htmlFor="zoom_comment"
              className="block text-sm font-medium text-gray-700"
            >
             משהו  נוסף שתרצה להוסיף
            </label>
            <textarea
              onChange={handleTextChange}
              name="zoom_comment"
              value={formData.cell}
              rows={4}
              placeholder="כתוב את הודעתך כאן..."
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:bg-orange-50  "
            ></textarea>
          </div>



          <button
            type="submit"
            className="w-full px-4 py-2 bg-[#1d75a1] text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
          
           {loading ? 'קובע פגישה ....' : 'קבע פגישה'}             

          </button>
    
            {/* Success Message */}
            {success && <p className="text-green-500 mt-4">{success}</p>}

          {/* Error Message */}
           {error && <p className="text-red-500 mt-4">{error}</p>}



        </form>
      </div>

      {/* צד SVG */}
      <div className="hidden md:flex w-1/2 bg-[#1d75a1] items-center justify-center relative  ">
          < div className="absolute  left-3 top-2  w-[86px] h-[86px] text-white">
                <MorgyIco/>          
          </div>
          < div className="absolute right-3 top-4">
                <h1 className="text-3xl text-white"> מורגי- משכנתא מכל הלב  </h1>
          </div>
          <div className="mx-5 text-white text-pretty text-xl">
                  <p   className="text-wrap " >
                    מייל אישור הפגישה בתאריך 
                  
                    <span>{formData.date_zoom}
                      
                      </span>
                   בשעה 
                    <span> {formData.hour_zoom} </span>
                    יישלח אליך במייל
                  </p>
                  <br></br>
                  <p>
                  חשוב להיות במקום שקט בפגישה ללא הפרעות כדי שנוכל לתת לך את השרות הטוב ביותר.
                  </p>
          </div>

      </div>





    </div>
  </div>



  );
};

export default NewAppointment;