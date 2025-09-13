import type { ConsentTexts } from "../types";
import type { SupportedLanguage } from "./types";

const en: ConsentTexts = {
	banner: {
		title: "We value your privacy",
		description:
			"This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.",
		acceptAll: "Accept All",
		rejectAll: "Reject All",
		manageCookies: "Customize",
	},
	modal: {
		title: "Privacy Settings",
		description:
			"Choose which cookies you want to accept. You can change these settings at any time.",
		save: "Save Preferences",
		acceptAll: "Accept All",
		rejectAll: "Reject All",
		close: "Close",
	},
	categories: {
		necessary: {
			title: "Strictly Necessary",
			description:
				"These cookies are essential for the website to function properly. They cannot be disabled.",
		},
		analytics: {
			title: "Analytics",
			description:
				"These cookies help us understand how visitors interact with our website by collecting and reporting information.",
		},
		marketing: {
			title: "Marketing",
			description:
				"These cookies are used to deliver advertisements more relevant to you and your interests.",
		},
		functional: {
			title: "Functional",
			description:
				"These cookies enhance functionality and personalization, such as videos and live chats.",
		},
	},
	footer: {
		privacyPolicy: "Privacy Policy",
		cookiePolicy: "Cookie Policy",
	},
};

const es: ConsentTexts = {
	banner: {
		title: "Valoramos tu privacidad",
		description:
			"Este sitio utiliza cookies para mejorar tu experiencia de navegación, analizar el tráfico del sitio y mostrar contenido personalizado.",
		acceptAll: "Aceptar todo",
		rejectAll: "Rechazar todo",
		manageCookies: "Personalizar",
	},
	modal: {
		title: "Configuración de privacidad",
		description:
			"Elige qué cookies quieres aceptar. Puedes cambiar esta configuración en cualquier momento.",
		save: "Guardar preferencias",
		acceptAll: "Aceptar todo",
		rejectAll: "Rechazar todo",
		close: "Cerrar",
	},
	categories: {
		necessary: {
			title: "Estrictamente necesarias",
			description:
				"Estas cookies son esenciales para que el sitio web funcione correctamente. No se pueden desactivar.",
		},
		analytics: {
			title: "Analíticas",
			description:
				"Estas cookies nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web recopilando y reportando información.",
		},
		marketing: {
			title: "Marketing",
			description:
				"Estas cookies se utilizan para ofrecer anuncios más relevantes para ti y tus intereses.",
		},
		functional: {
			title: "Funcionales",
			description:
				"Estas cookies mejoran la funcionalidad y personalización, como videos y chats en vivo.",
		},
	},
	footer: {
		privacyPolicy: "Política de privacidad",
		cookiePolicy: "Política de cookies",
	},
};

const fr: ConsentTexts = {
	banner: {
		title: "Nous respectons votre vie privée",
		description:
			"Ce site utilise des cookies pour améliorer votre expérience de navigation, analyser le trafic du site et afficher du contenu personnalisé.",
		acceptAll: "Tout accepter",
		rejectAll: "Tout refuser",
		manageCookies: "Personnaliser",
	},
	modal: {
		title: "Paramètres de confidentialité",
		description:
			"Choisissez quels cookies vous souhaitez accepter. Vous pouvez modifier ces paramètres à tout moment.",
		save: "Sauvegarder les préférences",
		acceptAll: "Tout accepter",
		rejectAll: "Tout refuser",
		close: "Fermer",
	},
	categories: {
		necessary: {
			title: "Strictement nécessaires",
			description:
				"Ces cookies sont essentiels au bon fonctionnement du site web. Ils ne peuvent pas être désactivés.",
		},
		analytics: {
			title: "Analytiques",
			description:
				"Ces cookies nous aident à comprendre comment les visiteurs interagissent avec notre site web en collectant et rapportant des informations.",
		},
		marketing: {
			title: "Marketing",
			description:
				"Ces cookies sont utilisés pour fournir des publicités plus pertinentes pour vous et vos intérêts.",
		},
		functional: {
			title: "Fonctionnels",
			description:
				"Ces cookies améliorent la fonctionnalité et la personnalisation, comme les vidéos et les chats en direct.",
		},
	},
	footer: {
		privacyPolicy: "Politique de confidentialité",
		cookiePolicy: "Politique des cookies",
	},
};

