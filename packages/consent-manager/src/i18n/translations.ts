import type { ConsentTexts } from "../types";
import type { SupportedLanguage } from "./types";

const en: ConsentTexts = {
	banner: {
		title: "We use cookies",
		description: "We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking 'Accept All', you consent to our use of cookies.",
		acceptAll: "Accept All",
		rejectAll: "Reject All",
		manageCookies: "Manage Cookies",
	},
	modal: {
		title: "Cookie Preferences",
		description: "Choose which cookies you want to accept. You can change these settings at any time.",
		save: "Save Preferences",
		acceptAll: "Accept All",
		rejectAll: "Reject All",
		close: "Close",
	},
	categories: {
		necessary: {
			title: "Strictly Necessary",
			description: "These cookies are essential for the website to function properly. They cannot be disabled.",
		},
		analytics: {
			title: "Analytics",
			description: "These cookies help us understand how visitors interact with our website by collecting and reporting information.",
		},
		marketing: {
			title: "Marketing",
			description: "These cookies are used to deliver advertisements more relevant to you and your interests.",
		},
		functional: {
			title: "Functional",
			description: "These cookies enhance functionality and personalization, such as videos and live chats.",
		},
	},
	footer: {
		privacyPolicy: "Privacy Policy",
		cookiePolicy: "Cookie Policy",
	},
};

const es: ConsentTexts = {
	banner: {
		title: "Utilizamos cookies",
		description: "Utilizamos cookies para mejorar tu experiencia de navegación, ofrecer anuncios o contenido personalizado y analizar nuestro tráfico. Al hacer clic en 'Aceptar todo', consientes el uso de nuestras cookies.",
		acceptAll: "Aceptar todo",
		rejectAll: "Rechazar todo",
		manageCookies: "Gestionar cookies",
	},
	modal: {
		title: "Preferencias de cookies",
		description: "Elige qué cookies quieres aceptar. Puedes cambiar esta configuración en cualquier momento.",
		save: "Guardar preferencias",
		acceptAll: "Aceptar todo",
		rejectAll: "Rechazar todo",
		close: "Cerrar",
	},
	categories: {
		necessary: {
			title: "Estrictamente necesarias",
			description: "Estas cookies son esenciales para que el sitio web funcione correctamente. No se pueden desactivar.",
		},
		analytics: {
			title: "Analíticas",
			description: "Estas cookies nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web recopilando y reportando información.",
		},
		marketing: {
			title: "Marketing",
			description: "Estas cookies se utilizan para ofrecer anuncios más relevantes para ti y tus intereses.",
		},
		functional: {
			title: "Funcionales",
			description: "Estas cookies mejoran la funcionalidad y personalización, como videos y chats en vivo.",
		},
	},
	footer: {
		privacyPolicy: "Política de privacidad",
		cookiePolicy: "Política de cookies",
	},
};

const fr: ConsentTexts = {
	banner: {
		title: "Nous utilisons des cookies",
		description: "Nous utilisons des cookies pour améliorer votre expérience de navigation, fournir des publicités ou du contenu personnalisé et analyser notre trafic. En cliquant sur 'Tout accepter', vous consentez à l'utilisation de nos cookies.",
		acceptAll: "Tout accepter",
		rejectAll: "Tout refuser",
		manageCookies: "Gérer les cookies",
	},
	modal: {
		title: "Préférences des cookies",
		description: "Choisissez quels cookies vous souhaitez accepter. Vous pouvez modifier ces paramètres à tout moment.",
		save: "Sauvegarder les préférences",
		acceptAll: "Tout accepter",
		rejectAll: "Tout refuser",
		close: "Fermer",
	},
	categories: {
		necessary: {
			title: "Strictement nécessaires",
			description: "Ces cookies sont essentiels au bon fonctionnement du site web. Ils ne peuvent pas être désactivés.",
		},
		analytics: {
			title: "Analytiques",
			description: "Ces cookies nous aident à comprendre comment les visiteurs interagissent avec notre site web en collectant et rapportant des informations.",
		},
		marketing: {
			title: "Marketing",
			description: "Ces cookies sont utilisés pour fournir des publicités plus pertinentes pour vous et vos intérêts.",
		},
		functional: {
			title: "Fonctionnels",
			description: "Ces cookies améliorent la fonctionnalité et la personnalisation, comme les vidéos et les chats en direct.",
		},
	},
	footer: {
		privacyPolicy: "Politique de confidentialité",
		cookiePolicy: "Politique des cookies",
	},
};

