const ThreeDCube = () => {
    return (
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
      >
        {/* Front face */}
        <polygon
          points="50,50 150,50 150,150 50,150"
          fill="#4A90E2"
          stroke="#333"
          strokeWidth="2"
        />
        {/* Top face */}
        <polygon
          points="50,50 100,25 200,25 150,50"
          fill="#6FA8DC"
          stroke="#333"
          strokeWidth="2"
        />
        <polygon
          points="50 100 top stop 50 100%"
          
        />
      </svg>
  );
  };