const de: ConsentTexts = {
	banner: {
		title: "Wir schätzen Ihre Privatsphäre",
		description:
			"Diese Website verwendet Cookies, um Ihr Surferlebnis zu verbessern, den Website-Traffic zu analysieren und personalisierte Inhalte anzuzeigen.",
		acceptAll: "Alle akzeptieren",
		rejectAll: "Alle ablehnen",
		manageCookies: "Anpassen",
	},
	modal: {
		title: "Datenschutzeinstellungen",
		description:
			"Wählen Sie, welche Cookies Sie akzeptieren möchten. Sie können diese Einstellungen jederzeit ändern.",
		save: "Einstellungen speichern",
		acceptAll: "Alle akzeptieren",
		rejectAll: "Alle ablehnen",
		close: "Schließen",
	},
	categories: {
		necessary: {
			title: "Unbedingt erforderlich",
			description:
				"Diese Cookies sind für das ordnungsgemäße Funktionieren der Website unerlässlich. Sie können nicht deaktiviert werden.",
		},
		analytics: {
			title: "Analytisch",
			description:
				"Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website interagieren, indem sie Informationen sammeln und melden.",
		},
		marketing: {
			title: "Marketing",
			description:
				"Diese Cookies werden verwendet, um Werbung zu liefern, die für Sie und Ihre Interessen relevanter ist.",
		},
		functional: {
			title: "Funktional",
			description:
				"Diese Cookies verbessern die Funktionalität und Personalisierung, wie Videos und Live-Chats.",
		},
	},
	footer: {
		privacyPolicy: "Datenschutzrichtlinie",
		cookiePolicy: "Cookie-Richtlinie",
	},
};

const it: ConsentTexts = {
	banner: {
		title: "Rispettiamo la tua privacy",
		description:
			"Questo sito utilizza cookie per migliorare la tua esperienza di navigazione, analizzare il traffico del sito e mostrare contenuti personalizzati.",
		acceptAll: "Accetta tutto",
		rejectAll: "Rifiuta tutto",
		manageCookies: "Personalizza",
	},
	modal: {
		title: "Impostazioni privacy",
		description:
			"Scegli quali cookie vuoi accettare. Puoi modificare queste impostazioni in qualsiasi momento.",
		save: "Salva preferenze",
		acceptAll: "Accetta tutto",
		rejectAll: "Rifiuta tutto",
		close: "Chiudi",
	},
	categories: {
		necessary: {
			title: "Strettamente necessari",
			description:
				"Questi cookie sono essenziali per il corretto funzionamento del sito web. Non possono essere disattivati.",
		},
		analytics: {
			title: "Analitici",
			description:
				"Questi cookie ci aiutano a capire come i visitatori interagiscono con il nostro sito web raccogliendo e riportando informazioni.",
		},
		marketing: {
			title: "Marketing",
			description:
				"Questi cookie vengono utilizzati per fornire pubblicità più rilevanti per te e i tuoi interessi.",
		},
		functional: {
			title: "Funzionali",
			description:
				"Questi cookie migliorano la funzionalità e la personalizzazione, come video e chat dal vivo.",
		},
	},
	footer: {
		privacyPolicy: "Informativa sulla privacy",
		cookiePolicy: "Politica sui cookie",
	},
};