const de: ConsentTexts = {
	banner: {
		title: "Wir verwenden Cookies",
		description: "Wir verwenden Cookies, um Ihr Browsing-Erlebnis zu verbessern, personalisierte Werbung oder Inhalte zu liefern und unseren Traffic zu analysieren. Durch Klicken auf 'Alle akzeptieren' stimmen Sie der Verwendung unserer Cookies zu.",
		acceptAll: "Alle akzeptieren",
		rejectAll: "Alle ablehnen",
		manageCookies: "Cookies verwalten",
	},
	modal: {
		title: "Cookie-Einstellungen",
		description: "Wählen Sie, welche Cookies Sie akzeptieren möchten. Sie können diese Einstellungen jederzeit ändern.",
		save: "Einstellungen speichern",
		acceptAll: "Alle akzeptieren",
		rejectAll: "Alle ablehnen",
		close: "Schließen",
	},
	categories: {
		necessary: {
			title: "Unbedingt erforderlich",
			description: "Diese Cookies sind für das ordnungsgemäße Funktionieren der Website unerlässlich. Sie können nicht deaktiviert werden.",
		},
		analytics: {
			title: "Analytisch",
			description: "Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website interagieren, indem sie Informationen sammeln und melden.",
		},
		marketing: {
			title: "Marketing",
			description: "Diese Cookies werden verwendet, um Werbung zu liefern, die für Sie und Ihre Interessen relevanter ist.",
		},
		functional: {
			title: "Funktional",
			description: "Diese Cookies verbessern die Funktionalität und Personalisierung, wie Videos und Live-Chats.",
		},
	},
	footer: {
		privacyPolicy: "Datenschutzrichtlinie",
		cookiePolicy: "Cookie-Richtlinie",
	},
};

export const translations: Record<SupportedLanguage, ConsentTexts> = {
	"en": en,
	"en-US": en,
	"es": es,
	"es-ES": es,
	"fr": fr,
	"fr-FR": fr,
	"de": de,
	"de-DE": de,
	"it": en, // TODO: Add Italian translation
	"it-IT": en, // TODO: Add Italian translation
	"pt": en, // TODO: Add Portuguese translation
	"pt-BR": en, // TODO: Add Portuguese translation
	"nl": en, // TODO: Add Dutch translation
	"nl-NL": en, // TODO: Add Dutch translation
	"pl": en, // TODO: Add Polish translation
	"pl-PL": en, // TODO: Add Polish translation
	"da": en, // TODO: Add Danish translation
	"da-DK": en, // TODO: Add Danish translation
	"sv": en, // TODO: Add Swedish translation
	"sv-SE": en, // TODO: Add Swedish translation
	"no": en, // TODO: Add Norwegian translation
	"nb-NO": en, // TODO: Add Norwegian translation
};

export const getTranslation = (
	language: string,
	customTranslations?: Partial<ConsentTexts>
): ConsentTexts => {
	// Try exact match first
	let translation = translations[language as SupportedLanguage];
	
	// If not found, try language without country code
	if (!translation) {
		const langCode = language.split("-")[0];
		translation = translations[langCode as SupportedLanguage];
	}
	
	// Fallback to English
	if (!translation) {
		translation = translations.en;
	}
	
	// Merge with custom translations if provided
	if (customTranslations) {
		return {
			banner: { ...translation.banner, ...customTranslations.banner },
			modal: { ...translation.modal, ...customTranslations.modal },
			categories: {
				necessary: { ...translation.categories.necessary, ...customTranslations.categories?.necessary },
				analytics: { ...translation.categories.analytics, ...customTranslations.categories?.analytics },
				marketing: { ...translation.categories.marketing, ...customTranslations.categories?.marketing },
				functional: { ...translation.categories.functional, ...customTranslations.categories?.functional },
			},
			footer: { ...translation.footer, ...customTranslations.footer },
		};
	}
	
	return translation;
};

export const getSupportedLanguages = (): SupportedLanguage[] => {
	return Object.keys(translations) as SupportedLanguage[];
};

export const isLanguageSupported = (language: string): boolean => {
	const langCode = language.split("-")[0];
	return language in translations || (langCode !== undefined && langCode in translations);
};