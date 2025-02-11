import { Wordmark } from "@firebuzz/ui/components/brand/wordmark";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import { ChevronRight } from "@firebuzz/ui/icons/lucide";

export default function Home() {
	return (
		<div className="flex min-h-screen flex-col w-full items-center justify-center bg-background p-4">
			<div className="w-full max-w-xl space-y-8 text-center">
				<Wordmark className="mx-auto h-8" />

				<p className="text-xl text-muted-foreground font-mono">
					AI powered automation tool for PPC marketers. Generate assets,
					iterate, optimize and convert. All fast.
				</p>

				<a className={buttonVariants()} href="https://x.com/getfirebuzz">
					Follow the journey
					<span className="text-xs text-muted-foreground">- on X</span>
					<ChevronRight className="size-3 text-muted-foreground" />
				</a>

				<p className="text-sm text-muted-foreground">
					Sharing the journey of building a startup from scratch.
				</p>
			</div>
		</div>
	);
}
