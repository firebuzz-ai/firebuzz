// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get viewport dimensions
 */
export function getViewportDimensions() {
  return {
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
  };
}

/**
 * Calculate scroll percentage
 */
export function getScrollPercentage(): number {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollHeight =
    document.documentElement.scrollHeight - window.innerHeight;

  if (scrollHeight <= 0) return 100;

  const percentage = Math.round((scrollTop / scrollHeight) * 100);
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Check if URL is external
 */
export function isExternalUrl(url: string): boolean {
  try {
    const linkUrl = new URL(url, window.location.origin);
    return linkUrl.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Get element selector string for tracking
 */
export function getElementSelector(element: Element): string {
  // Try to get a meaningful selector
  if (element.id) {
    return `#${element.id}`;
  }

  if (element.className) {
    const classes = Array.from(element.classList).slice(0, 2).join(".");
    if (classes) {
      return `.${classes}`;
    }
  }

  // Fallback to tag name
  return element.tagName.toLowerCase();
}

/**
 * Get form ID from form element
 */
export function getFormId(form: HTMLFormElement): string {
  return form.id || form.name || getElementSelector(form);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Get current URL search parameters (UTM, tracking params, etc.)
 */
export function getCurrentSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/**
 * Get tracking and UTM parameters from current page
 */
export function getTrackingParameters(): Record<string, string> {
  const searchParams = getCurrentSearchParams();
  const trackingParams: Record<string, string> = {};

  // UTM parameters
  const utmParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  // Other common tracking parameters
  const otherParams = ["fbclid", "gclid", "msclkid", "ttclid", "ref", "source"];

  // Collect all tracking parameters
  for (const param of [...utmParams, ...otherParams]) {
    const value = searchParams.get(param);
    if (value) {
      trackingParams[param] = value;
    }
  }

  return trackingParams;
}

/**
 * Append tracking parameters to external URL
 */
export function appendTrackingParameters(url: string): string {
  try {
    const trackingParams = getTrackingParameters();
    const urlObj = new URL(url);

    // Add existing UTM and tracking parameters
    for (const [key, value] of Object.entries(trackingParams)) {
      // Only add if the parameter doesn't already exist
      if (!urlObj.searchParams.has(key)) {
        urlObj.searchParams.set(key, value);
      }
    }

    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original URL
    return url;
  }
}

/**
 * Append tracking token to external URL (secure approach)
 */
export function appendTrackingToken(
  url: string,
  trackingToken: string | null
): string {
  try {
    const trackingParams = getTrackingParameters();
    const urlObj = new URL(url);

    // Add existing UTM and tracking parameters
    for (const [key, value] of Object.entries(trackingParams)) {
      if (!urlObj.searchParams.has(key)) {
        urlObj.searchParams.set(key, value);
      }
    }

    // Add Firebuzz tracking token if available
    if (trackingToken) {
      urlObj.searchParams.set("frbzz_token", trackingToken);
    }

    return urlObj.toString();
  } catch {
    return url;
  }
}
