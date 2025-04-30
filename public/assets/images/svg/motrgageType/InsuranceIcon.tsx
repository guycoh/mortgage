// 
interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

const InsuranceIcon: React.FC<IconProps> = ({ size = 24, color = "currentColor", className = "" }) => {
  return (
    <svg
      fill={color}
      width={size}
      height={size}
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <g>
          <path d="M60,48L60,48V1c0-0.6-0.4-1-1-1H15c-0.6,0-1,0.4-1,1v58c0,0.6,0.4,1,1,1h33c0.3,0,0.5-0.1,0.7-0.3l11-11
            c0.1-0.1,0.1-0.2,0.2-0.3v-0.1C60,48.2,60,48.1,60,48z M16,2h42v45H48c-0.6,0-1,0.4-1,1v10H16V2z M49,56.6V49h7.6l-3.8,3.8
            L49,56.6z"/>
          <path d="M33,37v-6V16h6.6l6.2,7H39v2h8v12h2V24c0-0.3-0.1-0.5-0.3-0.7l-8-9C40.6,14.1,40.3,14,40,14h-7V7c0-0.6-0.4-1-1-1H20v2h11
            v7v15H20v2h11v4H20v2h12C32.6,38,33,37.6,33,37z"/>
          <path d="M40,34c-3.3,0-6,2.7-6,6s2.7,6,6,6s6-2.7,6-6S43.3,34,40,34z M40,44c-2.2,0-4-1.8-4-4s1.8-4,4-4s4,1.8,4,4S42.2,44,40,44z
            "/>
          <rect x="39" y="28" width="3" height="2"/>
          <circle cx="40" cy="40" r="2"/>
          <rect x="45" y="6" width="9" height="2"/>
          <rect x="42" y="10" width="12" height="2"/>
          <rect x="20" y="43" width="6" height="2"/>
          <rect x="20" y="48" width="14" height="2"/>
          <rect x="20" y="53" width="14" height="2"/>
          <rect x="22" y="12" width="2" height="2"/>
          <rect x="26" y="12" width="2" height="2"/>
          <rect x="22" y="16" width="2" height="2"/>
          <rect x="26" y="16" width="2" height="2"/>
          <rect x="22" y="20" width="2" height="2"/>
          <rect x="26" y="20" width="2" height="2"/>
          <rect x="22" y="24" width="2" height="2"/>
          <rect x="26" y="24" width="2" height="2"/>
          <path d="M8.9,0.7C8.8,0.3,8.4,0,8,0S7.2,0.3,7.1,0.7L4.2,9.4C4.1,9.5,4,9.7,4,9.9V10l0,0v38v5H2V24H0v30c0,0.6,0.4,1,1,1h3v4
            c0,0.6,0.4,1,1,1h6c0.6,0,1-0.4,1-1V48V10c0-0.2-0.1-0.5-0.2-0.6L8.9,0.7z M6,11h4v36H6V11z M8,4.2L9.6,9H6.4L8,4.2z M10,58H6v-9
            h4V58z"/>
        </g>
      </g>
    </svg>
  );
};

export default InsuranceIcon;