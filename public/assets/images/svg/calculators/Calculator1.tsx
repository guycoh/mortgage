// width={size}
// height={size}
// viewBox="-0.5 0 25 25"
// fill="none"
// xmlns="http://www.w3.org/2000/svg"
// className={className}

interface CalculatorSvgProps {
  color?: string;
  size?: number | string;
  className?: string;
}

export default function Calculator1({
  color = 'currentColor',
  size = 24,
  className = '',
}: CalculatorSvgProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3Z" />
      <path d="M7 7H17" />
      <path d="M7 13H9" />
      <path d="M11 13H13" />
      <path d="M15 13H17" />
      <path d="M7 17H9" />
      <path d="M11 17H13" />
      <path d="M15 17H17" />
    </svg>
  );
}






















// interface Calculator1Props {
//   size?: number | string;
//   color?: string;
//   className?: string;
// }

// const Calculator1: React.FC<Calculator1Props> = ({
//   size = 24,
//   color = "#0F0F0F",
//   className = "",
// }) => {
//   return (
//     //
    
//     <svg
//       width={size}
//       height={size}
//       viewBox="-0.5 0 25 25"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//       className={className}
//     >
//       <path
//         d="M19.505 21.475C19.505 21.765 19.185 21.995 18.785 21.995H5.215C4.825 21.995 4.495 21.765 4.495 21.475V3.525C4.495 3.235 4.815 3.005 5.215 3.005H18.785C19.175 3.005 19.505 3.235 19.505 3.525V21.475Z"
//         stroke={color}
//         strokeMiterlimit="10"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//       <path
//         d="M16.395 8.505H7.61499C7.27499 8.505 7.005 8.235 7.005 7.895V6.11501C7.005 5.77501 7.27499 5.505 7.61499 5.505H16.395C16.735 5.505 17.005 5.77501 17.005 6.11501V7.895C17.005 8.235 16.725 8.505 16.395 8.505Z"
//         stroke={color}
//         strokeMiterlimit="10"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
// (
//         <>
//           <path
           
//             stroke={color}
//             strokeMiterlimit="10"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           />
//           <path
            
//             stroke={color}
//             strokeMiterlimit="10"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           />
//           <path
           
//             stroke={color}
//             strokeMiterlimit="10"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           />
//         </>
//       )
//       <path
    
//         stroke={color}
//         strokeMiterlimit="10"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// };

// export default Calculator1;
