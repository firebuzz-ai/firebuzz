export const DottedGridBackground = ({ isDark }: { isDark: boolean }) => (
  <div
    className="absolute inset-0"
    style={{
      backgroundImage: `radial-gradient(circle, ${isDark ? "#71717a" : "#a1a1aa"} 1px, transparent 1px)`,
      backgroundSize: "20px 20px",
      backgroundPosition: "0 0, 10px 10px",
    }}
  />
);
