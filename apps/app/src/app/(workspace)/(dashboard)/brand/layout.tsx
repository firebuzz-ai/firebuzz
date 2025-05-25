import { BrandTopbar } from "@/components/navigation/brand/topbar";

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 max-h-screen overflow-hidden">
      <BrandTopbar />
      <div className="flex flex-1 max-w-full max-h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
