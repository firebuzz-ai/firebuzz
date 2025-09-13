import { CookiePreferencesButton } from "@/components/cookie-banner/cookie-preferences-button";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Navigation } from "@/components/navigation";

export function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <Hero />
      <Footer />

      {/* Optional floating cookie preferences button */}
      <CookiePreferencesButton
        variant="floating"
        position="bottom-right"
        privacyPolicyUrl="/privacy-policy"
      />
    </div>
  );
}
