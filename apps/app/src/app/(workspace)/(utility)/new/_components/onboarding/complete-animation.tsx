import { sleep } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatedBackground } from "../animated-background";

export const CompleteAnimation = () => {
	const router = useRouter();
	const [isFadingOut, setIsFadingOut] = useState(false);
	const [countdown, setCountdown] = useState(3);
	const animatedBackgroundRef = useRef<{
		startReveal: () => void;
		startFadeout: () => void;
	}>(null);

	// Handle onboarding completion
	useEffect(() => {
		// Start the animated background reveal
		setTimeout(() => {
			animatedBackgroundRef.current?.startReveal();
		}, 100);

		// Start countdown after background animation starts
		setTimeout(() => {
			const countdownInterval = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						clearInterval(countdownInterval);
						// Start fadeout and redirect
						setTimeout(async () => {
							animatedBackgroundRef.current?.startFadeout();
							setIsFadingOut(true);
							await sleep(1000);
							router.push("/");
						}, 500);
						return 0;
					}
					return prev - 1;
				});
			}, 1000); // Count down every second
		}, 1500); // Start countdown 1.5s after background starts
	}, [router]);

	return (
		<div className="relative flex flex-col items-center justify-center flex-1 overflow-hidden">
			<AnimatedBackground ref={animatedBackgroundRef} />

			<AnimatePresence>
				{!isFadingOut && (
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: 50 }}
						animate={{
							opacity: 1,
							scale: 1,
							y: 0,
							transition: {
								duration: 0.8,
								ease: [0.16, 1, 0.3, 1],
								delay: 1.2, // Wait for background animation to start
							},
						}}
						exit={{
							opacity: 0,
							scale: 0.8,
							y: 50,
							transition: { duration: 0.1, ease: "easeInOut" },
						}}
						className="relative z-10 max-w-2xl px-8 space-y-6 text-center"
					>
						{/* Countdown */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{
								opacity: 1,
								y: 0,
								transition: { delay: 1.8, duration: 0.6 },
							}}
							className="flex flex-col items-center space-y-4"
						>
							{countdown > 0 && (
								<motion.div
									key={countdown}
									initial={{ scale: 0.5, opacity: 0 }}
									animate={{
										scale: 1,
										opacity: 1,
										transition: {
											type: "spring",
											stiffness: 200,
											damping: 10,
										},
									}}
									exit={{
										scale: 1.5,
										opacity: 0,
										transition: { duration: 0.3 },
									}}
									className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-[#f97f27] via-[#ff6b00] to-[#f97f27] bg-clip-text text-transparent"
								>
									{countdown}
								</motion.div>
							)}

							<motion.p
								className="text-lg font-medium text-muted-foreground"
								initial={{ opacity: 0, y: 10 }}
								animate={{
									opacity: 1,
									y: 0,
									transition: { delay: 2.2, duration: 0.5 },
								}}
							>
								Ready to buzzz!
							</motion.p>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
