import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Allowed CDN hosts that support Cloudflare image transformations
 */
const CDN_HOSTS = ["cdn-dev.getfirebuzz.com", "cdn.getfirebuzz.com"];

export type StaticImport = {
	src: string;
	height?: number;
	width?: number;
	blurDataURL?: string;
};

export type ImageLoader = (resolverProps: ImageLoaderProps) => string;

export type ImageLoaderProps = {
	src: string;
	width: number;
	quality?: number;
};

type PlaceholderValue = "blur" | "empty" | "data:image/..." | null;

type OnLoadingComplete = (result: {
	naturalWidth: number;
	naturalHeight: number;
}) => void;

type ObjectFit = "contain" | "cover" | "fill" | "none" | "scale-down";
type ObjectPosition = string;

export interface ImageProps
	extends Omit<
		React.DetailedHTMLProps<
			React.ImgHTMLAttributes<HTMLImageElement>,
			HTMLImageElement
		>,
		"height" | "width" | "loading" | "ref" | "alt" | "src" | "srcSet"
	> {
	src: string | StaticImport;
	alt: string;
	width?: number | `${number}`;
	height?: number | `${number}`;
	fill?: boolean;
	loader?: ImageLoader;
	quality?: number | `${number}`;
	priority?: boolean;
	loading?: "eager" | "lazy";
	placeholder?: PlaceholderValue;
	blurDataURL?: string;
	unoptimized?: boolean;
	onLoadingComplete?: OnLoadingComplete;
	sizes?: string;
	style?: React.CSSProperties;
	className?: string;
	/**
	 * @deprecated Use styles.objectFit instead
	 */
	objectFit?: ObjectFit;
	/**
	 * @deprecated Use styles.objectPosition instead
	 */
	objectPosition?: ObjectPosition;
}

/**
 * Normalizes image source URL and determines if it can be transformed via CDN
 * @param src - Image source URL (relative or absolute)
 * @returns Object with normalized path and canTransform flag
 */
const normalizeSrc = (
	src: string,
): { path: string; canTransform: boolean; cdnHost: string } => {
	// Check if already wrapped with cdn-cgi/image to avoid double-wrapping
	if (src.includes("/cdn-cgi/image/")) {
		console.warn(
			`Image src already contains cdn-cgi/image prefix, using as-is: ${src}`,
		);
		return { path: src, canTransform: false, cdnHost: CDN_HOSTS[0] };
	}

	// Check if absolute URL
	if (/^https?:\/\//.test(src)) {
		try {
			const url = new URL(src);

			// Check if hostname matches allowed CDN hosts
			const matchedHost = CDN_HOSTS.find((host) => url.hostname === host);
			if (matchedHost) {
				// Remove leading slash from pathname for CDN transform URL
				const path = url.pathname.startsWith("/")
					? url.pathname.slice(1)
					: url.pathname;
				return {
					path: `${path}${url.search}${url.hash}`,
					canTransform: true,
					cdnHost: matchedHost,
				};
			}

			// External URL - cannot transform
			console.warn(
				`External image URL cannot be transformed via CDN: ${url.hostname}`,
			);
			return { path: src, canTransform: false, cdnHost: CDN_HOSTS[0] };
		} catch (error) {
			console.warn(`Failed to parse image URL: ${src}`, error);
			return { path: src, canTransform: false, cdnHost: CDN_HOSTS[0] };
		}
	}

	// Relative path - can transform
	const path = src.startsWith("/") ? src.slice(1) : src;
	return { path, canTransform: true, cdnHost: CDN_HOSTS[0] };
};

/**
 * Default Cloudflare image loader
 * Returns original src for external/non-transformable URLs
 */
const defaultLoader: ImageLoader = ({
	src,
	width,
	quality = 80,
}: ImageLoaderProps) => {
	const { path, canTransform, cdnHost } = normalizeSrc(src);

	// If URL cannot be transformed, return as-is
	if (!canTransform) {
		return path;
	}

	// Build transformation parameters
	const params: string[] = [];

	if (width) {
		params.push(`width=${width}`);
	}

	params.push(`quality=${quality}`);

	// Default to auto format for best optimization
	params.push("format=auto");

	const paramsString = params.join(",");
	return `https://${cdnHost}/cdn-cgi/image/${paramsString}/${path}`;
};

