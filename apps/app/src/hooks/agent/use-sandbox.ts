import { SanboxContext } from "@/components/providers/agent/sandbox";
import { useContext } from "react";

export const useSandbox = () => {
	const context = useContext(SanboxContext);

	if (!context) {
		throw new Error("useSandbox must be used within a SanboxProvider");
	}

	return context;
};
