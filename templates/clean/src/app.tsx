import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Navigation } from "@/components/navigation";

export function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <Hero />
      <Footer />
    </div>
  );
}
