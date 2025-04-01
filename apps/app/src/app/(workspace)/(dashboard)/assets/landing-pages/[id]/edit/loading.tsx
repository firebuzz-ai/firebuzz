import { Spinner } from "@firebuzz/ui/components/ui/spinner";

export default function LandingPageEditLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner size="sm" />
    </div>
  );
}
