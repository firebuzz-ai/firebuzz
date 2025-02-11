import { zodResolver } from "@hookform/resolvers/zod";
import { type VariantProps, cva } from "class-variance-authority";
import { type ClassValue, clsx } from "clsx";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export { cn, cva, toast, useForm, zodResolver };
export type { VariantProps };
