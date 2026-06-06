"use client";

import { useState, useRef } from "react";

export default function PdfUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const isNameValid = name.trim().length >= 2;

  const isPhoneValid = /^05\d{8}$/.test(
    phone.replace(/\D/g, "")
  );


  const isFormValid =
    file &&
    isNameValid &&
    isPhoneValid;


  const handleFile = (selected: File) => {

    if (selected.type !== "application/pdf") {
      alert("ניתן להעלות קובץ PDF בלבד");
      return;
    }

    setFile(selected);
  };


  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>
  ) => {

    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];

    if (droppedFile) {
      handleFile(droppedFile);
    }
  };


  const submit = () => {

    if (!isFormValid) return;


    console.log({
      file,
      name,
      phone
    });


    alert("הקובץ נשלח בהצלחה");
  };


  return (
    <div className="max-w-xl mx-auto p-6">

      <div className="
        bg-white
        rounded-2xl
        shadow-lg
        border
        border-gray-200
        p-6
        space-y-5
      ">


        <h2
  className="
    text-2xl
    font-bold
    text-gray-800
    text-center
    leading-snug
  "
>
  העלאת דוח יתרות לסילוק
</h2>


<div
  className="
    mt-5
    bg-blue-50
    border
    border-blue-200
    rounded-xl
    p-4
    text-center
  "
>

<p
  className="
    text-center
    text-gray-600
    mt-3
    leading-relaxed
  "
>
  העלו כאן את הדוח המקורי שקיבלתם מהבנק,
  <br />
  כדי שנוכל לבצע עבורכם בדיקה מקצועית.
</p>





  <p className="
    text-gray-700
    font-medium
    leading-relaxed
  ">
    יועץ משכנתאות מקצועי יבדוק את הנתונים,
    <br />
    ויעניק לכם חוות דעת לגבי כדאיות מחזור המשכנתא.
  </p>

</div>





        {/* אזור העלאה */}
        {!file ? (

          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e)=>e.preventDefault()}
            onDrop={handleDrop}

            className={`
              border-2
              border-dashed
              rounded-xl
              p-10
              text-center
              cursor-pointer
              transition
              ${
                dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300"
              }
            `}
            
            onClick={() =>
              fileInputRef.current?.click()
            }
          >

            <div className="text-gray-600">

              <div className="text-4xl mb-3">
                📄
              </div>

              <div className="font-semibold">
                גרור לכאן קובץ PDF
              </div>

              <div className="text-sm mt-2">
                או לחץ לבחירת קובץ
              </div>

            </div>


            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e)=>{
                const f=e.target.files?.[0];
                if(f) handleFile(f);
              }}
            />

          </div>

        ) : (

          <div className="
            bg-gray-50
            rounded-xl
            p-4
            flex
            justify-between
            items-center
          ">

            <span className="font-medium text-gray-700">
              {file.name}
            </span>

            <button
              onClick={()=>{
                setFile(null);
                setName("");
                setPhone("");
              }}
              className="
                text-red-600
                font-bold
              "
            >
              החלף
            </button>

          </div>

        )}



        {/* שדות */}
        {file && (

          <div className="space-y-4">


            <div>
              <label className="block mb-1 text-gray-700">
                שם
              </label>

              <input
                value={name}
                onChange={(e)=>setName(e.target.value)}
                className="
                  w-full
                  rounded-lg
                  border
                  p-3
                  outline-none
                  focus:border-blue-500
                "
                placeholder="הזן שם"
              />

            </div>



            <div>
              <label className="block mb-1 text-gray-700">
                טלפון
              </label>

              <input
                value={phone}
                onChange={(e)=>setPhone(e.target.value)}
                className="
                  w-full
                  rounded-lg
                  border
                  p-3
                  outline-none
                  focus:border-blue-500
                "
                placeholder="05XXXXXXXX"
              />

            </div>



            <button
              disabled={!isFormValid}
              onClick={submit}

              className={`
                w-full
                py-3
                rounded-xl
                font-bold
                transition

                ${
                  isFormValid
                  ?
                  "bg-blue-600 text-white hover:bg-blue-700"
                  :
                  "bg-gray-300 text-gray-500 cursor-not-allowed"
                }
              `}
            >

              שליחה

            </button>


          </div>

        )}

      </div>

    </div>
  );
}