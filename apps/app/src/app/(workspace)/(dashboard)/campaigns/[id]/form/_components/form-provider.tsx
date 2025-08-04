"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SaveStatus } from "@/hooks/ui/use-auto-save";

interface FormContextType {
	saveStatus: SaveStatus;
	setSaveStatus: (status: SaveStatus) => void;
	globalSave?: () => void;
	registerGlobalSave: (saveFunction: () => void) => void;
	unregisterGlobalSave: () => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const useFormContext = () => {
	const context = useContext(FormContext);
	if (!context) {
		throw new Error("useFormContext must be used within FormProvider");
	}
	return context;
};

interface FormProviderProps {
	children: ReactNode;
	value: FormContextType;
}

export const FormProvider = ({ children, value }: FormProviderProps) => {
	return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};