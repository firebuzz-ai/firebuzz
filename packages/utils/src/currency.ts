/**
 * Currency utility functions for handling currency symbols and formatting
 */

// Supported currency codes and their symbols
export const CURRENCY_SYMBOLS = {
	// Major currencies
	USD: "$",
	EUR: "€",
	GBP: "£",
	JPY: "¥",
	CHF: "CHF",

	// North American currencies
	CAD: "C$",
	MXN: "$",

	// European currencies
	SEK: "kr",
	NOK: "kr",
	DKK: "kr",
	PLN: "zł",
	CZK: "Kč",
	HUF: "Ft",
	TRY: "₺", // Turkish Lira
	RON: "lei",
	BGN: "лв",
	HRK: "kn",
	ISK: "kr",
	ALL: "L",
	MKD: "ден",
	RSD: "дин",
	BAM: "KM",
	MDL: "L",
	UAH: "₴",
	BYN: "Br",
	GEL: "₾",
	AMD: "֏",
	AZN: "₼",

	// Asian currencies
	CNY: "¥",
	KRW: "₩",
	INR: "₹",
	SGD: "S$",
	HKD: "HK$",
	THB: "฿",
	MYR: "RM",
	PHP: "₱",
	IDR: "Rp",
	VND: "₫",
	TWD: "NT$",
	BDT: "৳",
	PKR: "₨",
	LKR: "₨",
	NPR: "₨",
	BTN: "Nu",
	MMK: "K",
	KHR: "៛",
	LAK: "₭",
	MNT: "₮",
	KZT: "₸",
	UZS: "so'm",
	KGS: "с",
	TJS: "ЅМ",
	TMT: "m",
	AFN: "؋",
	IRR: "﷼",
	IQD: "ع.د",
	JOD: "د.ا",
	SYP: "£",
	LBP: "ل.ل",
	YER: "﷼",

	// Middle Eastern currencies
	AED: "د.إ",
	SAR: "﷼",
	QAR: "﷼",
	KWD: "د.ك",
	BHD: "د.ب",
	OMR: "﷼",
	ILS: "₪",

	// African currencies
	ZAR: "R",
	NGN: "₦",
	EGP: "£",
	MAD: "د.م",
	TND: "د.ت",
	DZD: "د.ج",
	LYD: "ل.د",
	SDG: "ج.س",
	ETB: "Br",
	KES: "KSh",
	UGX: "USh",
	TZS: "TSh",
	RWF: "₣",
	BIF: "₣",
	DJF: "₣",
	SOS: "S",
	MZN: "MT",
	AOA: "Kz",
	ZMW: "ZK",
	BWP: "P",
	SZL: "E",
	LSL: "L",
	NAD: "N$",
	MUR: "₨",
	SCR: "₨",
	GMD: "D",
	SLL: "Le",
	LRD: "$",
	GHS: "₵",
	CVE: "Esc",
	STP: "Db",
	XOF: "₣", // West African CFA franc
	XAF: "₣", // Central African CFA franc
	KMF: "₣",
	MGA: "Ar",

	// South American currencies
	BRL: "R$",
	ARS: "$",
	CLP: "$",
	COP: "$",
	PEN: "S/",
	UYU: "$U",
	PYG: "₲",
	BOB: "Bs",
	VES: "Bs.S",
	GYD: "G$",
	SRD: "$",
	FKP: "£",

	// Oceanic currencies
	AUD: "A$",
	NZD: "NZ$",
	FJD: "FJ$",
	PGK: "K",
	SBD: "SI$",
	VUV: "Vt",
	WST: "T",
	TOP: "T$",

	// Other currencies
	RUB: "₽",

	// Caribbean currencies
	XCD: "EC$", // East Caribbean Dollar
	JMD: "J$",
	BBD: "Bds$",
	TTD: "TT$",
	BSD: "B$",
	BZD: "BZ$",
	AWG: "ƒ",
	ANG: "ƒ",
	CUC: "CUC$",
	CUP: "$MN",
	DOP: "RD$",
	HTG: "G",

	// Pacific currencies
	KPW: "₩",
	MOP: "MOP$",
	BND: "B$",

	// Central Asian currencies

	// Special currencies
	XDR: "SDR", // Special Drawing Rights

	// Cryptocurrencies (if supported)
	BTC: "₿",
	ETH: "Ξ",
} as const;

