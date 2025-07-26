export const DottedGridBackground = () => {
	return (
		<div
			className="absolute inset-0"
			style={{
				backgroundImage:
					"radial-gradient(circle, hsla(var(--primary) / 0.2) 0.5px, transparent 0.5px)",
				backgroundSize: "10px 10px",
				backgroundPosition: "0 0, 10px 10px",
			}}
		/>
	);
};
