import { motion } from "motion/react";

export const GeneratingAnimation = () => {
	return (
		<motion.div
			key="generating"
			className="flex items-center justify-center w-full h-full px-12 py-8"
			initial={{ opacity: 0, y: 40 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 40 }}
		>
			<div className="grid w-full h-full gap-1 grid-cols-[repeat(24,minmax(0,1fr))] grid-rows-[repeat(24,minmax(0,1fr))]">
				{Array.from({ length: 24 }).map((_, rowIndex) =>
					Array.from({ length: 24 }).map((_, colIndex) => (
						<motion.div
							// biome-ignore lint/suspicious/noArrayIndexKey: grid animation
							key={`${rowIndex}-${colIndex}`}
							initial={{
								opacity: 1,
								scale: 0.9,
								backgroundColor: "rgba(249, 127, 39, 0.9)",
								x: 0,
							}}
							animate={{
								opacity: 1,
								scale: 1,
								backgroundColor: "rgba(249, 127, 39, 1)",
								x: 1,
							}}
							transition={{
								duration: 0.5,
								delay: colIndex * 0.1,
								ease: "easeInOut",
								damping: 10,
								repeat: Number.POSITIVE_INFINITY,
								repeatType: "reverse",
								repeatDelay: 0.5,
							}}
							className="col-span-1 rounded-sm"
						/>
					)),
				)}
			</div>
		</motion.div>
	);
};