/**
 * Cloudflare blur image loader
 * Returns original src for external/non-transformable URLs
 */
const blurLoader = ({
	src,
	width,
	quality = 10,
	blur = 50,
}: ImageLoaderProps & { blur?: number }) => {
	const { path, canTransform, cdnHost } = normalizeSrc(src);

	// If URL cannot be transformed, return as-is
	if (!canTransform) {
		return path;
	}

	// Build transformation parameters
	const params: string[] = [];

	if (width) {
		params.push(`width=${width}`);
	}

	params.push(`quality=${quality}`);

	if (blur) {
		params.push(`blur=${blur}`);
	}

	// Default to auto format for best optimization
	params.push("format=auto");

	const paramsString = params.join(",");
	return `https://${cdnHost}/cdn-cgi/image/${paramsString}/${path}`;
};

/**
 * Image component optimized for Cloudflare Images, matching Next.js Image API.
 * Uses Cloudflare's image transformation API to optimize and resize images.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Image src="/images/hero.jpg" alt="Hero image" width={800} height={600} />
 *
 * // With blur placeholder
 * <Image
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   width={800}
 *   height={600}
 *   placeholder="blur"
 *   blurDataURL="/images/hero.jpg"
 * />
 *
 * // Fill container
 * <div style={{ position: 'relative', width: '100%', height: '300px' }}>
 *   <Image src="/images/hero.jpg" alt="Hero image" fill sizes="100vw" />
 * </div>
 * ```
 */
