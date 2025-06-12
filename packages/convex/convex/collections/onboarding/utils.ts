import type { Doc } from "../../_generated/dataModel";

export interface Languages {
  primary: string;
  secondary?: string[];
  length?: number; // For compatibility with array-like usage
}

// Enhanced navigation link structure with AI-powered analysis
export interface SelectedLink {
  text: string;
  url: string;
  selected: boolean;
  category: "navigation" | "footer" | "content" | "cta";
  relevanceScore: number;
  description: string;
}

export const defaultLightTheme: Doc<"themes">["lightTheme"] = {
  background: "0 0% 100%",
  foreground: "240 5.9% 10%",
  muted: "60 9% 98%",
  mutedForeground: "240 3.83% 46.08%",
  popover: "0 0% 100%",
  popoverForeground: "240 5.9% 10%",
  border: "240 4.8% 95.9%",
  input: "240 4.8% 95.9%",
  card: "0 0% 100%",
  cardForeground: "240 5.9% 10%",
  primary: "240 5.9% 10%",
  primaryForeground: "0 0% 100%",
  secondary: "240 4.8% 95.9%",
  secondaryForeground: "240 5.3% 26.1%",
  accent: "0 0% 98%",
  accentForeground: "240 5.9% 10%",
  destructive: "346.84 77.17% 49.8%",
  destructiveForeground: "355.71 100% 97.25%",
  ring: "240 4.8% 95.9%",
  chart1: "12 76% 61%",
  chart2: "173 58% 39%",
  chart3: "197 37% 24%",
  chart4: "43 74% 66%",
  chart5: "27 87% 67%",
  radius: "0.5rem",
};

export const defaultDarkTheme: Doc<"themes">["darkTheme"] = {
  background: "240 5.9% 10%",
  foreground: "0 0% 100%",
  muted: "240 3.45% 11.37%",
  mutedForeground: "240 5.03% 64.9%",
  popover: "240 5.9% 10%",
  popoverForeground: "0 0% 100%",
  border: "240 3.7% 15.88%",
  input: "240 3.7% 15.88%",
  card: "240 5.9% 10%",
  cardForeground: "0 0% 100%",
  primary: "0 0% 100%",
  primaryForeground: "240 5.9% 10%",
  secondary: "240 5.3% 26.1%",
  secondaryForeground: "232 0% 78.08%",
  accent: "240 3.7% 15.88%",
  accentForeground: "0 0% 100%",
  destructive: "346.84 77.17% 49.8%",
  destructiveForeground: "355.71 100% 97.25%",
  chart1: "220 70% 50%",
  chart2: "160 60% 45%",
  chart3: "30 80% 55%",
  chart4: "280 65% 60%",
  chart5: "340 75% 55%",
  ring: "240 3.7% 15.88%",
};

export const defaultFonts: Doc<"themes">["fonts"] = [
  {
    type: "google",
    family: "sans",
    name: "Inter",
  },
  {
    type: "google",
    family: "serif",
    name: "Merriweather",
  },
  {
    type: "google",
    family: "mono",
    name: "JetBrains Mono",
  },
];

/**
 * Normalizes a URL to domain level for homepage scraping
 * @param url - Input URL string
 * @returns Domain-level URL (e.g., "https://example.com")
 */
export function normalizeToDomain(url: string): string {
  try {
    // Add protocol if missing
    let normalizedUrl = url;
    if (
      !normalizedUrl.startsWith("http://") &&
      !normalizedUrl.startsWith("https://")
    ) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const parsedUrl = new URL(normalizedUrl);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  } catch (error) {
    console.error(error);
    throw new Error(`Invalid URL format: ${url}`);
  }
}

/**
 * Validates if a URL is properly formatted
 * @param url - URL to validate
 * @returns True if valid, false otherwise
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Determines if a link is internal to the given domain
 * @param link - Link URL to check
 * @param domain - Base domain to compare against
 * @returns True if internal, false otherwise
 */
export function isInternalLink(link: string, domain: string): boolean {
  try {
    const linkUrl = new URL(link, domain);
    const domainUrl = new URL(domain);
    return linkUrl.hostname === domainUrl.hostname;
  } catch {
    return false;
  }
}

/**
 * Extracts primary and secondary languages from HTML content
 * @param html - HTML content to analyze
 * @returns Languages object with primary and secondary language codes
 */
