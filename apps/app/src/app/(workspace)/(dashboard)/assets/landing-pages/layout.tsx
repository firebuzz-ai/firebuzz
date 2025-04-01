import { LandingTopbar } from "@/components/navigation/landing-pages/topbar";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1">
      <LandingTopbar />
      <div className="flex flex-1">{children}</div>
    </div>
  );
}
