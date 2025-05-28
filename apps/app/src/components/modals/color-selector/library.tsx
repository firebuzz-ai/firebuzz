import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Search } from "@firebuzz/ui/icons/lucide";
import { TailwindIcon } from "@firebuzz/ui/icons/social";
import { cn } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";

interface ColorItem {
	name: string;
	value: string;
	shade: string;
	family: string;
}

// Tailwind color palette organized by families
const TAILWIND_COLORS: ColorItem[] = [
	// Grays
	{ name: "slate-50", value: "#f8fafc", shade: "50", family: "slate" },
	{ name: "slate-100", value: "#f1f5f9", shade: "100", family: "slate" },
	{ name: "slate-200", value: "#e2e8f0", shade: "200", family: "slate" },
	{ name: "slate-300", value: "#cbd5e1", shade: "300", family: "slate" },
	{ name: "slate-400", value: "#94a3b8", shade: "400", family: "slate" },
	{ name: "slate-500", value: "#64748b", shade: "500", family: "slate" },
	{ name: "slate-600", value: "#475569", shade: "600", family: "slate" },
	{ name: "slate-700", value: "#334155", shade: "700", family: "slate" },
	{ name: "slate-800", value: "#1e293b", shade: "800", family: "slate" },
	{ name: "slate-900", value: "#0f172a", shade: "900", family: "slate" },
	{ name: "slate-950", value: "#020617", shade: "950", family: "slate" },

	{ name: "gray-50", value: "#f9fafb", shade: "50", family: "gray" },
	{ name: "gray-100", value: "#f3f4f6", shade: "100", family: "gray" },
	{ name: "gray-200", value: "#e5e7eb", shade: "200", family: "gray" },
	{ name: "gray-300", value: "#d1d5db", shade: "300", family: "gray" },
	{ name: "gray-400", value: "#9ca3af", shade: "400", family: "gray" },
	{ name: "gray-500", value: "#6b7280", shade: "500", family: "gray" },
	{ name: "gray-600", value: "#4b5563", shade: "600", family: "gray" },
	{ name: "gray-700", value: "#374151", shade: "700", family: "gray" },
	{ name: "gray-800", value: "#1f2937", shade: "800", family: "gray" },
	{ name: "gray-900", value: "#111827", shade: "900", family: "gray" },
	{ name: "gray-950", value: "#030712", shade: "950", family: "gray" },

	{ name: "zinc-50", value: "#fafafa", shade: "50", family: "zinc" },
	{ name: "zinc-100", value: "#f4f4f5", shade: "100", family: "zinc" },
	{ name: "zinc-200", value: "#e4e4e7", shade: "200", family: "zinc" },
	{ name: "zinc-300", value: "#d4d4d8", shade: "300", family: "zinc" },
	{ name: "zinc-400", value: "#a1a1aa", shade: "400", family: "zinc" },
	{ name: "zinc-500", value: "#71717a", shade: "500", family: "zinc" },
	{ name: "zinc-600", value: "#52525b", shade: "600", family: "zinc" },
	{ name: "zinc-700", value: "#3f3f46", shade: "700", family: "zinc" },
	{ name: "zinc-800", value: "#27272a", shade: "800", family: "zinc" },
	{ name: "zinc-900", value: "#18181b", shade: "900", family: "zinc" },
	{ name: "zinc-950", value: "#09090b", shade: "950", family: "zinc" },

	{ name: "neutral-50", value: "#fafafa", shade: "50", family: "neutral" },
	{ name: "neutral-100", value: "#f5f5f5", shade: "100", family: "neutral" },
	{ name: "neutral-200", value: "#e5e5e5", shade: "200", family: "neutral" },
	{ name: "neutral-300", value: "#d4d4d4", shade: "300", family: "neutral" },
	{ name: "neutral-400", value: "#a3a3a3", shade: "400", family: "neutral" },
	{ name: "neutral-500", value: "#737373", shade: "500", family: "neutral" },
	{ name: "neutral-600", value: "#52525b", shade: "600", family: "neutral" },
	{ name: "neutral-700", value: "#3f3f46", shade: "700", family: "neutral" },
	{ name: "neutral-800", value: "#27272a", shade: "800", family: "neutral" },
	{ name: "neutral-900", value: "#18181b", shade: "900", family: "neutral" },
	{ name: "neutral-950", value: "#09090b", shade: "950", family: "neutral" },

	{ name: "stone-50", value: "#fafaf9", shade: "50", family: "stone" },
	{ name: "stone-100", value: "#f5f5f4", shade: "100", family: "stone" },
	{ name: "stone-200", value: "#e7e5e4", shade: "200", family: "stone" },
	{ name: "stone-300", value: "#d6d3d1", shade: "300", family: "stone" },
	{ name: "stone-400", value: "#a8a29e", shade: "400", family: "stone" },
	{ name: "stone-500", value: "#78716c", shade: "500", family: "stone" },
	{ name: "stone-600", value: "#57534e", shade: "600", family: "stone" },
	{ name: "stone-700", value: "#44403c", shade: "700", family: "stone" },
	{ name: "stone-800", value: "#292524", shade: "800", family: "stone" },
	{ name: "stone-900", value: "#1c1917", shade: "900", family: "stone" },
	{ name: "stone-950", value: "#0c0a09", shade: "950", family: "stone" },

	// Red
	{ name: "red-50", value: "#fef2f2", shade: "50", family: "red" },
	{ name: "red-100", value: "#fee2e2", shade: "100", family: "red" },
	{ name: "red-200", value: "#fecaca", shade: "200", family: "red" },
	{ name: "red-300", value: "#fca5a5", shade: "300", family: "red" },
	{ name: "red-400", value: "#f87171", shade: "400", family: "red" },
	{ name: "red-500", value: "#ef4444", shade: "500", family: "red" },
	{ name: "red-600", value: "#dc2626", shade: "600", family: "red" },
	{ name: "red-700", value: "#b91c1c", shade: "700", family: "red" },
	{ name: "red-800", value: "#991b1b", shade: "800", family: "red" },
	{ name: "red-900", value: "#7f1d1d", shade: "900", family: "red" },
	{ name: "red-950", value: "#450a0a", shade: "950", family: "red" },

	// Orange
	{ name: "orange-50", value: "#fff7ed", shade: "50", family: "orange" },
	{ name: "orange-100", value: "#ffedd5", shade: "100", family: "orange" },
	{ name: "orange-200", value: "#fed7aa", shade: "200", family: "orange" },
	{ name: "orange-300", value: "#fdba74", shade: "300", family: "orange" },
	{ name: "orange-400", value: "#fb923c", shade: "400", family: "orange" },
	{ name: "orange-500", value: "#f97316", shade: "500", family: "orange" },
	{ name: "orange-600", value: "#ea580c", shade: "600", family: "orange" },
	{ name: "orange-700", value: "#c2410c", shade: "700", family: "orange" },
	{ name: "orange-800", value: "#9a3412", shade: "800", family: "orange" },
	{ name: "orange-900", value: "#7c2d12", shade: "900", family: "orange" },
	{ name: "orange-950", value: "#431407", shade: "950", family: "orange" },

	// Amber
	{ name: "amber-50", value: "#fffbeb", shade: "50", family: "amber" },
	{ name: "amber-100", value: "#fef3c7", shade: "100", family: "amber" },
	{ name: "amber-200", value: "#fde68a", shade: "200", family: "amber" },
	{ name: "amber-300", value: "#fcd34d", shade: "300", family: "amber" },
	{ name: "amber-400", value: "#fbbf24", shade: "400", family: "amber" },
	{ name: "amber-500", value: "#f59e0b", shade: "500", family: "amber" },
	{ name: "amber-600", value: "#d97706", shade: "600", family: "amber" },
	{ name: "amber-700", value: "#b45309", shade: "700", family: "amber" },
	{ name: "amber-800", value: "#92400e", shade: "800", family: "amber" },
	{ name: "amber-900", value: "#78350f", shade: "900", family: "amber" },
	{ name: "amber-950", value: "#451a03", shade: "950", family: "amber" },

	// Yellow
	{ name: "yellow-50", value: "#fefce8", shade: "50", family: "yellow" },
	{ name: "yellow-100", value: "#fef3c7", shade: "100", family: "yellow" },
	{ name: "yellow-200", value: "#fde68a", shade: "200", family: "yellow" },
	{ name: "yellow-300", value: "#fcd34d", shade: "300", family: "yellow" },
	{ name: "yellow-400", value: "#fbbf24", shade: "400", family: "yellow" },
	{ name: "yellow-500", value: "#f59e0b", shade: "500", family: "yellow" },
	{ name: "yellow-600", value: "#d97706", shade: "600", family: "yellow" },
	{ name: "yellow-700", value: "#b45309", shade: "700", family: "yellow" },
	{ name: "yellow-800", value: "#92400e", shade: "800", family: "yellow" },
	{ name: "yellow-900", value: "#78350f", shade: "900", family: "yellow" },
	{ name: "yellow-950", value: "#451a03", shade: "950", family: "yellow" },

	// Lime
	{ name: "lime-50", value: "#f7fee7", shade: "50", family: "lime" },
	{ name: "lime-100", value: "#ecfccb", shade: "100", family: "lime" },
	{ name: "lime-200", value: "#d9f99d", shade: "200", family: "lime" },
	{ name: "lime-300", value: "#bef264", shade: "300", family: "lime" },
	{ name: "lime-400", value: "#a3e635", shade: "400", family: "lime" },
	{ name: "lime-500", value: "#84cc16", shade: "500", family: "lime" },
	{ name: "lime-600", value: "#65a30d", shade: "600", family: "lime" },
	{ name: "lime-700", value: "#4d7c0f", shade: "700", family: "lime" },
	{ name: "lime-800", value: "#3f6212", shade: "800", family: "lime" },
	{ name: "lime-900", value: "#365314", shade: "900", family: "lime" },
	{ name: "lime-950", value: "#1a2e05", shade: "950", family: "lime" },

	// Green
	{ name: "green-50", value: "#f0fdf4", shade: "50", family: "green" },
	{ name: "green-100", value: "#dcfce7", shade: "100", family: "green" },
	{ name: "green-200", value: "#bbf7d0", shade: "200", family: "green" },
	{ name: "green-300", value: "#86efac", shade: "300", family: "green" },
	{ name: "green-400", value: "#4ade80", shade: "400", family: "green" },
	{ name: "green-500", value: "#22c55e", shade: "500", family: "green" },
	{ name: "green-600", value: "#16a34a", shade: "600", family: "green" },
	{ name: "green-700", value: "#15803d", shade: "700", family: "green" },
	{ name: "green-800", value: "#166534", shade: "800", family: "green" },
	{ name: "green-900", value: "#14532d", shade: "900", family: "green" },
	{ name: "green-950", value: "#052e16", shade: "950", family: "green" },

	// Emerald
	{ name: "emerald-50", value: "#ecfdf5", shade: "50", family: "emerald" },
	{ name: "emerald-100", value: "#d1fae5", shade: "100", family: "emerald" },
	{ name: "emerald-200", value: "#a7f3d0", shade: "200", family: "emerald" },
	{ name: "emerald-300", value: "#6ee7b7", shade: "300", family: "emerald" },
	{ name: "emerald-400", value: "#34d399", shade: "400", family: "emerald" },
	{ name: "emerald-500", value: "#10b981", shade: "500", family: "emerald" },
	{ name: "emerald-600", value: "#059669", shade: "600", family: "emerald" },
	{ name: "emerald-700", value: "#047857", shade: "700", family: "emerald" },
	{ name: "emerald-800", value: "#065f46", shade: "800", family: "emerald" },
	{ name: "emerald-900", value: "#064e3b", shade: "900", family: "emerald" },
	{ name: "emerald-950", value: "#022c22", shade: "950", family: "emerald" },

	// Teal
	{ name: "teal-50", value: "#f0fdfa", shade: "50", family: "teal" },
	{ name: "teal-100", value: "#ccfbf1", shade: "100", family: "teal" },
	{ name: "teal-200", value: "#99f6e4", shade: "200", family: "teal" },
	{ name: "teal-300", value: "#5eead4", shade: "300", family: "teal" },
	{ name: "teal-400", value: "#2dd4bf", shade: "400", family: "teal" },
	{ name: "teal-500", value: "#14b8a6", shade: "500", family: "teal" },
	{ name: "teal-600", value: "#0d9488", shade: "600", family: "teal" },
	{ name: "teal-700", value: "#0f766e", shade: "700", family: "teal" },
	{ name: "teal-800", value: "#115e59", shade: "800", family: "teal" },
	{ name: "teal-900", value: "#134e4a", shade: "900", family: "teal" },
	{ name: "teal-950", value: "#042f2e", shade: "950", family: "teal" },

	// Cyan
	{ name: "cyan-50", value: "#ecfeff", shade: "50", family: "cyan" },
	{ name: "cyan-100", value: "#cffafe", shade: "100", family: "cyan" },
	{ name: "cyan-200", value: "#a5f3fc", shade: "200", family: "cyan" },
	{ name: "cyan-300", value: "#67e8f9", shade: "300", family: "cyan" },
	{ name: "cyan-400", value: "#22d3eb", shade: "400", family: "cyan" },
	{ name: "cyan-500", value: "#06b6d4", shade: "500", family: "cyan" },
	{ name: "cyan-600", value: "#0891b2", shade: "600", family: "cyan" },
	{ name: "cyan-700", value: "#0e7490", shade: "700", family: "cyan" },
	{ name: "cyan-800", value: "#155e75", shade: "800", family: "cyan" },
	{ name: "cyan-900", value: "#164e63", shade: "900", family: "cyan" },
	{ name: "cyan-950", value: "#083344", shade: "950", family: "cyan" },

	// Sky
	{ name: "sky-50", value: "#f0f9ff", shade: "50", family: "sky" },
	{ name: "sky-100", value: "#e0f2fe", shade: "100", family: "sky" },
	{ name: "sky-200", value: "#bae6fd", shade: "200", family: "sky" },
	{ name: "sky-300", value: "#7dd3fc", shade: "300", family: "sky" },
	{ name: "sky-400", value: "#38bdf8", shade: "400", family: "sky" },
	{ name: "sky-500", value: "#0ea5e9", shade: "500", family: "sky" },
	{ name: "sky-600", value: "#0284c7", shade: "600", family: "sky" },
	{ name: "sky-700", value: "#0369a1", shade: "700", family: "sky" },
	{ name: "sky-800", value: "#075985", shade: "800", family: "sky" },
	{ name: "sky-900", value: "#0c4a6e", shade: "900", family: "sky" },
	{ name: "sky-950", value: "#082f49", shade: "950", family: "sky" },

	// Blue
	{ name: "blue-50", value: "#eff6ff", shade: "50", family: "blue" },
	{ name: "blue-100", value: "#dbeafe", shade: "100", family: "blue" },
	{ name: "blue-200", value: "#bfdbfe", shade: "200", family: "blue" },
	{ name: "blue-300", value: "#93c5fd", shade: "300", family: "blue" },
	{ name: "blue-400", value: "#60a5fa", shade: "400", family: "blue" },
	{ name: "blue-500", value: "#3b82f6", shade: "500", family: "blue" },
	{ name: "blue-600", value: "#2563eb", shade: "600", family: "blue" },
	{ name: "blue-700", value: "#1d4ed8", shade: "700", family: "blue" },
	{ name: "blue-800", value: "#1e40af", shade: "800", family: "blue" },
	{ name: "blue-900", value: "#1e3a8a", shade: "900", family: "blue" },
	{ name: "blue-950", value: "#172554", shade: "950", family: "blue" },

	// Indigo
	{ name: "indigo-50", value: "#eef2ff", shade: "50", family: "indigo" },
	{ name: "indigo-100", value: "#e0e7ff", shade: "100", family: "indigo" },
	{ name: "indigo-200", value: "#c7d2fe", shade: "200", family: "indigo" },
	{ name: "indigo-300", value: "#a5b4fc", shade: "300", family: "indigo" },
	{ name: "indigo-400", value: "#818cf8", shade: "400", family: "indigo" },
	{ name: "indigo-500", value: "#6366f1", shade: "500", family: "indigo" },
	{ name: "indigo-600", value: "#4f46e5", shade: "600", family: "indigo" },
	{ name: "indigo-700", value: "#4338ca", shade: "700", family: "indigo" },
	{ name: "indigo-800", value: "#3730a3", shade: "800", family: "indigo" },
	{ name: "indigo-900", value: "#312e81", shade: "900", family: "indigo" },
	{ name: "indigo-950", value: "#1e1b4b", shade: "950", family: "indigo" },

	// Violet
	{ name: "violet-50", value: "#f5f3ff", shade: "50", family: "violet" },
	{ name: "violet-100", value: "#ede9fe", shade: "100", family: "violet" },
	{ name: "violet-200", value: "#ddd6fe", shade: "200", family: "violet" },
	{ name: "violet-300", value: "#c4b5fd", shade: "300", family: "violet" },
	{ name: "violet-400", value: "#a78bfa", shade: "400", family: "violet" },
	{ name: "violet-500", value: "#8b5cf6", shade: "500", family: "violet" },
	{ name: "violet-600", value: "#7e3af2", shade: "600", family: "violet" },
	{ name: "violet-700", value: "#6b21a8", shade: "700", family: "violet" },
	{ name: "violet-800", value: "#581c87", shade: "800", family: "violet" },
	{ name: "violet-900", value: "#4a044e", shade: "900", family: "violet" },
	{ name: "violet-950", value: "#270041", shade: "950", family: "violet" },

	// Purple
	{ name: "purple-50", value: "#faf5ff", shade: "50", family: "purple" },
	{ name: "purple-100", value: "#f3e8ff", shade: "100", family: "purple" },
	{ name: "purple-200", value: "#e9d5ff", shade: "200", family: "purple" },
	{ name: "purple-300", value: "#d8b4fe", shade: "300", family: "purple" },
	{ name: "purple-400", value: "#c084fc", shade: "400", family: "purple" },
	{ name: "purple-500", value: "#a855f7", shade: "500", family: "purple" },
	{ name: "purple-600", value: "#9333ea", shade: "600", family: "purple" },
	{ name: "purple-700", value: "#7c3aed", shade: "700", family: "purple" },
	{ name: "purple-800", value: "#6b21a8", shade: "800", family: "purple" },
	{ name: "purple-900", value: "#581c87", shade: "900", family: "purple" },
	{ name: "purple-950", value: "#3b0764", shade: "950", family: "purple" },

	// Fuchsia
	{ name: "fuchsia-50", value: "#fdf4ff", shade: "50", family: "fuchsia" },
	{ name: "fuchsia-100", value: "#fae8ff", shade: "100", family: "fuchsia" },
	{ name: "fuchsia-200", value: "#f5d0fe", shade: "200", family: "fuchsia" },
	{ name: "fuchsia-300", value: "#f0abfc", shade: "300", family: "fuchsia" },
	{ name: "fuchsia-400", value: "#e879f9", shade: "400", family: "fuchsia" },
	{ name: "fuchsia-500", value: "#d946ef", shade: "500", family: "fuchsia" },
	{ name: "fuchsia-600", value: "#c026d3", shade: "600", family: "fuchsia" },
	{ name: "fuchsia-700", value: "#a21caf", shade: "700", family: "fuchsia" },
	{ name: "fuchsia-800", value: "#86198f", shade: "800", family: "fuchsia" },
	{ name: "fuchsia-900", value: "#701a75", shade: "900", family: "fuchsia" },
	{ name: "fuchsia-950", value: "#4a044e", shade: "950", family: "fuchsia" },

	// Pink
	{ name: "pink-50", value: "#fdf2f8", shade: "50", family: "pink" },
	{ name: "pink-100", value: "#fce7f3", shade: "100", family: "pink" },
	{ name: "pink-200", value: "#fbcfe8", shade: "200", family: "pink" },
	{ name: "pink-300", value: "#f9a8d4", shade: "300", family: "pink" },
	{ name: "pink-400", value: "#f472b6", shade: "400", family: "pink" },
	{ name: "pink-500", value: "#ec4899", shade: "500", family: "pink" },
	{ name: "pink-600", value: "#db2777", shade: "600", family: "pink" },
	{ name: "pink-700", value: "#be185d", shade: "700", family: "pink" },
	{ name: "pink-800", value: "#9d174d", shade: "800", family: "pink" },
	{ name: "pink-900", value: "#831843", shade: "900", family: "pink" },
	{ name: "pink-950", value: "#500724", shade: "950", family: "pink" },

	// Rose
	{ name: "rose-50", value: "#fff1f2", shade: "50", family: "rose" },
	{ name: "rose-100", value: "#ffe4e6", shade: "100", family: "rose" },
	{ name: "rose-200", value: "#fecdd3", shade: "200", family: "rose" },
	{ name: "rose-300", value: "#fda4af", shade: "300", family: "rose" },
	{ name: "rose-400", value: "#fb7185", shade: "400", family: "rose" },
	{ name: "rose-500", value: "#f43f5e", shade: "500", family: "rose" },
	{ name: "rose-600", value: "#e11d48", shade: "600", family: "rose" },
	{ name: "rose-700", value: "#be123c", shade: "700", family: "rose" },
	{ name: "rose-800", value: "#9f1239", shade: "800", family: "rose" },
	{ name: "rose-900", value: "#881337", shade: "900", family: "rose" },
	{ name: "rose-950", value: "#4c0519", shade: "950", family: "rose" },
];