const pt: ConsentTexts = {
	banner: {
		title: "Valorizamos sua privacidade",
		description:
			"Este site usa cookies para melhorar sua experiência de navegação, analisar o tráfego do site e exibir conteúdo personalizado.",
		acceptAll: "Aceitar tudo",
		rejectAll: "Rejeitar tudo",
		manageCookies: "Personalizar",
	},
	modal: {
		title: "Configurações de privacidade",
		description:
			"Escolha quais cookies você deseja aceitar. Você pode alterar essas configurações a qualquer momento.",
		save: "Salvar preferências",
		acceptAll: "Aceitar tudo",
		rejectAll: "Rejeitar tudo",
		close: "Fechar",
	},
	categories: {
		necessary: {
			title: "Estritamente necessários",
			description:
				"Estes cookies são essenciais para o funcionamento adequado do site. Eles não podem ser desativados.",
		},
		analytics: {
			title: "Analíticos",
			description:
				"Estes cookies nos ajudam a entender como os visitantes interagem com nosso site coletando e relatando informações.",
		},
		marketing: {
			title: "Marketing",
			description:
				"Estes cookies são usados para fornecer anúncios mais relevantes para você e seus interesses.",
		},
		functional: {
			title: "Funcionais",
			description:
				"Estes cookies aprimoram a funcionalidade e personalização, como vídeos e chats ao vivo.",
		},
	},
	footer: {
		privacyPolicy: "Política de privacidade",
		cookiePolicy: "Política de cookies",
	},
};

const nl: ConsentTexts = {
	banner: {
		title: "We waarderen uw privacy",
		description:
			"Deze site gebruikt cookies om uw browse-ervaring te verbeteren, websiteverkeer te analyseren en gepersonaliseerde content te tonen.",
		acceptAll: "Alles accepteren",
		rejectAll: "Alles weigeren",
		manageCookies: "Aanpassen",
	},
	modal: {
		title: "Privacy-instellingen",
		description:
			"Kies welke cookies u wilt accepteren. U kunt deze instellingen op elk moment wijzigen.",
		save: "Voorkeuren opslaan",
		acceptAll: "Alles accepteren",
		rejectAll: "Alles weigeren",
		close: "Sluiten",
	},
	categories: {
		necessary: {
			title: "Strikt noodzakelijk",
			description:
				"Deze cookies zijn essentieel voor het goed functioneren van de website. Ze kunnen niet worden uitgeschakeld.",
		},
		analytics: {
			title: "Analytisch",
			description:
				"Deze cookies helpen ons begrijpen hoe bezoekers omgaan met onze website door informatie te verzamelen en te rapporteren.",
		},
		marketing: {
			title: "Marketing",
			description:
				"Deze cookies worden gebruikt om advertenties te leveren die relevanter zijn voor u en uw interesses.",
		},
		functional: {
			title: "Functioneel",
			description:
				"Deze cookies verbeteren functionaliteit en personalisatie, zoals video's en live chats.",
		},
	},
	footer: {
		privacyPolicy: "Privacybeleid",
		cookiePolicy: "Cookiebeleid",
	},
};

const pl: ConsentTexts = {
	banner: {
		title: "Cenimy Twoją prywatność",
		description:
			"Ta strona używa ciasteczek w celu poprawy doświadczenia przeglądania, analizy ruchu na stronie i wyświetlania spersonalizowanych treści.",
		acceptAll: "Zaakceptuj wszystkie",
		rejectAll: "Odrzuć wszystkie",
		manageCookies: "Dostosuj",
	},
	modal: {
		title: "Ustawienia prywatności",
		description:
			"Wybierz, które ciasteczka chcesz zaakceptować. Możesz zmienić te ustawienia w dowolnym momencie.",
		save: "Zapisz preferencje",
		acceptAll: "Zaakceptuj wszystkie",
		rejectAll: "Odrzuć wszystkie",
		close: "Zamknij",
	},
	categories: {
		necessary: {
			title: "Ściśle konieczne",
			description:
				"Te ciasteczka są niezbędne do prawidłowego funkcjonowania strony internetowej. Nie mogą być wyłączone.",
		},
		analytics: {
			title: "Analityczne",
			description:
				"Te ciasteczka pomagają nam zrozumieć, jak odwiedzający korzystają z naszej strony, zbierając i raportując informacje.",
		},
		marketing: {
			title: "Marketing",
			description:
				"Te ciasteczka są używane do dostarczania reklam bardziej odpowiednich dla Ciebie i Twoich zainteresowań.",
		},
		functional: {
			title: "Funkcjonalne",
			description:
				"Te ciasteczka poprawiają funkcjonalność i personalizację, takie jak filmy i czaty na żywo.",
		},
	},
	footer: {
		privacyPolicy: "Polityka prywatności",
		cookiePolicy: "Polityka ciasteczek",
	},
};

