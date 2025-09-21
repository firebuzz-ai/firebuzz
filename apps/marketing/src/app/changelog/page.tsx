import { allChangelogs } from "content-collections";
import type { Metadata } from "next";
import { ChangelogContent } from "../../components/changelog/changelog-content";

export const metadata: Metadata = {
	title: "Changelog - Firebuzz",
	description:
		"Latest updates, features, and improvements to the Firebuzz platform.",
};

export default function ChangelogPage() {
	// Sort changelogs by date (newest first)
	const changelogs = allChangelogs.sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	return (
		<div className="min-h-screen">
			<div className="px-8 py-12 mx-auto max-w-6xl">
				{/* Header */}
				<div className="mb-16">
					<h1 className="mb-4 text-2xl font-bold text-foreground">Changelog</h1>
					<p className="text-lg text-muted-foreground max-w-2xl">
						Latest updates, features, and improvements to the Firebuzz platform.
					</p>
				</div>

				{/* Changelog Entries */}
				<ChangelogContent changelogs={changelogs} />
			</div>
		</div>
	);
}
