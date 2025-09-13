export type SupportedLanguage =
	| "en"
	| "en-US"
	| "es"
	| "es-ES"
	| "fr"
	| "fr-FR"
	| "de"
	| "de-DE"
	| "it"
	| "it-IT"
	| "pt"
	| "pt-BR"
	| "nl"
	| "nl-NL"
	| "pl"
	| "pl-PL"
	| "da"
	| "da-DK"
	| "sv"
	| "sv-SE"
	| "no"
	| "nb-NO";

// Import ConsentTexts for translation key validation
import type { ConsentTexts } from "../types";

export type TranslationKey = keyof ConsentTexts;
