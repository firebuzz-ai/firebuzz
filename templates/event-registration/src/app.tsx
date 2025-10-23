import { AgendaSection } from "@/components/agenda-section";
import { FAQSection } from "@/components/faq-section";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HighlightsSection } from "@/components/highlights-section";
import { Navigation } from "@/components/navigation";
import { RegistrationSection } from "@/components/registration-section";
import { SpeakersSection } from "@/components/speakers-section";
import { SponsorsSection } from "@/components/sponsors-section";
import { TestimonialsSection } from "@/components/testimonials-section";

export function App() {
	return (
		<div className="min-h-screen">
			<Navigation />
			<Hero />
			<HighlightsSection />
			<SpeakersSection />
			<AgendaSection />
			<TestimonialsSection />
			<RegistrationSection />
			<SponsorsSection />
			<FAQSection />
			<Footer />
		</div>
	);
}
