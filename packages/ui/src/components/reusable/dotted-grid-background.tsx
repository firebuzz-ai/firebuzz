export const DottedGridBackground = ({ isDark }: { isDark: boolean }) => {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `radial-gradient(circle, ${isDark ? "#ffffff10" : "#00000010"} 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 10px 10px",
      }}
    />
  );
};
