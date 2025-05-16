import { motion } from "motion/react";

export const LoadingMessage = () => {
	return (
		<motion.div
			className="w-full max-w-3xl px-3 group/message"
			initial={{ y: 5, opacity: 0 }}
			animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
		>
			{/* 3 Shining Animated Dots */}
			<div className="flex items-center gap-1">
				<div className="rounded-full size-1 bg-muted-foreground animate-pulse" />
				<div className="delay-100 rounded-full size-1 bg-muted-foreground animate-pulse" />
				<div className="delay-200 rounded-full size-1 bg-muted-foreground animate-pulse" />
			</div>
		</motion.div>
	);
};
