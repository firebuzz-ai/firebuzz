import { zodResolver } from "@hookform/resolvers/zod";
import { Slot } from "@radix-ui/react-slot";
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual";
import { type VariantProps, cva } from "class-variance-authority";
import { type ClassValue, clsx } from "clsx";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export { Slot, cn, cva, toast, useForm, useVirtualizer, zodResolver };
export type { VariantProps, VirtualItem };
