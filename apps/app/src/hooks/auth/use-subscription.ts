import { useContext } from "react";
import { subscriptionContext } from "@/components/providers/workspace/subscription";

export const useSubscription = () => {
	return useContext(subscriptionContext);
};
