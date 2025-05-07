// components/icons/CustomIcon.tsx
import React from "react";

interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
}


const Calculator6: React.FC<IconProps> = ({
  size = 24,
  color = "currentColor",
  className = "",
}) => (
  <svg
  version="1.1" id="Capa_1"
  width={size}
  height={size} 
  viewBox="0 0 31.688 31.688"
  fill={color}
  xmlns="http://www.w3.org/2000/svg"  
  className={className}
  >
    <g>
          <g>
                <path d="M29.116,3.383v2h-2.522v-1.2h-1.65v1.199h-0.68V4.183h-1.65v1.199h-7.279V4.183h-1.649v1.199h-0.681V4.183h-1.649v1.199
                  H9.702v-2.31H7.13v8.878h2.572v-1.548h7.136v1.066h1.648v-1.066h0.681v1.066h1.649v-1.066h0.633v1.066h1.648v-1.066h2.67v1.066
                  h1.649v-1.066h1.698v3.71h-7.449v-1.066h-1.65v1.066h-0.68v-1.066h-0.727v2.976h0.727v-1.066h0.68v1.066h1.65v-1.066h7.449v4.021
                  h-0.51v-1.066h-1.649v1.066h-3.011v-1.066h-1.649v1.066h-2.098v-1.066h-1.589v2.976h1.589v-1.065h2.098v1.065h1.649v-1.065h3.011
                  v1.065h1.649v-1.065h0.51v2.621h2.572V3.383H29.116z M29.116,9.558h-1.698V8.492h-1.65v1.066H23.1V8.492H21.45v1.066h-0.632V8.492
                  h-1.65v1.066h-0.68V8.492h-1.649v1.066H9.702V6.226h1.651v0.933h1.649V6.226h0.681v0.933h1.649V6.226h7.279v0.933h1.65V6.226h0.68
                  v0.933h1.65V6.226h2.521v3.332H29.116z"/>
                <path d="M14.807,11.95h-1.998v1.548H4.751V11.95H2.754v1.548H0v15.117h16.941V13.498h-2.135L14.807,11.95L14.807,11.95z
                  M16.113,27.789H0.825v-7.951h2.927v0.914h2.377v-0.914h4.733v1.021h2.376v-1.021h2.875V27.789z M16.113,14.325v4.685h-2.875
                  v-0.955h-2.376v0.955H6.129v-1.063H3.752v1.063H0.825v-4.685H16.113z"/>
                <path d="M2.32,23.297h0.727v3.392h10.967v-3.392h0.728v-1.138H2.32V23.297z M3.46,23.297h10.141v2.979H3.46V23.297z"/>
                <rect x="5.354" y="25.047" width="6.388" height="0.586"/>
          </g>
    </g>
  </svg>
);

export default Calculator6;
