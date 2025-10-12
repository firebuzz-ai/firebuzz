"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface SectionMeta {
	id: string;
	label: string;
}

interface Props {
	sections: SectionMeta[];
	offset?: number;
}

// Observes sections and exposes the currently active section id
function useActiveSection(sectionIds: string[], rootMargin: string) {
	const [activeId, setActiveId] = useState<string | null>(null);

	useEffect(() => {
		const elements = sectionIds
			.map((id) => document.getElementById(id))
			.filter((el): el is HTMLElement => Boolean(el));

		if (!elements.length) return;

		const observer = new IntersectionObserver(
			(entries) => {
				// Find the most visible entry in viewport
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

				if (visible?.target?.id) setActiveId(visible.target.id);
			},
			{ root: null, rootMargin, threshold: [0, 0.25, 0.5, 0.75, 1] },
		);

		for (const el of elements) observer.observe(el);
		return () => observer.disconnect();
	}, [sectionIds, rootMargin]);

	return activeId;
}

export const ScrollTracking = ({ sections, offset = 120 }: Props) => {
	const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);
	const _activeId = useActiveSection(sectionIds, `-${offset}px 0px -60% 0px`);
	const railRef = useRef<HTMLDivElement>(null);

	return (
		<div className="hidden absolute top-0 left-6 w-6 h-full pointer-events-none md:block">
			<div className="relative mx-auto w-px h-full bg-border" ref={railRef} />
		</div>
	);
};