export function extractLanguages(html: string): Languages {
  try {
    // Extract HTML lang attribute
    const htmlLangMatch = html.match(/<html[^>]*\slang=["']([^"']+)["']/i);
    const htmlLang = htmlLangMatch?.[1];

    // Extract meta content-language
    const metaLangMatch = html.match(
      /<meta[^>]*http-equiv=["']content-language["'][^>]*content=["']([^"']+)["']/i
    );
    const metaLang = metaLangMatch?.[1];

    // Extract hreflang links
    const hreflangMatches = Array.from(
      html.matchAll(/<link[^>]*hreflang=["']([^"']+)["']/gi)
    );
    const hreflangLinks = hreflangMatches
      .map((match) => match[1])
      .filter((lang) => lang && lang !== "x-default");

    // Determine primary language (prefer HTML lang, fallback to meta)
    const primary = htmlLang || metaLang || "en";

    // Collect secondary languages from hreflang
    const secondary = hreflangLinks
      .filter((lang) => lang !== primary)
      .map((lang) => lang.split("-")[0]); // Get language code only

    return {
      primary: primary.split("-")[0], // Get language code only (e.g., 'en' from 'en-US')
      secondary:
        secondary.length > 0 ? Array.from(new Set(secondary)) : undefined,
    };
  } catch (error) {
    console.warn("Language extraction failed:", error);
    return { primary: "en" };
  }
}

/**
 * Extracts favicon URL from HTML content
 * @param html - HTML content to analyze
 * @param domain - Base domain for resolving relative URLs
 * @returns Favicon URL or null if not found
 */
export function extractFaviconUrl(html: string, domain: string): string | null {
  try {
    // Look for various favicon link types
    const faviconPatterns = [
      /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i,
      /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i,
    ];

    for (const pattern of faviconPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const href = match[1];
        // Convert relative URLs to absolute
        try {
          return new URL(href, domain).toString();
        } catch {
          return href.startsWith("/") ? `${domain}${href}` : href;
        }
      }
    }

    return null;
  } catch (error) {
    console.warn("Favicon extraction failed:", error);
    return null;
  }
}

interface ExtractedLogo {
  url: string;
  score: number;
  source: "logo" | "brand" | "header" | "nav" | "favicon";
  alt?: string;
  size?: { width?: number; height?: number };
}

/**
 * Extracts site logo URL from HTML content with comprehensive logo detection
 * Prioritizes logos by relevance and quality indicators
 * @param html - HTML content to analyze
 * @param domain - Base domain for resolving relative URLs
 * @returns Best logo URL or null if not found
 */
export function extractSiteLogo(html: string, domain: string): string | null {
  try {
    const logoSources: ExtractedLogo[] = [];

    // 1. Look for images with logo-related attributes (highest priority)
    const logoPatterns = [
      // Images with logo/brand in class, id, or alt
      /<img[^>]*(?:class|id)=["'][^"']*(?:logo|brand)[^"']*["'][^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi,
      /<img[^>]*src=["']([^"']+)["'][^>]*(?:class|id)=["'][^"']*(?:logo|brand)[^"']*["'][^>]*(?:alt=["']([^"']*)["'])?/gi,
      /<img[^>]*alt=["'][^"']*(?:logo|brand)[^"']*["'][^>]*src=["']([^"']+)["']/gi,
      /<img[^>]*src=["']([^"']+)["'][^>]*alt=["'][^"']*(?:logo|brand)[^"']*["']/gi,
    ];

    for (const pattern of logoPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const match of matches) {
        const src = match[1];
        const alt = match[2] || "";
        if (src && isValidImageUrl(src)) {
          logoSources.push({
            url: resolveImageUrl(src, domain),
            score: 10,
            source: "logo",
            alt: alt,
          });
        }
      }
    }

    // 2. Look for images in header/navigation areas (high priority)
    const headerSections = [
      /<header[\s\S]*?<\/header>/gi,
      /<nav[\s\S]*?<\/nav>/gi,
      /<[^>]*class=["'][^"']*(?:header|navbar|nav-bar|brand)[^"']*["'][\s\S]*?>/gi,
    ];

    for (const sectionPattern of headerSections) {
      const sectionMatches = Array.from(html.matchAll(sectionPattern));
      for (const sectionMatch of sectionMatches) {
        const sectionHtml = sectionMatch[0];
        const imgMatches = Array.from(
          sectionHtml.matchAll(
            /<img[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi
          )
        );

        for (const imgMatch of imgMatches) {
          const src = imgMatch[1];
          const alt = imgMatch[2] || "";
          if (src && isValidImageUrl(src)) {
            logoSources.push({
              url: resolveImageUrl(src, domain),
              score: 8,
              source: "header",
              alt: alt,
            });
          }
        }
      }
    }

    // 3. Look for brand-related SVG or vector graphics (medium priority)
    const svgPatterns = [
      /<svg[^>]*(?:class|id)=["'][^"']*(?:logo|brand)[^"']*["']/gi,
      /<img[^>]*src=["']([^"']*\.svg[^"']*)["'][^>]*(?:class|id)=["'][^"']*(?:logo|brand)[^"']*["']/gi,
    ];

    for (const pattern of svgPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const match of matches) {
        const src = match[1];
        if (src && isValidImageUrl(src)) {
          logoSources.push({
            url: resolveImageUrl(src, domain),
            score: 7,
            source: "brand",
          });
        }
      }
    }

    // 4. Look for high-resolution favicon/apple-touch-icon (lower priority)
    const appleTouchIconMatch =
      html.match(
        /<link[^>]*rel=["']apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/i
      ) ||
      html.match(
        /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon[^"']*["']/i
      );

    if (appleTouchIconMatch?.[1]) {
      logoSources.push({
        url: resolveImageUrl(appleTouchIconMatch[1], domain),
        score: 4,
        source: "favicon",
      });
    }

    // 5. Extract size information to boost larger images
    for (const logo of logoSources) {
      // Look for width/height attributes or size indicators in URL
      const sizeMatch =
        logo.url.match(/(\d+)x(\d+)/) || logo.url.match(/(\d+)/);
      if (sizeMatch) {
        const size = Number.parseInt(sizeMatch[1]);
        if (size >= 200) logo.score += 2; // Boost larger images
        if (size >= 400) logo.score += 1; // Extra boost for high-res
      }

      // Boost images with descriptive alt text
      if (
        logo.alt &&
        (logo.alt.toLowerCase().includes("logo") ||
          logo.alt.toLowerCase().includes("brand"))
      ) {
        logo.score += 1;
      }
    }

    // Remove duplicates and sort by score
    const uniqueLogos = logoSources.filter(
      (logo, index, arr) => arr.findIndex((l) => l.url === logo.url) === index
    );

    uniqueLogos.sort((a, b) => b.score - a.score);

    // Return the highest scoring logo
    if (uniqueLogos.length > 0) {
      return uniqueLogos[0].url;
    }

    return null;
  } catch (error) {
    console.warn("Logo extraction failed:", error);
    return null;
  }
}

/**
 * Validates if a URL appears to be a valid image
 * @param url - URL to validate
 * @returns True if it appears to be an image URL
 */
function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 4) return false;

  // Check for image file extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|svg|webp|ico)(\?[^/]*)?$/i;
  if (imageExtensions.test(url)) return true;

  // Allow data URLs for inline images
  if (url.startsWith("data:image/")) return true;

  // Allow if it looks like an image service URL
  const imageServicePatterns = [
    /\/image\//,
    /\/img\//,
    /\/logo\//,
    /\/brand\//,
    /cloudinary/,
    /contentful/,
    /unsplash/,
  ];

  return imageServicePatterns.some((pattern) => pattern.test(url));
}

/**
 * Resolves a potentially relative image URL to an absolute URL
 * @param src - Image source URL (may be relative)
 * @param domain - Base domain for resolution
 * @returns Absolute URL
 */
function resolveImageUrl(src: string, domain: string): string {
  if (!src) return "";

  // Already absolute URL or data URL
  if (src.startsWith("http") || src.startsWith("data:")) {
    return src;
  }

  // Relative URL
  try {
    return new URL(src, domain).toString();
  } catch {
    // Fallback for malformed URLs
    return src.startsWith("/") ? `${domain}${src}` : `${domain}/${src}`;
  }
}

/**
 * Extracts all internal links from HTML content using regex patterns
 * @param html - HTML content to parse
 * @param domain - Base domain for filtering
 * @returns Array of internal link URLs
 */
export function extractAllLinks(html: string, domain: string): string[] {
  try {
    // Extract all href attributes from anchor tags
    const linkMatches = Array.from(
      html.matchAll(/<a[^>]*href=["']([^"']+)["']/gi)
    );

    const links = linkMatches
      .map((match) => {
        const href = match[1];
        if (
          !href ||
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:")
        ) {
          return null;
        }

        try {
          const fullUrl = new URL(href, domain);
          // Remove fragment from URL (everything after #)
          fullUrl.hash = "";
          return fullUrl.toString();
        } catch {
          return null;
        }
      })
      .filter((url): url is string => Boolean(url))
      .filter((url) => isInternalLink(url, domain));

    // Remove duplicates
    return Array.from(new Set(links));
  } catch (error) {
    console.warn("Link extraction failed:", error);
    return [];
  }
}

/**
 * Categorizes links from HTML content by their DOM position using regex patterns
 * @param html - HTML content containing links
 * @param domain - Base domain for filtering internal links
 * @returns Array of categorized SelectedLink objects
 */
export function categorizeLinks(html: string, domain: string): SelectedLink[] {
  try {
    const links: SelectedLink[] = [];
    const seenUrls = new Set<string>();

    // Define regex patterns for each section
    const sectionPatterns = {
      navigation:
        /<nav[\s\S]*?<\/nav>|<[^>]*class=["'][^"']*nav[^"']*["'][\s\S]*?>/gi,
      footer:
        /<footer[\s\S]*?<\/footer>|<[^>]*class=["'][^"']*footer[^"']*["'][\s\S]*?>/gi,
      header:
        /<header[\s\S]*?<\/header>|<[^>]*class=["'][^"']*header[^"']*["'][\s\S]*?>/gi,
    };

    // Extract links from each section
    for (const [category, pattern] of Object.entries(sectionPatterns)) {
      const sectionMatches = Array.from(html.matchAll(pattern));

      for (const sectionMatch of sectionMatches) {
        const sectionHtml = sectionMatch[0];
        const linkMatches = Array.from(
          sectionHtml.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)</gi)
        );

        for (const linkMatch of linkMatches) {
          const href = linkMatch[1];
          const text = linkMatch[2]?.trim() || "";

          if (
            !href ||
            !text ||
            href.startsWith("#") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:")
          ) {
            continue;
          }

          try {
            const urlObj = new URL(href, domain);
            // Remove fragment from URL (everything after #)
            urlObj.hash = "";
            const fullUrl = urlObj.toString();

            if (!isInternalLink(fullUrl, domain) || seenUrls.has(fullUrl)) {
              continue;
            }

            seenUrls.add(fullUrl);

            links.push({
              text: text.substring(0, 100), // Limit text length
              url: fullUrl,
              selected: false,
              category: category as "navigation" | "footer" | "content" | "cta",
              relevanceScore: 0, // Will be set by AI
              description: "", // Will be set by AI
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }

    // Extract remaining content links (not in nav, header, footer)
    const contentLinkMatches = Array.from(
      html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)</gi)
    );

    for (const linkMatch of contentLinkMatches) {
      const href = linkMatch[1];
      const text = linkMatch[2]?.trim() || "";

      if (
        !href ||
        !text ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        continue;
      }

      try {
        const urlObj = new URL(href, domain);
        // Remove fragment from URL (everything after #)
        urlObj.hash = "";
        const fullUrl = urlObj.toString();

        if (!isInternalLink(fullUrl, domain) || seenUrls.has(fullUrl)) {
          continue;
        }

        seenUrls.add(fullUrl);

        links.push({
          text: text.substring(0, 100),
          url: fullUrl,
          selected: false,
          category: "content",
          relevanceScore: 0,
          description: "",
        });
      } catch {
        // Skip invalid URLs
      }
    }

    return links;
  } catch (error) {
    console.warn("Link categorization failed:", error);
    return [];
  }
}

/**
 * Extracts navigation links from HTML using DOM patterns
 * Targets <nav>, <header>, and elements with navigation-related classes
 */
export function extractNavigationLinks(
  html: string,
  domain: string
): SelectedLink[] {
  const navLinks: SelectedLink[] = [];

  const navPatterns = [
    /<nav[^>]*>([\s\S]*?)<\/nav>/gi,
    /<header[^>]*>([\s\S]*?)<\/header>/gi,
    /<div[^>]*class="[^"]*(?:nav|header|menu|navigation)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<ul[^>]*class="[^"]*(?:nav|menu|navigation)[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi,
  ];

  for (const pattern of navPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const navSection = match[1];
      const linkMatches = navSection.matchAll(/<a[^>]*href=["']([^"']+)["']/gi);

      for (const linkMatch of linkMatches) {
        const url = normalizeUrl(linkMatch[1], domain);

        if (isValidInternalLink(url, domain) && !isDuplicate(navLinks, url)) {
          navLinks.push({
            text: extractTitleFromUrl(url),
            url,
            selected: false,
            category: "navigation" as const,
            relevanceScore: 5,
            description: "Navigation link",
          });
        }
      }
    }
  }

  return navLinks.slice(0, 20); // Limit to prevent overflow
}

/**
 * Extracts footer links from HTML using DOM patterns
 * Targets <footer> and elements with footer-related classes
 */
export function extractFooterLinks(
  html: string,
  domain: string
): SelectedLink[] {
  const footerLinks: SelectedLink[] = [];

  const footerPatterns = [
    /<footer[^>]*>([\s\S]*?)<\/footer>/gi,
    /<div[^>]*class="[^"]*footer[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*class="[^"]*footer[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
  ];

  for (const pattern of footerPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const footerSection = match[1];
      const linkMatches = footerSection.matchAll(
        /<a[^>]*href=["']([^"']+)["']/gi
      );

      for (const linkMatch of linkMatches) {
        const url = normalizeUrl(linkMatch[1], domain);

        if (
          isValidInternalLink(url, domain) &&
          !isDuplicate(footerLinks, url)
        ) {
          footerLinks.push({
            text: extractTitleFromUrl(url),
            url,
            selected: false,
            category: "footer" as const,
            relevanceScore: 4,
            description: "Footer link",
          });
        }
      }
    }
  }

  return footerLinks.slice(0, 15); // Limit to prevent overflow
}

/**
 * Categorizes remaining content links from Firecrawl extraction
 * Filters out duplicates already found in navigation and footer
 */
export function categorizeContentLinks(
  firecrawlLinks: string[],
  domain: string,
  navLinks: SelectedLink[],
  footerLinks: SelectedLink[]
): SelectedLink[] {
  const contentLinks: SelectedLink[] = [];
  const existingUrls = new Set([
    ...navLinks.map((l) => l.url),
    ...footerLinks.map((l) => l.url),
  ]);

  for (const link of firecrawlLinks) {
    const url = normalizeUrl(link, domain);

    if (isValidInternalLink(url, domain) && !existingUrls.has(url)) {
      contentLinks.push({
        text: extractTitleFromUrl(url),
        url,
        selected: false,
        category: "content" as const,
        relevanceScore: 6,
        description: "Content page",
      });
      existingUrls.add(url);
    }
  }

  return contentLinks.slice(0, 30); // Limit to prevent overflow
}

/**
 * Normalizes URLs to absolute format and removes fragments
 * Handles relative paths and different URL formats
 * Guards against fragment-only URLs to prevent homepage duplicates
 */
export function normalizeUrl(url: string, domain: string): string {
  // Guard: If URL is fragment-only (starts with #), return as-is to prevent
  // converting "#about" into full domain URL which creates homepage duplicates
  if (url.startsWith("#")) {
    return url;
  }

  try {
    let fullUrl: URL;
    if (url.startsWith("/")) {
      fullUrl = new URL(url, domain);
    } else if (url.startsWith("http")) {
      fullUrl = new URL(url);
    } else {
      fullUrl = new URL(url, domain);
    }

    // Remove fragment (everything after #)
    fullUrl.hash = "";
    return fullUrl.href;
  } catch {
    return "";
  }
}

/**
 * Extracts a readable title from URL path
 * Converts URL segments to human-readable format
 */
export function extractTitleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "Homepage";

    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/\.(html|php|aspx?)$/i, "");
  } catch {
    return "Page";
  }
}

/**
 * Validates if a URL is a valid internal link
 * Handles www/non-www variations and filters out file types and fragments
 */
export function isValidInternalLink(url: string, domain: string): boolean {
  try {
    if (!url || url === "" || url === "#") {
      return false;
    }

    // Filter out fragment-only URLs (e.g., "#about", "#contact")
    // as they don't represent separate pages
    if (url.startsWith("#")) {
      return false;
    }

    const urlObj = new URL(url);
    const domainObj = new URL(domain);

    // Normalize hostnames by removing www prefix for comparison
    const normalizeHostname = (hostname: string) =>
      hostname.replace(/^www\./, "");
    const urlHostname = normalizeHostname(urlObj.hostname);
    const domainHostname = normalizeHostname(domainObj.hostname);

    // Must be same domain (after normalizing www)
    if (urlHostname !== domainHostname) {
      return false;
    }

    // Exclude common file types
    if (
      urlObj.pathname.match(
        /\.(pdf|jpg|jpeg|png|gif|svg|zip|doc|docx|xls|xlsx)$/i
      )
    ) {
      return false;
    }

    // Exclude homepage URLs (compare normalized URLs)
    const normalizedUrl = urlObj.href.replace(/^https?:\/\/www\./, "https://");
    const normalizedDomain = domain.replace(/^https?:\/\/www\./, "https://");
    if (
      normalizedUrl === normalizedDomain ||
      normalizedUrl === `${normalizedDomain}/`
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function isDuplicate(links: SelectedLink[], url: string): boolean {
  return links.some((link) => link.url === url);
}

/**
 * CSS and Theme Extraction Utilities
 */

interface ExtractedCSS {
  colors: string[];
  fonts: string[];
  borderRadius: string[];
  cssText: string;
}

/**
 * Extract relevant CSS properties from HTML for efficient AI processing
 * Focuses on colors, fonts, and border-radius declarations
 */
export function extractRelevantCSS(html: string): ExtractedCSS {
  // Extract CSS from <style> tags and style attributes
  const styleTagMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  const inlineStyleMatches = html.match(/style\s*=\s*"([^"]*)"/gi) || [];

  let allCSS = "";

  // Combine all CSS sources
  for (const match of styleTagMatches) {
    const cssContent = match.replace(/<\/?style[^>]*>/gi, "");
    allCSS += `${cssContent}\n`;
  }

  for (const match of inlineStyleMatches) {
    const styleContent = match.replace(/style\s*=\s*"/i, "").replace('"', "");
    allCSS += `${styleContent};\n`;
  }

  // Extract Google Fonts imports
  const fontImports =
    html.match(/<link[^>]*fonts\.googleapis\.com[^>]*>/gi) || [];
  for (const link of fontImports) {
    allCSS += `/* Google Font: ${link} */\n`;
  }

  // Extract specific properties
  const colors = [
    ...new Set([
      ...(allCSS.match(/#[0-9A-Fa-f]{6}/g) || []),
      ...(allCSS.match(/#[0-9A-Fa-f]{3}/g) || []),
      ...(allCSS.match(/rgb\([^)]+\)/g) || []),
      ...(allCSS.match(/rgba\([^)]+\)/g) || []),
      ...(allCSS.match(/hsl\([^)]+\)/g) || []),
      ...(allCSS.match(/hsla\([^)]+\)/g) || []),
    ]),
  ];

  const fonts = [
    ...new Set([
      ...(allCSS.match(/font-family\s*:\s*([^;}\n]+)/gi) || []),
      ...(html.match(/family=([^&"'>]+)/gi) || []), // Google Fonts URL params
    ]),
  ];

  const borderRadius = [
    ...new Set([
      ...(allCSS.match(/border-radius\s*:\s*([^;}\n]+)/gi) || []),
      ...(allCSS.match(/border-top-left-radius\s*:\s*([^;}\n]+)/gi) || []),
    ]),
  ];

  // Create clean CSS summary (limit to 2000 chars for efficiency)
  const relevantCSS = [
    "/* EXTRACTED COLORS */",
    ...colors.slice(0, 20).map((color) => `color: ${color};`),
    "",
    "/* EXTRACTED FONTS */",
    ...fonts.slice(0, 10),
    "",
    "/* EXTRACTED BORDER RADIUS */",
    ...borderRadius.slice(0, 5),
    "",
    "/* CSS SAMPLE */",
    allCSS.substring(0, 1000),
  ].join("\n");

  return {
    colors: colors.slice(0, 20),
    fonts: fonts.slice(0, 10),
    borderRadius: borderRadius.slice(0, 5),
    cssText: relevantCSS,
  };
}

/**
 * Enhanced color extraction from HTML with better filtering
 */
export function extractColorsFromCSS(extractedCSS: ExtractedCSS): {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
} {
  const colors = extractedCSS.colors;

  // Default fallback colors
  let primaryColor = "#3B82F6";
  let secondaryColor = "#64748B";
  let accentColor = "#F59E0B";
  let textColor = "#1F2937";
  const backgroundColor = "#FFFFFF";

  // Filter out common default colors
  const filteredColors = colors.filter((color) => {
    const normalized = color.toLowerCase();
    return ![
      "#ffffff",
      "#fff",
      "#000000",
      "#000",
      "transparent",
      "inherit",
      "initial",
    ].includes(normalized);
  });

  // Try to identify primary brand color (first non-standard color)
  if (filteredColors.length > 0) {
    primaryColor = filteredColors[0];
  }

  // Try to identify secondary color (second non-standard color)
  if (filteredColors.length > 1) {
    secondaryColor = filteredColors[1];
  }

  // Try to identify accent color (third non-standard color)
  if (filteredColors.length > 2) {
    accentColor = filteredColors[2];
  }

  // Look for dark colors (likely text)
  const darkColors = colors.filter((color) => {
    if (color.startsWith("#")) {
      const hex = color.replace("#", "");
      if (hex.length === 3) {
        // Convert 3-digit hex to 6-digit
        const r = Number.parseInt(hex[0] + hex[0], 16);
        const g = Number.parseInt(hex[1] + hex[1], 16);
        const b = Number.parseInt(hex[2] + hex[2], 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128;
      }
      if (hex.length === 6) {
        const r = Number.parseInt(hex.substr(0, 2), 16);
        const g = Number.parseInt(hex.substr(2, 2), 16);
        const b = Number.parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128;
      }
    }
    return false;
  });

  if (darkColors.length > 0) {
    textColor = darkColors[0];
  }

  return {
    primaryColor,
    secondaryColor,
    accentColor,
    textColor,
    backgroundColor,
  };
}

/**
 * Enhanced font extraction from CSS with better parsing
 */
export function extractFontsFromCSS(extractedCSS: ExtractedCSS): {
  sansFont: string;
  serifFont: string;
  monoFont: string;
} {
  const fonts = extractedCSS.fonts;

  // Default fonts
  let sansFont = "Inter";
  let serifFont = "Georgia";
  let monoFont = "JetBrains Mono";

  // Common font mappings
  const fontMappings = {
    sans: [
      "Inter",
      "Roboto",
      "Open Sans",
      "Lato",
      "Montserrat",
      "Poppins",
      "Nunito",
      "Source Sans Pro",
      "Work Sans",
      "Fira Sans",
    ],
    serif: [
      "Georgia",
      "Times New Roman",
      "Playfair Display",
      "Merriweather",
      "Crimson Text",
      "Lora",
      "Source Serif Pro",
      "PT Serif",
    ],
    mono: [
      "JetBrains Mono",
      "Fira Code",
      "Source Code Pro",
      "Monaco",
      "Consolas",
      "Roboto Mono",
      "Ubuntu Mono",
      "SF Mono",
    ],
  };

  // Clean and parse font declarations
  for (const fontDeclaration of fonts) {
    const fontValue = fontDeclaration
      .replace(/font-family\s*:\s*/i, "")
      .replace(/family=/i, "")
      .replace(/['"]/g, "")
      .trim();

    // Skip generic/invalid values
    if (
      fontValue &&
      !["inherit", "initial", "unset", "none"].includes(fontValue.toLowerCase())
    ) {
      // Extract first font name
      const firstFont = fontValue.split(",")[0]?.trim();

      if (firstFont) {
        // Check if it's a known sans font
        if (
          fontMappings.sans.some((font) =>
            firstFont.toLowerCase().includes(font.toLowerCase())
          )
        ) {
          sansFont = firstFont;
        }
        // Check if it's a known serif font
        else if (
          fontMappings.serif.some((font) =>
            firstFont.toLowerCase().includes(font.toLowerCase())
          )
        ) {
          serifFont = firstFont;
        }
        // Check if it's a known mono font
        else if (
          fontMappings.mono.some((font) =>
            firstFont.toLowerCase().includes(font.toLowerCase())
          )
        ) {
          monoFont = firstFont;
        }
        // Default to sans if unknown
        else {
          sansFont = firstFont;
        }
      }
    }
  }

  return { sansFont, serifFont, monoFont };
}

/**
 * Converts image URL to base64 for AI processing
 */
export async function urlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  } catch (error) {
    console.warn(`Failed to convert URL to base64: ${url}`, error);
    return null;
  }
}

/**
 * Extracts border radius value from CSS with fallback
 */
export function extractBorderRadius(extractedCSS: ExtractedCSS): string {
  const borderRadiusValues = extractedCSS.borderRadius;

  if (borderRadiusValues.length > 0) {
    // Extract the value part from "border-radius: 8px"
    const value = borderRadiusValues[0]
      .replace(/border-radius\s*:\s*/i, "")
      .replace(/border-top-left-radius\s*:\s*/i, "")
      .trim();

    // Convert px to rem if needed
    if (value.includes("px")) {
      const pxValue = Number.parseFloat(value);
      return `${(pxValue / 16).toFixed(2)}rem`;
    }

    return value;
  }

  return "0.5rem"; // Default fallback
}

/**
 * Theme Generation Utilities
 */

/**
 * Parse HSL string to HSL object
 */
function parseHslString(hslString: string): {
  h: number;
  s: number;
  l: number;
} {
  const values = hslString.replace(/%/g, "").split(/\s+/).filter(Boolean);
  if (values.length !== 3) {
    throw new Error(`Invalid HSL color format: ${hslString}`);
  }

  return {
    h: Number.parseFloat(values[0]),
    s: Number.parseFloat(values[1]),
    l: Number.parseFloat(values[2]),
  };
}

/**
 * Format HSL values to string
 */
function formatHsl(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/**
 * Calculate relative luminance for contrast ratio calculations
 */
function getRelativeLuminance(hex: string): number {
  const rgb = [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ].map((value) => {
    const normalizedValue = value / 255;
    return normalizedValue <= 0.03928
      ? normalizedValue / 12.92
      : ((normalizedValue + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Convert hex to HSL format
 */
function hexToHsl(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Parse hex to RGB
  const r = Number.parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = Number.parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = Number.parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number;
  let s: number;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
        break;
    }
    h /= 6;
  }

  // Convert to the format expected by the server: "h s% l%"
  const hue = Math.round(h * 360);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${hue} ${saturation}% ${lightness}%`;
}

/**
 * Generate optimal foreground color with proper contrast
 */
function generateOptimalForeground(
  backgroundHex: string,
  isLightTheme: boolean,
  primaryHsl: { h: number; s: number; l: number }
): string {
  const whiteContrast = getContrastRatio(backgroundHex, "#ffffff");
  const blackContrast = getContrastRatio(backgroundHex, "#000000");

  // WCAG AA requires 4.5:1 for normal text, AAA requires 7:1
  const requiredContrast = 4.5;

  if (whiteContrast >= requiredContrast && blackContrast >= requiredContrast) {
    // Both work, choose based on theme
    return isLightTheme ? "240 5.9% 10%" : "0 0% 98%";
  }

  if (whiteContrast >= requiredContrast) {
    return "0 0% 98%";
  }

  if (blackContrast >= requiredContrast) {
    return "240 5.9% 10%";
  }

  // Neither standard black/white works, generate a contrasting color
  const backgroundLum = getRelativeLuminance(backgroundHex);
  const targetLightness = backgroundLum > 0.5 ? 15 : 85;
  return formatHsl(
    primaryHsl.h,
    Math.min(primaryHsl.s * 0.3, 20),
    targetLightness
  );
}

/**
 * Generate complete theme colors from primary color
 */
export function generateColorsFromPrimary(
  primaryHex: string,
  isLightTheme: boolean
) {
  // Convert primary color to HSL for manipulation
  const primaryHsl = parseHslString(hexToHsl(primaryHex));
  const { h: hue, s: saturation, l: lightness } = primaryHsl;

  if (isLightTheme) {
    // Light theme colors with enhanced shade generation
    const mutedBackgroundL = 98;
    const cardBackgroundL = 100;

    return {
      // Base colors
      background: "0 0% 100%",
      foreground: "240 5.9% 10%",

      // Muted colors - very subtle primary tint
      muted: formatHsl(hue, Math.min(saturation * 0.1, 8), mutedBackgroundL),
      mutedForeground: "240 3.8% 46.1%",

      // Card colors
      card: formatHsl(hue, Math.min(saturation * 0.05, 3), cardBackgroundL),
      cardForeground: "240 5.9% 10%",

      // Popover colors
      popover: "0 0% 100%",
      popoverForeground: "240 5.9% 10%",

      // Border colors - subtle primary tint
      border: formatHsl(hue, Math.min(saturation * 0.15, 12), 95.9),
      input: formatHsl(hue, Math.min(saturation * 0.12, 10), 95.9),

      // Primary colors - user's exact choice
      primary: formatHsl(hue, saturation, lightness),
      primaryForeground: generateOptimalForeground(
        primaryHex,
        isLightTheme,
        primaryHsl
      ),

      // Secondary colors - desaturated and lighter version
      secondary: formatHsl(
        hue,
        Math.max(saturation * 0.25, 8),
        Math.min(lightness + 35, 96)
      ),
      secondaryForeground: "240 5.3% 26.1%",

      // Accent colors - very light, subtle version
      accent: formatHsl(
        hue,
        Math.max(saturation * 0.15, 5),
        Math.min(lightness + 40, 98)
      ),
      accentForeground: "240 5.9% 10%",

      // Destructive colors - keep consistent red
      destructive: "346.8 77.2% 49.8%",
      destructiveForeground: "355.7 100% 97.3%",

      // Ring color - slightly darker primary for focus states
      ring: formatHsl(
        hue,
        Math.min(saturation * 1.1, 100),
        Math.max(lightness - 15, 25)
      ),

      // Chart colors
      chart1: formatHsl(hue, Math.min(saturation * 0.15, 12), 61),
      chart2: formatHsl(hue, Math.min(saturation * 0.15, 39), 58),
      chart3: formatHsl(hue, Math.min(saturation * 0.15, 24), 37),
      chart4: formatHsl(hue, Math.min(saturation * 0.15, 66), 74),
      chart5: formatHsl(hue, Math.min(saturation * 0.15, 67), 87),
    };
  }

  // Dark theme colors with enhanced shade generation
  const cardBackgroundL = 11;
  const mutedBackgroundL = 12;

  return {
    // Base colors
    background: "240 5.9% 10%",
    foreground: "0 0% 98%",

    // Muted colors - dark with subtle primary tint
    muted: formatHsl(hue, Math.min(saturation * 0.2, 15), mutedBackgroundL),
    mutedForeground: "240 5% 64.9%",

    // Card colors
    card: formatHsl(hue, Math.min(saturation * 0.15, 12), cardBackgroundL),
    cardForeground: "0 0% 98%",

    // Popover colors
    popover: formatHsl(hue, Math.min(saturation * 0.1, 8), 10),
    popoverForeground: "0 0% 98%",

    // Border colors - darker with primary tint
    border: formatHsl(hue, Math.min(saturation * 0.25, 20), 15.9),
    input: formatHsl(hue, Math.min(saturation * 0.2, 18), 15.9),

    // Primary colors - user's exact choice but ensure good contrast
    primary: formatHsl(hue, saturation, Math.max(lightness, 45)),
    primaryForeground: generateOptimalForeground(
      primaryHex,
      isLightTheme,
      primaryHsl
    ),

    // Secondary colors - darker, desaturated version
    secondary: formatHsl(
      hue,
      Math.max(saturation * 0.4, 12),
      Math.max(lightness - 25, 18)
    ),
    secondaryForeground: "0 0% 78.1%",

    // Accent colors - dark accent with primary hue
    accent: formatHsl(
      hue,
      Math.max(saturation * 0.3, 10),
      Math.max(lightness - 30, 15)
    ),
    accentForeground: "0 0% 98%",

    // Destructive colors - keep consistent red
    destructive: "346.8 77.2% 49.8%",
    destructiveForeground: "355.7 100% 97.3%",

    // Ring color - brighter primary for focus states in dark mode
    ring: formatHsl(
      hue,
      Math.min(saturation * 1.2, 100),
      Math.min(lightness + 20, 75)
    ),

    // Chart colors
    chart1: formatHsl(hue, Math.min(saturation * 0.15, 12), 61),
    chart2: formatHsl(hue, Math.min(saturation * 0.15, 39), 58),
    chart3: formatHsl(hue, Math.min(saturation * 0.15, 24), 37),
    chart4: formatHsl(hue, Math.min(saturation * 0.15, 66), 74),
    chart5: formatHsl(hue, Math.min(saturation * 0.15, 67), 87),
  };
}

/**
 * Generate theme using all three brand colors (primary, secondary, accent)
 * with proper contrast-based foregrounds and default theme colors for other properties
 */
export function generateThemeFromBrandColors(
  primaryHex: string,
  secondaryHex: string,
  accentHex: string,
  isLightTheme: boolean
) {
  // Convert colors to HSL for manipulation
  const primaryHsl = parseHslString(hexToHsl(primaryHex));
  const secondaryHsl = parseHslString(hexToHsl(secondaryHex));
  const accentHsl = parseHslString(hexToHsl(accentHex));

  // Generate optimal foregrounds based on contrast
  const primaryForeground = generateOptimalForeground(
    primaryHex,
    isLightTheme,
    primaryHsl
  );
  const secondaryForeground = generateOptimalForeground(
    secondaryHex,
    isLightTheme,
    secondaryHsl
  );
  const accentForeground = generateOptimalForeground(
    accentHex,
    isLightTheme,
    accentHsl
  );

  if (isLightTheme) {
    return {
      // Use default light theme colors for base elements
      background: "0 0% 100%",
      foreground: "240 5.9% 10%",
      muted: "60 9% 98%",
      mutedForeground: "240 3.83% 46.08%",
      popover: "0 0% 100%",
      popoverForeground: "240 5.9% 10%",
      border: "240 4.8% 95.9%",
      input: "240 4.8% 95.9%",
      card: "0 0% 100%",
      cardForeground: "240 5.9% 10%",
      destructive: "346.84 77.17% 49.8%",
      destructiveForeground: "355.71 100% 97.25%",
      ring: "240 4.8% 95.9%",
      chart1: "12 76% 61%",
      chart2: "173 58% 39%",
      chart3: "197 37% 24%",
      chart4: "43 74% 66%",
      chart5: "27 87% 67%",

      // Use brand colors with generated foregrounds
      primary: formatHsl(primaryHsl.h, primaryHsl.s, primaryHsl.l),
      primaryForeground,
      secondary: formatHsl(secondaryHsl.h, secondaryHsl.s, secondaryHsl.l),
      secondaryForeground,
      accent: formatHsl(accentHsl.h, accentHsl.s, accentHsl.l),
      accentForeground,
    };
  }

  // Dark theme
  return {
    // Use default dark theme colors for base elements
    background: "240 5.9% 10%",
    foreground: "0 0% 100%",
    muted: "240 3.45% 11.37%",
    mutedForeground: "240 5.03% 64.9%",
    popover: "240 5.9% 10%",
    popoverForeground: "0 0% 100%",
    border: "240 3.7% 15.88%",
    input: "240 3.7% 15.88%",
    card: "240 5.9% 10%",
    cardForeground: "0 0% 100%",
    destructive: "346.84 77.17% 49.8%",
    destructiveForeground: "355.71 100% 97.25%",
    ring: "240 3.7% 15.88%",
    chart1: "220 70% 50%",
    chart2: "160 60% 45%",
    chart3: "30 80% 55%",
    chart4: "280 65% 60%",
    chart5: "340 75% 55%",

    // Use brand colors with generated foregrounds
    // Ensure minimum lightness for dark theme visibility
    primary: formatHsl(primaryHsl.h, primaryHsl.s, Math.max(primaryHsl.l, 45)),
    primaryForeground,
    secondary: formatHsl(
      secondaryHsl.h,
      secondaryHsl.s,
      Math.max(secondaryHsl.l, 45)
    ),
    secondaryForeground,
    accent: formatHsl(accentHsl.h, accentHsl.s, Math.max(accentHsl.l, 45)),
    accentForeground,
  };
}

interface ScrapedPage {
  url: string;
  markdown: string;
  title: string;
  success: boolean;
  error?: string;
  contentLength?: number;
}

/**
 * Extracts headquarters contact information from content using enhanced patterns
 * Prioritizes main business contact info over location-specific pages
 */
export function extractHeadquartersContact(
  content: string,
  pages: ScrapedPage[]
): { phone?: string; email?: string; address?: string } {
  const contactInfo: { phone?: string; email?: string; address?: string } = {};

  // Prioritize homepage and contact/about pages for headquarters info
  const priorityContent = pages
    .filter(
      (page) =>
        page.url.includes("contact") ||
        page.url.includes("about") ||
        page.title.toLowerCase().includes("contact") ||
        page.title.toLowerCase().includes("about")
    )
    .map((page) => page.markdown)
    .join("\n\n");

  const searchContent = priorityContent || content;

  // Enhanced phone number extraction (prioritize main/headquarters numbers)
  const phonePatterns = [
    /(?:headquarters|main|office|general)[:\s]*(?:phone|tel|call)[:\s]*([+]?[\d\s\-\(\)\.]{10,})/gi,
    /(?:phone|tel|call|contact)[:\s]*([+]?[\d\s\-\(\)\.]{10,})/gi,
    /([+]?1?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{4})/g, // US format priority
  ];

  // Enhanced email extraction (prioritize business emails)
  const emailPatterns = [
    /(?:info|contact|hello|support|admin|sales)@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    /(?:email|mail|contact)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  ];

  // Enhanced address extraction (look for headquarters/main office)
  const addressPatterns = [
    /(?:headquarters|main office|office|address)[:\s]*([^\\n]+(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|suite|ste)[^\\n]*)/gi,
    /(\d+\s+[^\\n]*(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln)[^\\n]*)/gi,
  ];

  // Extract phone with priority scoring
  for (const pattern of phonePatterns) {
    const matches = searchContent.match(pattern);
    if (matches) {
      for (const match of matches) {
        const cleanPhone = match.replace(/[^+\d\s\-\(\)]/g, "").trim();
        if (cleanPhone.length >= 10) {
          contactInfo.phone = cleanPhone;
          break;
        }
      }
      if (contactInfo.phone) break;
    }
  }

  // Extract email with business priority
  for (const pattern of emailPatterns) {
    const matches = searchContent.match(pattern);
    if (matches) {
      // Prioritize business-focused emails
      const businessEmails = matches.filter((email) =>
        /(?:info|contact|hello|support|admin|sales)@/i.test(email)
      );
      if (businessEmails.length > 0) {
        contactInfo.email = businessEmails[0].toLowerCase().trim();
      } else {
        contactInfo.email = matches[0].toLowerCase().trim();
      }
      break;
    }
  }

  // Extract headquarters address
  for (const pattern of addressPatterns) {
    const matches = searchContent.match(pattern);
    if (matches) {
      contactInfo.address = matches[0]
        .trim()
        .replace(/\s+/g, " ")
        .replace(/^(headquarters|main office|office|address)[:\s]*/i, "");
      break;
    }
  }

  return contactInfo;
}

/**
 * Enhanced social media links extraction with better patterns and deduplication
 */
export function extractSocialLinks(
  content: string
): Array<{ platform: string; handle: string; url: string }> {
  const socialPlatforms = [
    "facebook",
    "instagram",
    "twitter",
    "linkedin",
    "youtube",
    "tiktok",
    "pinterest",
    "snapchat",
    "reddit",
    "discord",
    "twitch",
    "dribbble",
    "github",
    "gitlab",
    "medium",
    "devto",
    "hashnode",
    "stackoverflow",
  ];

  const socialLinks: Array<{ platform: string; handle: string; url: string }> =
    [];
  const foundUrls = new Set<string>();
  const foundHandles = new Map<string, string>(); // platform -> handle to prevent duplicates

  // Extract from content using enhanced URL patterns
  if (content) {
    for (const platform of socialPlatforms) {
      const patterns = getEnhancedPlatformPatterns(platform);

      for (const pattern of patterns) {
        const matches = content.matchAll(pattern);
        const matchArray = Array.from(matches);
        for (const match of matchArray) {
          const fullUrl = match[0];
          const normalizedUrl = normalizeUrlForDeduplication(fullUrl);

          if (!foundUrls.has(normalizedUrl)) {
            const extracted = extractSocialData(fullUrl, platform);
            if (
              extracted &&
              isValidBusinessProfile(extracted.handle, platform)
            ) {
              const existingHandle = foundHandles.get(platform);
              if (
                !existingHandle ||
                isBusinessProfileBetter(
                  extracted.handle,
                  existingHandle,
                  platform
                )
              ) {
                // Remove previous entry for this platform if exists
                const existingIndex = socialLinks.findIndex(
                  (s) => s.platform === platform
                );
                if (existingIndex >= 0) {
                  socialLinks.splice(existingIndex, 1);
                }

                socialLinks.push({
                  platform: extracted.platform,
                  handle: extracted.handle,
                  url: extracted.url,
                });
                foundUrls.add(normalizedUrl);
                foundHandles.set(platform, extracted.handle);
              }
            }
          }
        }
      }
    }
  }

  return socialLinks.filter((link) => link.handle && link.url);
}

/**
 * Get enhanced platform-specific URL patterns
 */
function getEnhancedPlatformPatterns(platform: string): RegExp[] {
  const basePatterns = [
    new RegExp(`https?://(?:www\\.)?${platform}\\.com/([\\w\\.\\-/]+)`, "gi"),
    new RegExp(`https?://${platform}\\.com/([\\w\\.\\-/]+)`, "gi"),
  ];

  // Platform-specific patterns
  switch (platform) {
    case "linkedin":
      return [
        /https?:\/\/(?:www\.)?linkedin\.com\/(company|in)\/([^\/?\s]+)/gi,
        /https?:\/\/linkedin\.com\/(company|in)\/([^\/?\s]+)/gi,
      ];
    case "twitter":
      return [
        /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([^\/?\s]+)/gi,
        /https?:\/\/(?:twitter|x)\.com\/([^\/?\s]+)/gi,
      ];
    case "facebook":
      return [
        /https?:\/\/(?:www\.)?facebook\.com\/([^\/?\s]+)/gi,
        /https?:\/\/facebook\.com\/([^\/?\s]+)/gi,
        /https?:\/\/(?:www\.)?fb\.com\/([^\/?\s]+)/gi,
      ];
    case "instagram":
      return [
        /https?:\/\/(?:www\.)?instagram\.com\/([^\/?\s]+)/gi,
        /https?:\/\/instagram\.com\/([^\/?\s]+)/gi,
      ];
    default:
      return basePatterns;
  }
}

/**
 * Extract and normalize social media data from URL
 */
function extractSocialData(
  url: string,
  platform: string
): { platform: string; handle: string; url: string } | null {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    let handle = "";
    let cleanUrl = url;

    // Platform-specific extraction
    switch (platform) {
      case "linkedin": {
        const linkedinMatch = url.match(
          /linkedin\.com\/(company|in)\/([^\/?\s]+)/i
        );
        if (linkedinMatch) {
          const type = linkedinMatch[1];
          const username = linkedinMatch[2];
          handle = `${type}/${username}`;
          cleanUrl = `https://www.linkedin.com/${type}/${username}`;
        }
        break;
      }

      case "twitter": {
        const twitterMatch = url.match(/(?:twitter|x)\.com\/([^\/?\s]+)/i);
        if (twitterMatch) {
          handle = twitterMatch[1];
          cleanUrl = `https://twitter.com/${handle}`;
        }
        break;
      }

      case "facebook": {
        const facebookMatch = url.match(/(?:facebook|fb)\.com\/([^\/?\s]+)/i);
        if (facebookMatch) {
          handle = facebookMatch[1];
          cleanUrl = `https://www.facebook.com/${handle}`;
        }
        break;
      }

      default: {
        const pathname = urlObj.pathname.replace(/^\//, "").replace(/\/$/, "");
        handle = pathname.split("/")[0];
        cleanUrl = `https://www.${platform}.com/${handle}`;
      }
    }

    if (!handle || handle.length < 2) return null;

    return { platform, handle, url: cleanUrl };
  } catch {
    return null;
  }
}

/**
 * Check if a social profile handle represents a valid business profile
 */
function isValidBusinessProfile(handle: string, platform: string): boolean {
  if (!handle || handle.length < 2) return false;

  // Filter out common non-business patterns
  const invalidPatterns = [
    /^(home|index|about|contact|login|signin|signup|register|404|error)$/i,
    /^(page|post|article|blog|news|search|category)s?$/i,
    /^(admin|user|profile|account|settings|help|support)$/i,
    /^\d+$/, // Only numbers
    /^[^a-zA-Z0-9]/, // Starts with special character
    /[<>{}[\]\\|`^]/, // Contains invalid characters
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(handle)) return false;
  }

  // Platform-specific validation
  if (platform === "linkedin") {
    // For LinkedIn, prefer company profiles over personal
    return handle.includes("company/") || handle.includes("in/");
  }

  return true;
}

/**
 * Determine if one business profile is better than another for the same platform
 */
function isBusinessProfileBetter(
  newHandle: string,
  existingHandle: string,
  platform: string
): boolean {
  if (platform === "linkedin") {
    // Prefer company profiles over personal profiles
    if (
      newHandle.includes("company/") &&
      !existingHandle.includes("company/")
    ) {
      return true;
    }
    if (
      existingHandle.includes("company/") &&
      !newHandle.includes("company/")
    ) {
      return false;
    }
  }

  // Prefer shorter, cleaner handles (usually official accounts)
  if (newHandle.length < existingHandle.length && newHandle.length > 2) {
    return true;
  }

  return false;
}

/**
 * Normalize URL for deduplication purposes
 */
function normalizeUrlForDeduplication(url: string): string {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    // Remove www, trailing slash, query params, fragments
    const hostname = urlObj.hostname.replace(/^www\./, "");
    const pathname = urlObj.pathname.replace(/\/$/, "");
    return `${hostname}${pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
