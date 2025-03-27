import { Spinner } from "@firebuzz/ui/components/ui/spinner";

export default function Loading() {
	return (
		<div className="flex flex-1 items-center justify-center">
			<Spinner size="sm" />
		</div>
	);
}
