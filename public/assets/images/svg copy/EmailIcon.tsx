

interface EmailIconProps {
  className?: string;
  color?: string;
  size?: number | string;
}

const EmailIcon: React.FC<EmailIconProps> = ({ className = "", color = "#6B21A8", size = 24 }) => {
  return (
    <svg
      viewBox="0 -2.5 20 20"
      xmlns="http://www.w3.org/2000/svg"
      fill={color}
      width={size}
      height={size}
      className={className}
    >
      <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g id="Dribbble-Light-Preview" transform="translate(-300.000000, -922.000000)" fill={color}>
          <g id="icons" transform="translate(56.000000, 160.000000)">
            <path d="M262,764.291 L254,771.318 L246,764.281 L246,764 L262,764 L262,764.291 Z M246,775 L246,766.945 L254,773.98 L262,766.953 L262,775 L246,775 Z M244,777 L264,777 L264,762 L244,762 L244,777 Z" />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default EmailIcon;
