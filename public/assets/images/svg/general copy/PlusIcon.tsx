
interface PlusIconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

const PlusIcon: React.FC<PlusIconProps> = ({
  size = 24,
  color = "currentColor",
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -0.5 21 21"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill={color}
    >
      <g fill={color} fillRule="evenodd">
        <polygon points="344 89 344 91 334.55 91 334.55 100 332.45 100 332.45 91 323 91 323 89 332.45 89 332.45 80 334.55 80 334.55 89" transform="translate(-379 -240) translate(56 160)" />
      </g>
    </svg>
  );
};

export default PlusIcon;
