"use client";

import { cn } from "@firebuzz/ui/lib/utils";
import { OTPInput, type SlotProps } from "input-otp";

// Feel free to copy. Uses @shadcn/ui tailwind colors.
function Slot(props: SlotProps) {
	return (
		<div
			className={cn(
				"relative w-10 h-14 text-[2rem]",
				"flex items-center justify-center",
				"transition-all duration-300",
				"border-border border-y border-r first:border-l first:rounded-l-md last:rounded-r-md",
				"group-hover:border-accent-foreground/20 group-focus-within:border-accent-foreground/20",
				"outline outline-0 outline-accent-foreground/20",
				{
					"outline-4 outline-accent-foreground z-10": props.isActive,
				},
			)}
		>
			{props.char !== null && <div>{props.char}</div>}
			{props.hasFakeCaret && <FakeCaret />}
		</div>
	);
}

function FakeCaret() {
	return (
		<div className="absolute pointer-events-none inset-0 flex items-center justify-center animate-caret-blink">
			<div className="w-px h-8 bg-white" />
		</div>
	);
}

function FakeDash() {
	return (
		<div className="flex w-10 justify-center items-center">
			<div className="w-3 h-1 rounded-full bg-border" />
		</div>
	);
}

export { FakeCaret, FakeDash, OTPInput, Slot };