const da: ConsentTexts = {
	banner: {
		title: "Vi værdsætter dit privatliv",
		description:
			"Denne side bruger cookies for at forbedre din browsing-oplevelse, analysere hjemmesidestrafik og vise personligt indhold.",
		acceptAll: "Accepter alle",
		rejectAll: "Afvis alle",
		manageCookies: "Tilpas",
	},
	modal: {
		title: "Privatlivsindstillinger",
		description:
			"Vælg hvilke cookies du vil acceptere. Du kan ændre disse indstillinger når som helst.",
		save: "Gem præferencer",
		acceptAll: "Accepter alle",
		rejectAll: "Afvis alle",
		close: "Luk",
	},
	categories: {
		necessary: {
			title: "Strengt nødvendige",
			description:
				"Disse cookies er essentielle for hjemmesidens korrekte funktion. De kan ikke deaktiveres.",
		},
		analytics: {
			title: "Analytiske",
			description:
				"Disse cookies hjælper os med at forstå, hvordan besøgende interagerer med vores hjemmeside ved at indsamle og rapportere information.",
		},
		marketing: {
			title: "Marketing",
			description:
				"Disse cookies bruges til at levere annoncer, der er mere relevante for dig og dine interesser.",
		},
		functional: {
			title: "Funktionelle",
			description:
				"Disse cookies forbedrer funktionalitet og personalisering, såsom videoer og live chats.",
		},
	},
	footer: {
		privacyPolicy: "Privatlivspolitik",
		cookiePolicy: "Cookie-politik",
	},
};

const sv: ConsentTexts = {
	banner: {
		title: "Vi värdesätter din integritet",
		description:
			"Denna webbplats använder cookies för att förbättra din surfupplevelse, analysera webbplatstrafik och visa personligt innehåll.",
		acceptAll: "Acceptera alla",
		rejectAll: "Avvisa alla",
		manageCookies: "Anpassa",
	},
	modal: {
		title: "Integritetsinställningar",
		description:
			"Välj vilka cookies du vill acceptera. Du kan ändra dessa inställningar när som helst.",
		save: "Spara preferenser",
		acceptAll: "Acceptera alla",
		rejectAll: "Avvisa alla",
		close: "Stäng",
	},
	categories: {
		necessary: {
			title: "Strikt nödvändiga",
			description:
				"Dessa cookies är nödvändiga för att webbplatsen ska fungera korrekt. De kan inte inaktiveras.",
		},
		analytics: {
			title: "Analytiska",
			description:
				"Dessa cookies hjälper oss att förstå hur besökare interagerar med vår webbplats genom att samla in och rapportera information.",
		},
		marketing: {
			title: "Marknadsföring",
			description:
				"Dessa cookies används för att leverera annonser som är mer relevanta för dig och dina intressen.",
		},
		functional: {
			title: "Funktionella",
			description:
				"Dessa cookies förbättrar funktionalitet och personalisering, såsom videor och livechatt.",
		},
	},
	footer: {
		privacyPolicy: "Integritetspolicy",
		cookiePolicy: "Cookie-policy",
	},
};

