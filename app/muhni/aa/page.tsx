'use client'
import { useEffect, useState } from 'react'

export default function Cube3D() {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => prev + 1)
    }, 30)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50 to-orange-200">
      <div className="relative w-[250px] h-[250px] [perspective:1000px]">
       
      <iframe title="Data viewer" width="700" height="400" src="https://data.gov.il/dataset/metavhim/resource/a0f56034-88db-4132-8803-854bcdb01ca1/view/b1199e99-2847-4fee-a508-f3699736d613" frameBorder="0"></iframe>
       
       
       
        <div
          className="absolute w-full h-full transform-style-preserve-3d transition-transform duration-100"
          style={{ transform: `rotateY(${rotation}deg) rotateX(${rotation / 2}deg)` }}
        >
          {cubeFaces.map((face, i) => (
            <div
              key={i}
              className={`absolute w-full h-full bg-white/90 border border-orange-300 flex items-center justify-center text-center text-orange-700 text-xl font-bold shadow-xl rounded-xl`}
              style={{
                transform: `rotateY(${face.rotateY}deg) rotateX(${face.rotateX}deg) translateZ(125px)`,
              }}
            >
              {face.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const cubeFaces = [
  { label: 'מסלול פריים', rotateY: 0, rotateX: 0 },
  { label: 'קבועה צמודה', rotateY: 90, rotateX: 0 },
  { label: 'קבועה לא צמודה', rotateY: 180, rotateX: 0 },
  { label: 'משתנה כל 5', rotateY: 270, rotateX: 0 },
  { label: 'הלוואות קיימות', rotateY: 0, rotateX: 90 },
  { label: 'הון עצמי', rotateY: 0, rotateX: -90 },
]

