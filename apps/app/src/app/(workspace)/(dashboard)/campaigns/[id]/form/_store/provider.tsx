"use client";

import { Provider } from "jotai";
import type { ReactNode } from "react";

interface FormStoreProviderProps {
	children: ReactNode;
}

export const FormStoreProvider = ({ children }: FormStoreProviderProps) => {
	return <Provider>{children}</Provider>;
};
