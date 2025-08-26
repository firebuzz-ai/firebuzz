import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Navigation } from "@/components/navigation";
import { getAllTrackedEvents } from "@firebuzz/analytics";

export function App() {
  const events = getAllTrackedEvents();
  console.log(events);
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <Hero />
      <Footer />
    </div>
  );
}