const no: ConsentTexts = {
	banner: {
		title: "Vi verdsetter ditt personvern",
		description:
			"Denne siden bruker informasjonskapsler for å forbedre din nettleseropplevelse, analysere nettsidetrafikk og vise personlig innhold.",
		acceptAll: "Godta alle",
		rejectAll: "Avvis alle",
		manageCookies: "Tilpass",
	},
	modal: {
		title: "Personverninnstillinger",
		description:
			"Velg hvilke informasjonskapsler du vil godta. Du kan endre disse innstillingene når som helst.",
		save: "Lagre preferanser",
		acceptAll: "Godta alle",
		rejectAll: "Avvis alle",
		close: "Lukk",
	},
	categories: {
		necessary: {
			title: "Strengt nødvendige",
			description:
				"Disse informasjonskapslene er essensielle for at nettstedet skal fungere ordentlig. De kan ikke deaktiveres.",
		},
		analytics: {
			title: "Analytiske",
			description:
				"Disse informasjonskapslene hjelper oss å forstå hvordan besøkende samhandler med nettstedet vårt ved å samle inn og rapportere informasjon.",
		},
		marketing: {
			title: "Markedsføring",
			description:
				"Disse informasjonskapslene brukes til å levere annonser som er mer relevante for deg og dine interesser.",
		},
		functional: {
			title: "Funksjonelle",
			description:
				"Disse informasjonskapslene forbedrer funksjonalitet og personalisering, som videoer og direktechatt.",
		},
	},
	footer: {
		privacyPolicy: "Personvernerklæring",
		cookiePolicy: "Informasjonskapselpolicy",
	},
};

export const translations: Record<SupportedLanguage, ConsentTexts> = {
	en: en,
	"en-US": en,
	es: es,
	"es-ES": es,
	fr: fr,
	"fr-FR": fr,
	de: de,
	"de-DE": de,
	it: it,
	"it-IT": it,
	pt: pt,
	"pt-BR": pt,
	nl: nl,
	"nl-NL": nl,
	pl: pl,
	"pl-PL": pl,
	da: da,
	"da-DK": da,
	sv: sv,
	"sv-SE": sv,
	no: no,
	"nb-NO": no,
};

export const resolveTranslation = (
	language: string,
	customTranslations?: Record<string, ConsentTexts>,
	fallbackLanguage?: string,
): ConsentTexts => {
	// 1. Try exact language match in custom translations
	if (customTranslations?.[language]) {
		return customTranslations[language];
	}

	// 2. Try exact language match in built-in translations
	if (translations[language as SupportedLanguage]) {
		return translations[language as SupportedLanguage];
	}

	// 3. Try language code (e.g., "en" from "en-US")
	const langCode = language.split("-")[0];
	if (langCode && customTranslations?.[langCode]) {
		return customTranslations[langCode];
	}

	if (langCode && translations[langCode as SupportedLanguage]) {
		return translations[langCode as SupportedLanguage];
	}

	// 4. Try fallback language
	if (fallbackLanguage && customTranslations?.[fallbackLanguage]) {
		return customTranslations[fallbackLanguage];
	}

	if (fallbackLanguage && translations[fallbackLanguage as SupportedLanguage]) {
		return translations[fallbackLanguage as SupportedLanguage];
	}

	// 5. Final fallback to English
	return translations.en;
};

export const getBuiltInLanguages = (): SupportedLanguage[] => {
	return Object.keys(translations) as SupportedLanguage[];
};

export const getAllLanguages = (
	customTranslations?: Record<string, ConsentTexts>,
): string[] => {
	const builtIn = getBuiltInLanguages();
	const custom = customTranslations ? Object.keys(customTranslations) : [];
	return [...new Set([...builtIn, ...custom])];
};

export const hasLanguage = (
	language: string,
	customTranslations?: Record<string, ConsentTexts>,
): boolean => {
	const langCode = language.split("-")[0];
	return (
		language in translations ||
		(langCode !== undefined && langCode in translations) ||
		Boolean(customTranslations?.[language]) ||
		Boolean(customTranslations && langCode && customTranslations[langCode])
	);
};

export const createTranslation = (template: ConsentTexts): ConsentTexts => {
	return { ...template };
};