const COLOR_FAMILIES = [
	"slate",
	"gray",
	"zinc",
	"neutral",
	"red",
	"orange",
	"yellow",
	"lime",
	"green",
	"emerald",
	"teal",
	"cyan",
	"sky",
	"blue",
	"indigo",
	"violet",
	"purple",
	"fuchsia",
	"pink",
	"rose",
];

export const ColorLibrary = () => {
	const { setColor } = useColorSelectorModal();
	const [searchQuery, setSearchQuery] = useState("");

	// Filter colors based on search query
	const filteredColors = useMemo(() => {
		if (!searchQuery.trim()) return TAILWIND_COLORS;

		const query = searchQuery.toLowerCase();
		return TAILWIND_COLORS.filter(
			(color) =>
				color.name.toLowerCase().includes(query) ||
				color.family.toLowerCase().includes(query) ||
				color.shade.includes(query),
		);
	}, [searchQuery]);

	// Group filtered colors by family
	const groupedColors = useMemo(() => {
		const groups: Record<string, ColorItem[]> = {};

		for (const color of filteredColors) {
			if (!groups[color.family]) {
				groups[color.family] = [];
			}
			groups[color.family].push(color);
		}

		return groups;
	}, [filteredColors]);

	const handleColorClick = (color: ColorItem) => {
		setColor(color.value);
	};

	return (
		<div className="flex flex-col h-full">
			{/* Search Input */}
			<div className="px-4 py-3 border-b bg-muted/30">
				<div className="relative">
					<Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
					<Input
						placeholder="Search colors by name, family, or shade..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-8 pl-10 bg-background"
					/>
				</div>
			</div>

			{/* Sticky Header */}
			<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
				<div className="flex items-center gap-2 text-muted-foreground">
					<div className="size-4">
						<TailwindIcon />
					</div>
					<h2 className="text-sm ">Tailwind Colors</h2>
					<div className="ml-auto text-xs text-muted-foreground">
						{filteredColors.length} colors
					</div>
				</div>
			</div>

			{/* Colors Grid */}
			<div className="flex-1 p-4 overflow-y-auto">
				<div className="space-y-4">
					{COLOR_FAMILIES.map((family) => {
						const familyColors = groupedColors[family];
						if (!familyColors || familyColors.length === 0) return null;

						return (
							<div key={family} className="space-y-2">
								<div className="flex items-center gap-2">
									<h3 className="text-xs tracking-wide capitalize">{family}</h3>
									<div className="flex-1 h-px ml-2 bg-gradient-to-r from-border to-transparent" />
									<span className="text-xs text-muted-foreground/70">
										{familyColors.length} shades
									</span>
								</div>
								<div className="grid grid-cols-11 gap-3">
									{familyColors.map((color) => (
										<Tooltip key={color.name}>
											<TooltipTrigger asChild>
												<button
													type="button"
													onClick={() => handleColorClick(color)}
													className={cn(
														"group relative aspect-square rounded-sm border border-border/40 transition-all duration-200",
														"hover:border-border hover:scale-110 hover:z-10 hover:shadow-lg",
														"focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background",
														"active:scale-95 active:duration-75",
														"shadow-sm hover:shadow-md",
													)}
													style={{ backgroundColor: color.value }}
												>
													<div className="absolute inset-0 transition-colors rounded-[10px] bg-black/0 group-hover:bg-black/5 group-active:bg-black/10" />
													<span className="sr-only">{color.name}</span>
												</button>
											</TooltipTrigger>
											<TooltipContent
												side="top"
												className="text-xs font-medium border bg-popover/95 backdrop-blur-sm border-border/50"
											>
												<div className="text-center">
													<div className="font-mono font-semibold">
														{color.name}
													</div>
													<div className="text-muted-foreground">
														{color.value}
													</div>
												</div>
											</TooltipContent>
										</Tooltip>
									))}
								</div>
							</div>
						);
					})}

					{Object.keys(groupedColors).length === 0 && (
						<div className="py-16 text-center text-muted-foreground">
							<div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50">
								<Search className="w-8 h-8 text-muted-foreground/50" />
							</div>
							<h3 className="mb-2 text-lg font-medium">No colors found</h3>
							<p className="max-w-sm mx-auto text-sm text-muted-foreground/70">
								Try searching with different terms like color family names (red,
								blue) or shade numbers (500, 600).
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
