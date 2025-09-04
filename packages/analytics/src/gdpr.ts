import Cookies from "js-cookie";

// ============================================================================
// GDPR Compliance Types
// ============================================================================

export interface GDPRConsent {
	analytics: boolean;
	functional: boolean;
	marketing: boolean;
	timestamp: number;
	version: string; // For consent version tracking
}

export interface GDPROptions {
	enabled?: boolean; // Enable GDPR mode (default: true in EU)
	requiredConsent?: boolean; // Require explicit consent (default: true)
	consentCookieName?: string; // Cookie name for consent (default: "gdpr_consent")
	consentDurationDays?: number; // Consent validity duration (default: 365)
	anonymizeIP?: boolean; // Anonymize IP addresses (default: true)
	respectDNT?: boolean; // Respect Do Not Track header (default: true)
	dataRetentionDays?: number; // Data retention period (default: 365)
	allowedDomains?: string[]; // Domains where data can be processed
}

export interface GDPRCallbacks {
	onConsentChange?: (consent: GDPRConsent) => void;
	onDataDeletion?: (userId: string) => void;
	onDataExport?: (userId: string) => void;
}

// ============================================================================
// GDPR Consent Management
// ============================================================================

class GDPRManager {
	private options: Required<GDPROptions>;
	private callbacks: GDPRCallbacks = {};
	private currentConsent: GDPRConsent | null = null;

	constructor(options: GDPROptions = {}) {
		this.options = {
			enabled: true,
			requiredConsent: true,
			consentCookieName: "firebuzz_gdpr_consent",
			consentDurationDays: 365,
			anonymizeIP: true,
			respectDNT: true,
			dataRetentionDays: 365,
			allowedDomains: [],
			...options,
		};

		this.loadExistingConsent();
	}

	/**
	 * Initialize GDPR manager with callbacks
	 */
	init(callbacks: GDPRCallbacks = {}) {
		this.callbacks = callbacks;
		
		// Check Do Not Track header
		if (this.options.respectDNT && this.isDNTEnabled()) {
			this.revokeConsent();
			return false; // Do not track
		}

		return this.hasValidConsent();
	}

	/**
	 * Check if user has given valid consent
	 */
	hasValidConsent(category: keyof GDPRConsent = 'analytics'): boolean {
		if (!this.options.enabled) return true; // GDPR disabled
		if (!this.options.requiredConsent) return true; // Consent not required

		if (!this.currentConsent) return false;

		// Check if consent is still valid (not expired)
		const consentAge = Date.now() - this.currentConsent.timestamp;
		const maxAge = this.options.consentDurationDays * 24 * 60 * 60 * 1000;
		
		if (consentAge > maxAge) {
			this.revokeConsent();
			return false;
		}

		return this.currentConsent[category] || false;
	}

	/**
	 * Grant consent for specific categories
	 */
	grantConsent(consent: Partial<Pick<GDPRConsent, 'analytics' | 'functional' | 'marketing'>>) {
		this.currentConsent = {
			analytics: consent.analytics || false,
			functional: consent.functional || false,
			marketing: consent.marketing || false,
			timestamp: Date.now(),
			version: "1.0",
		};

		this.saveConsent();
		this.callbacks.onConsentChange?.(this.currentConsent);
	}

	/**
	 * Revoke all consent
	 */
	revokeConsent() {
		this.currentConsent = null;
		this.clearConsentCookie();
		this.callbacks.onConsentChange?.(null as any);
	}

	/**
	 * Get current consent status
	 */
	getConsent(): GDPRConsent | null {
		return this.currentConsent;
	}

	/**
	 * Check if DNT (Do Not Track) is enabled
	 */
	private isDNTEnabled(): boolean {
		if (typeof navigator === 'undefined') return false;
		return navigator.doNotTrack === '1' || 
		       (navigator as any).msDoNotTrack === '1';
	}

	/**
	 * Load existing consent from cookie
	 */
	private loadExistingConsent() {
		try {
			const consentCookie = Cookies.get(this.options.consentCookieName);
			if (consentCookie) {
				this.currentConsent = JSON.parse(consentCookie);
			}
		} catch (error) {
			console.warn('[GDPR] Failed to load consent:', error);
			this.revokeConsent();
		}
	}

	/**
	 * Save consent to cookie
	 */
	private saveConsent() {
		if (!this.currentConsent) return;

		Cookies.set(this.options.consentCookieName, JSON.stringify(this.currentConsent), {
			expires: this.options.consentDurationDays,
			secure: window.location.protocol === 'https:',
			sameSite: 'Lax',
		});
	}

	/**
	 * Clear consent cookie
	 */
	private clearConsentCookie() {
		Cookies.remove(this.options.consentCookieName);
	}
}

// ============================================================================
// Data Subject Rights (GDPR Article 15-20)
// ============================================================================

export interface DataSubjectRights {
	/**
	 * Right to Access (Article 15) - Export user data
	 */
	exportData(userId: string): Promise<any>;

	/**
	 * Right to Rectification (Article 16) - Correct user data
	 */
	correctData(userId: string, corrections: any): Promise<boolean>;

	/**
	 * Right to Erasure (Article 17) - Delete user data
	 */
	deleteData(userId: string): Promise<boolean>;

	/**
	 * Right to Restrict Processing (Article 18)
	 */
	restrictProcessing(userId: string): Promise<boolean>;

	/**
	 * Right to Data Portability (Article 20)
	 */
	portData(userId: string, format: 'json' | 'csv'): Promise<any>;
}

// ============================================================================
// IP Anonymization (GDPR-compliant)
// ============================================================================

export function anonymizeIP(ip: string): string {
	if (!ip) return '';

	// IPv4 anonymization - zero out last octet
	const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
	const ipv4Match = ip.match(ipv4Regex);
	
	if (ipv4Match) {
		return `${ipv4Match[1]}.${ipv4Match[2]}.${ipv4Match[3]}.0`;
	}

	// IPv6 anonymization - zero out last 64 bits
	const ipv6Regex = /^([0-9a-fA-F:]+)::?([0-9a-fA-F:]*)$/;
	const ipv6Match = ip.match(ipv6Regex);
	
	if (ipv6Match) {
		const prefix = ipv6Match[1].split(':').slice(0, 4).join(':');
		return `${prefix}::`;
	}

	// If we can't parse it, return empty string for privacy
	return '';
}

// ============================================================================
// Export singleton instance
// ============================================================================

let gdprInstance: GDPRManager | null = null;

export function initGDPR(options: GDPROptions = {}): GDPRManager {
	if (!gdprInstance) {
		gdprInstance = new GDPRManager(options);
	}
	return gdprInstance;
}

export function getGDPR(): GDPRManager | null {
	return gdprInstance;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect if user is likely in EU (basic heuristic)
 */
export function isEUUser(): boolean {
	if (typeof navigator === 'undefined') return false;

	// Check timezone (basic heuristic)
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const euTimezones = [
		'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid',
		'Europe/Rome', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna',
		'Europe/Warsaw', 'Europe/Prague', 'Europe/Budapest', 'Europe/Stockholm',
		'Europe/Helsinki', 'Europe/Copenhagen', 'Europe/Oslo', 'Europe/Zurich',
	];

	return euTimezones.some(tz => timezone.includes(tz));
}

/**
 * Check if GDPR applies (EU user or explicit requirement)
 */
export function shouldApplyGDPR(forceGDPR?: boolean): boolean {
	return forceGDPR || isEUUser();
}