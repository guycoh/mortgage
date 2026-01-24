"use client"

export default function WhatsAppBusinessCard() {

  /* =========================
     נתוני הכרטיס – כאן עורכים
     ========================= */
  const advisor = {
    name: "גיא כהן",
    role: "יועץ משכנתאות",
    phone: "050-1234567",
    address: "תל אביב",
    website: "https://morgi.co.il",
  }


    const generateVCard = () => {
    const vcard = `
    BEGIN:VCARD
    VERSION:3.0
    N:${advisor.name};;;
    FN:${advisor.name}
    ORG:${advisor.role}
    TEL;TYPE=CELL:${advisor.phone}
    ADR;TYPE=WORK:;;${advisor.address}
    URL:${advisor.website}
    END:VCARD
    `.trim()

    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = `${advisor.name}.vcf`
    link.click()

    URL.revokeObjectURL(url)
    }




  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">

      {/* כרטיס */}
      <div
        className="
          relative
          w-full
          h-screen
          flex
          flex-col
          bg-white

          md:h-[90vh]
          md:max-w-md
          md:rounded-2xl
          overflow-hidden
        "
      >

        {/* HEADER */}
        <div className="h-[24%] bg-[#0F172A]" />

        {/* BODY */}
        <div className="flex-1 bg-[#F8FAFC] px-5 py-6 flex flex-col gap-6">

          {/* שם + תפקיד */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {advisor.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {advisor.role}
            </p>
          </div>

          {/* רצועה 1 – 4 כפתורים */}
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <button
                key={i}
                className="
                  aspect-square
                  w-full
                  rounded-full
                  bg-gradient-to-br from-blue-400 to-blue-600
                  shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.25)]
                "
              />
            ))}
          </div>

          {/* רצועה 2 – גלילה באצבע בלבד, 4 נראים */}
          <div
            className="
              overflow-x-auto
              [-ms-overflow-style:none]
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            <div className="grid grid-flow-col auto-cols-[calc((100%-3*1rem)/4)] gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <button
                  key={i}
                  className="
                    aspect-square
                    rounded-xl
                    bg-gradient-to-br from-gray-200 to-gray-400
                    shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.25)]
                  "
                />
              ))}
            </div>
          </div>

        </div>

        {/* כפתור עגול – הוספה לאנשי קשר */}
       <button
  onClick={generateVCard}
  className="
    absolute
    left-1/2
    bottom-[16%]
    -translate-x-1/2
    translate-y-1/2

    w-20
    h-20
    rounded-full
    bg-white

    shadow-[0_14px_28px_rgba(0,0,0,0.35)]
    flex
    flex-col
    items-center
    justify-center

    font-semibold
    text-gray-800
    select-none

    transition-all
    duration-150
    active:translate-y-[55%]
    active:shadow-[0_6px_12px_rgba(0,0,0,0.35)]
    active:scale-[0.96]
  "
>
  <span className="text-xl leading-none">＋</span>
  <span className="text-[11px] mt-0.5">
    הוספה
  </span>
</button>

        {/* FOOTER */}
        <div className="h-[16%] bg-[#25D366] flex items-center justify-center">
          <span className="text-white font-semibold">
            {advisor.phone}
          </span>
        </div>

      </div>
    </div>
  )
}
