import { subscriptionContext } from "@/components/providers/workspace/subscription";
import { useContext } from "react";

export const useSubscription = () => {
  return useContext(subscriptionContext);
};