const Image = React.forwardRef<HTMLImageElement | null, ImageProps>(
	(
		{
			src: srcProp,
			alt,
			width: widthProp,
			height: heightProp,
			fill,
			loader = defaultLoader,
			quality = 80,
			priority,
			loading = "lazy",
			placeholder,
			blurDataURL,
			unoptimized,
			onLoadingComplete,
			sizes = "100vw",
			className,
			style: styleProp,
			objectFit,
			objectPosition,
			...props
		},
		ref,
	) => {
		const [isLoaded, setIsLoaded] = React.useState(false);
		const [hasError, setHasError] = React.useState(false);
		const loadTimeoutRef = React.useRef<NodeJS.Timeout>();

		// Handle src being either string or StaticImport
		const src = typeof srcProp === "object" ? srcProp.src : srcProp;

		// Detect if source is SVG - SVGs should not be transformed
		const isSvg = src.toLowerCase().endsWith(".svg");

		// SVGs should always be unoptimized (no transformation)
		const shouldOptimize = !unoptimized && !isSvg;

		// Force image to show after 3 seconds even if onLoad hasn't fired
		// This prevents invisible images due to CDN transformation delays or onLoad issues
		React.useEffect(() => {
			loadTimeoutRef.current = setTimeout(() => {
				if (!isLoaded && !hasError) {
					console.warn(`Image load timeout, forcing visibility: ${src}`);
					setIsLoaded(true);
				}
			}, 3000);

			return () => {
				if (loadTimeoutRef.current) {
					clearTimeout(loadTimeoutRef.current);
				}
			};
		}, [src, isLoaded, hasError]);

		// Parse width and height to number if they're string
		const width =
			typeof widthProp === "string"
				? Number.parseInt(widthProp, 10)
				: widthProp;
		const height =
			typeof heightProp === "string"
				? Number.parseInt(heightProp, 10)
				: heightProp;

		// Set layout styles
		let style: React.CSSProperties = {
			...styleProp,
		};

		if (fill) {
			style = {
				position: "absolute",
				height: "100%",
				width: "100%",
				left: 0,
				top: 0,
				right: 0,
				bottom: 0,
				objectFit: objectFit || "cover",
				objectPosition: objectPosition || "center",
				...style,
			};
		} else {
			if (objectFit) {
				style = { ...style, objectFit };
			}
			if (objectPosition) {
				style = { ...style, objectPosition };
			}
		}

		// Handle quality prop normalization
		const qualityNum =
			typeof quality === "string" ? Number.parseInt(quality, 10) : quality;

		// Default width for quality if not specified (especially for fill mode)
		const defaultWidth = fill && !width ? 1920 : width || 800;

		// Check if source can be transformed for srcSet generation
		const { canTransform } = normalizeSrc(src);

		// For responsive images, create srcSet with multiple sizes
		// Only generate srcSet for transformable images
		const generateSizes = [0.25, 0.5, 0.75, 1, 2];
		const srcSet =
			!unoptimized && defaultWidth && canTransform
				? generateSizes
						.map((scale) => {
							const scaledWidth = Math.round(defaultWidth * scale);
							// Don't generate sizes larger than original or less than 40px
							if (
								scaledWidth < 40 ||
								(defaultWidth && scaledWidth > defaultWidth * 4)
							) {
								return "";
							}
							return `${loader({
								src,
								width: scaledWidth,
								quality: qualityNum,
							})} ${scaledWidth}w`;
						})
						.filter(Boolean)
						.join(", ")
				: undefined;

		// Generate blur placeholder if needed
		// Only use blur for transformable images to avoid double-transforming external URLs
		// SVGs should never use blur placeholder
		const shouldUseBlurPlaceholder =
			placeholder === "blur" && (blurDataURL || src) && canTransform && !isSvg;
		const placeholderSrc =
			blurDataURL || (shouldUseBlurPlaceholder ? src : undefined);
		const placeholderUrl =
			shouldUseBlurPlaceholder && placeholderSrc
				? blurLoader({
						src: placeholderSrc,
						width: Number(defaultWidth),
						quality: 10,
						blur: 50,
					})
				: undefined;

		// Handle image load
		const handleImageLoad = (
			e: React.SyntheticEvent<HTMLImageElement, Event>,
		) => {
			if (loadTimeoutRef.current) {
				clearTimeout(loadTimeoutRef.current);
			}
			setIsLoaded(true);
			setHasError(false);
			if (onLoadingComplete) {
				const img = e.currentTarget;
				onLoadingComplete({
					naturalWidth: img.naturalWidth,
					naturalHeight: img.naturalHeight,
				});
			}
		};

		// Handle image error
		const handleImageError = (
			e: React.SyntheticEvent<HTMLImageElement, Event>,
		) => {
			console.error(`Failed to load image: ${src}`, e);
			setHasError(true);
			// Show image anyway on error to avoid invisible broken images
			setIsLoaded(true);
		};

		const imgAttributes = {
			src: shouldOptimize
				? loader({ src, width: defaultWidth, quality: qualityNum })
				: src,
			srcSet: shouldOptimize ? srcSet : undefined,
			sizes: shouldOptimize ? sizes : undefined,
			width,
			height,
			loading: priority ? "eager" : loading,
			decoding: isSvg ? ("sync" as const) : ("async" as const),
			style,
		};

		return (
			<div
				className={cn(
					"relative inline-block",
					fill && "w-full h-full",
					className,
				)}
				style={fill ? { position: "relative" } : undefined}
			>
				{shouldUseBlurPlaceholder && (
					<img
						aria-hidden="true"
						src={placeholderUrl}
						alt=""
						className="absolute inset-0 object-cover w-full h-full transition-opacity duration-500 ease-in-out"
						style={{
							opacity: isLoaded ? 0 : 1,
							transitionDelay: "500ms",
						}}
					/>
				)}
				<img
					{...props}
					{...imgAttributes}
					ref={ref}
					alt={alt ?? "No alt text provided"}
					onLoad={handleImageLoad}
					onError={handleImageError}
					className={cn(
						"transition-opacity",
						isLoaded ? "opacity-100" : "opacity-0",
					)}
				/>
			</div>
		);
	},
);

Image.displayName = "Image";

export { Image };
