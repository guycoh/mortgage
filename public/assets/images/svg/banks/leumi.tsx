

interface SvgProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

const LeumiLogo: React.FC<SvgProps> = ({
  width = 343,
  height = 126,
  className = "",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      width={width}
      height={height}
      className={className}
      style={{
        shapeRendering: "geometricPrecision",
        textRendering: "geometricPrecision",
        imageRendering: "auto", // או "crisp-edges" / "pixelated"
        fillRule: "evenodd",
        clipRule: "evenodd",
      }}
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 343 126"
    >
      {/* כל ה־<g> וה־<path> כאן */}
      <g>
        <path
          style={{ opacity: 1 }}
          fill="#eaecea"
          d="M -0.5,-0.5 C 113.833,-0.5 228.167,-0.5 342.5,-0.5C 342.5,0.166667 342.5,0.833333 342.5,1.5C 228.167,1.5 113.833,1.5 -0.5,1.5C -0.5,0.833333 -0.5,0.166667 -0.5,-0.5 Z"
        />
      </g>
      {/* שאר הגרפיקה כאן... */}
    </svg>
  );
};

export default LeumiLogo;
