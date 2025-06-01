'use client'

import { useEffect, useRef, useState } from 'react'

type Payment = {
  month: number
  principal: number
  interest: number
  total: number
}

type Props = {
  payments: Payment[]
}

export default function EqualPrincipalGraph({ payments }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 })

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: rect.width,
          height: Math.max(250, rect.width * 0.4), // שמור על פרופורציה טובה
        })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { width, height } = dimensions
  const paddingLeft = 40
  const paddingRight = 70
  const paddingTopBottom = 70

  const safeTotals = payments.map(p => p.total).filter(v => typeof v === 'number' && !isNaN(v))
  const maxY = safeTotals.length > 0 ? Math.max(...safeTotals) : 0

  const yStep = 2000
  const yMaxRounded = Math.ceil(maxY / yStep) * yStep || yStep
  const yValues = Array.from({ length: yMaxRounded / yStep + 1 }, (_, i) => i * yStep)

  const stepX = (width - paddingLeft - paddingRight) / Math.max(payments.length - 1, 1)

  const getY = (value: number) => {
    if (isNaN(value)) return height - paddingTopBottom
    return height - paddingTopBottom - (value / yMaxRounded) * (height - paddingTopBottom * 2)
  }

  const buildPath = (getter: (p: Payment) => number) =>
    payments
      .map((p, i) => {
        const y = getY(getter(p))
        const x = paddingLeft + i * stepX
        return isNaN(y) ? '' : `${i === 0 ? 'M' : 'L'}${x},${y}`
      })
      .filter(Boolean)
      .join(' ')

  return (
    <div ref={containerRef} className="relative border rounded bg-white p-5 shadow w-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* צירים */}
        <line x1={paddingLeft} y1={paddingTopBottom} x2={paddingLeft} y2={height - paddingTopBottom} stroke="#aaa" strokeWidth={1} />
        <line x1={paddingLeft} y1={height - paddingTopBottom} x2={width - paddingRight} y2={height - paddingTopBottom} stroke="#aaa" strokeWidth={1} />

        {/* קווי עזר Y */}
        {yValues.map((yVal, i) => {
          const y = getY(yVal)
          return !isNaN(y) && (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#666"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 12}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#333"
                fontWeight="500"
              >
                {yVal.toLocaleString('he-IL')}
              </text>
            </g>
          )
        })}

        {/* תוויות חודש X */}
        {Array.from({ length: 6 }, (_, i) => {
          const index = Math.round((payments.length - 1) * (i / 5))
          const x = paddingLeft + index * stepX
          return (
            <text
              key={i}
              x={x}
              y={height - paddingTopBottom + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#333"
              fontWeight="500"
            >
              חודש {index + 1}
            </text>
          )
        })}

        {/* כותרת ציר Y */}
        <text
          x={paddingLeft / 2}
          y={height / 2}
          fontSize="14"
          fill="#111"
          fontWeight="600"
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90 ${paddingLeft / 2} ${height / 2})`}
        >
          סכום תשלום חודשי (₪)
        </text>

        {/* קווים */}
        <path d={buildPath(p => p.principal)} stroke="#10b981" fill="none" strokeWidth={1.5} />
        <path d={buildPath(p => p.interest)} stroke="#f43f5e" fill="none" strokeWidth={1.5} />
        <path d={buildPath(p => p.total)} stroke="#3b82f6" fill="none" strokeWidth={2} />

        {/* מקרא */}
        <g transform={`translate(${width / 2 - 150}, ${height - 10})`}>
          {[{ color: '#10b981', label: 'קרן' }, { color: '#f43f5e', label: 'ריבית' }, { color: '#3b82f6', label: 'סה"כ' }].map((item, index) => (
            <g key={index} transform={`translate(${index * 100}, 0)`}>
              <text x={0} y={0} fontSize="13" fontWeight="500" fill="#333" textAnchor="middle" direction="rtl">
                {item.label}
              </text>
              <line x1={-15} y1={5} x2={15} y2={5} stroke={item.color} strokeWidth={4} strokeLinecap="round" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}













// 'use client'

// type Payment = {
//   month: number
//   principal: number
//   interest: number
//   total: number
// }

// type Props = {
//   payments: Payment[]
//   width?: number
//   height?: number
// }

// export default function EqualPrincipalGraph({ payments, width = 800, height = 300 }: Props) {
//   const paddingLeft = 40
//   const paddingRight = 70
//   const paddingTopBottom = 70

//   const safeTotals = payments.map(p => p.total).filter(v => typeof v === 'number' && !isNaN(v))
//   const maxY = safeTotals.length > 0 ? Math.max(...safeTotals) : 0

//   const yStep = 2000
//   const yMaxRounded = Math.ceil(maxY / yStep) * yStep || yStep
//   const yValues = Array.from({ length: yMaxRounded / yStep + 1 }, (_, i) => i * yStep)

//   const stepX = (width - paddingLeft - paddingRight) / Math.max(payments.length - 1, 1)

//   const getY = (value: number) => {
//     if (isNaN(value)) return height - paddingTopBottom
//     return height - paddingTopBottom - (value / yMaxRounded) * (height - paddingTopBottom * 2)
//   }

//   const buildPath = (getter: (p: Payment) => number) =>
//     payments
//       .map((p, i) => {
//         const y = getY(getter(p))
//         const x = paddingLeft + i * stepX
//         return isNaN(y) ? '' : `${i === 0 ? 'M' : 'L'}${x},${y}`
//       })
//       .filter(Boolean)
//       .join(' ')

//   return (
//     <div className="relative border rounded bg-white p-5 shadow overflow-x-auto">
//       <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
//         {/* צירי גרף */}
//         <line x1={paddingLeft} y1={paddingTopBottom} x2={paddingLeft} y2={height - paddingTopBottom} stroke="#aaa" strokeWidth={1} />
//         <line x1={paddingLeft} y1={height - paddingTopBottom} x2={width - paddingRight} y2={height - paddingTopBottom} stroke="#aaa" strokeWidth={1} />

//         {/* קווי עזר וערכי Y */}
//         {yValues.map((yVal, i) => {
//           const y = getY(yVal)
//           return !isNaN(y) && (
//             <g key={i}>
//               <line
//                 x1={paddingLeft}
//                 y1={y}
//                 x2={width - paddingRight}
//                 y2={y}
//                 stroke="#666"
//                 strokeWidth={1}
//                 strokeDasharray="4 4"
//               />
//               <text
//                 x={paddingLeft - 12}
//                 y={y + 4}
//                 textAnchor="end"
//                 fontSize="12"
//                 fill="#333"
//                 fontWeight="500"
//               >
//                 {yVal.toLocaleString('he-IL')}
//               </text>
//             </g>
//           )
//         })}

//         {/* תוויות ציר X */}
//         {Array.from({ length: 6 }, (_, i) => {
//           const index = Math.round((payments.length - 1) * (i / 5))
//           const x = paddingLeft + index * stepX
//           return (
//             <text
//               key={i}
//               x={x}
//               y={height - paddingTopBottom + 20}
//               textAnchor="middle"
//               fontSize="12"
//               fill="#333"
//               fontWeight="500"
//             >
//               חודש {index + 1}
//             </text>
//           )
//         })}

//         {/* כותרת ציר Y */}
//         <text
//           x={paddingLeft / 2}
//           y={height / 2}
//           fontSize="14"
//           fill="#111"
//           fontWeight="600"
//           textAnchor="middle"
//           dominantBaseline="middle"
//           transform={`rotate(-90 ${paddingLeft / 2} ${height / 2})`}
//         >
//           סכום תשלום חודשי (₪)
//         </text>

//         {/* גרפים */}
//         <path d={buildPath(p => p.principal)} stroke="#10b981" fill="none" strokeWidth={1.5} />
//         <path d={buildPath(p => p.interest)} stroke="#f43f5e" fill="none" strokeWidth={1.5} />
//         <path d={buildPath(p => p.total)} stroke="#3b82f6" fill="none" strokeWidth={2} />

//         {/* מקרא */}
//         <g transform={`translate(${width / 2 - 150}, ${height - 10})`}>
//           {[
//             { color: '#10b981', label: 'קרן' },
//             { color: '#f43f5e', label: 'ריבית' },
//             { color: '#3b82f6', label: 'סה"כ' },
//           ].map((item, index) => (
//             <g key={index} transform={`translate(${index * 100}, 0)`}>
//               <text
//                 x={0}
//                 y={0}
//                 fontSize="13"
//                 fontWeight="500"
//                 fill="#333"
//                 textAnchor="middle"
//                 direction="rtl"
//               >
//                 {item.label}
//               </text>
//               <line
//                 x1={-15}
//                 y1={5}
//                 x2={15}
//                 y2={5}
//                 stroke={item.color}
//                 strokeWidth={4}
//                 strokeLinecap="round"
//               />
//             </g>
//           ))}
//         </g>
//       </svg>
//     </div>
//   )
// }