export type SupportedCurrency = keyof typeof CURRENCY_SYMBOLS;

/**
 * Get the currency symbol for a given currency code
 * @param currencyCode - ISO 4217 currency code (e.g., "USD", "EUR", "GBP")
 * @returns Currency symbol (e.g., "$", "€", "£") or currency code if not found
 */
export function getCurrencySymbol(currencyCode?: string | null): string {
	if (!currencyCode) {
		return CURRENCY_SYMBOLS.USD; // Default to USD
	}

	const upperCaseCode = currencyCode.toUpperCase() as SupportedCurrency;
	return CURRENCY_SYMBOLS[upperCaseCode] || currencyCode;
}

/**
 * Get all supported currency codes
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): SupportedCurrency[] {
	return Object.keys(CURRENCY_SYMBOLS) as SupportedCurrency[];
}

/**
 * Check if a currency code is supported
 * @param currencyCode - Currency code to check
 * @returns Boolean indicating if the currency is supported
 */
export function isSupportedCurrency(
	currencyCode: string,
): currencyCode is SupportedCurrency {
	return currencyCode.toUpperCase() in CURRENCY_SYMBOLS;
}

/**
 * Format a number with currency symbol
 * @param amount - The amount to format
 * @param currencyCode - ISO 4217 currency code
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
	amount: number,
	currencyCode?: string | null,
	options: {
		notation?: "standard" | "compact";
		maximumFractionDigits?: number;
		minimumFractionDigits?: number;
	} = {},
): string {
	const symbol = getCurrencySymbol(currencyCode);
	const { notation = "standard", maximumFractionDigits = 2 } = options;

	const formattedAmount = new Intl.NumberFormat("en-US", {
		notation,
		maximumFractionDigits,
		minimumFractionDigits: options.minimumFractionDigits,
	}).format(amount);

	return `${symbol}${formattedAmount}`;
}

/**
 * Get currency information including symbol and common formatting
 * @param currencyCode - ISO 4217 currency code
 * @returns Currency information object
 */
export function getCurrencyInfo(currencyCode?: string | null) {
	const code = currencyCode?.toUpperCase() || "USD";
	const symbol = getCurrencySymbol(currencyCode);

	return {
		code: code as SupportedCurrency,
		symbol,
		isSupported: isSupportedCurrency(code),
	};
}

/**
 * Get currency options formatted for select components
 * @returns Array of currency options with value, label, and symbol
 */
export function getCurrencyOptions() {
	return getSupportedCurrencies().map((code) => ({
		value: code,
		label: `${code} - ${CURRENCY_SYMBOLS[code]}`,
		symbol: CURRENCY_SYMBOLS[code],
		code,
	}));
}

/**
 * Get popular currencies for quick selection
 * @returns Array of most commonly used currency codes
 */
export function getPopularCurrencies(): SupportedCurrency[] {
	return [
		"USD", // US Dollar
		"EUR", // Euro
		"GBP", // British Pound
		"TRY", // Turkish Lira - moved up for prominence
		"JPY", // Japanese Yen
		"CAD", // Canadian Dollar
		"AUD", // Australian Dollar
		"CHF", // Swiss Franc
		"CNY", // Chinese Yuan
		"INR", // Indian Rupee
		"BRL", // Brazilian Real
		"RUB", // Russian Ruble
		"KRW", // South Korean Won
		"MXN", // Mexican Peso
		"SGD", // Singapore Dollar
	];
}
