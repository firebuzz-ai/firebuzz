import * as React from "react";
import { cn } from "@/lib/utils";

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

const normalizeSrc = (src: string) => {
	return src.startsWith("/") ? src.slice(1) : src;
};

/**
 * Default Cloudflare image loader
 */
const defaultLoader: ImageLoader = ({
	src,
	width,
	quality = 80,
}: ImageLoaderProps) => {
	const params: string[] = [];

	if (width) {
		params.push(`width=${width}`);
	}

	params.push(`quality=${quality}`);

	// Default to auto format for best optimization
	params.push("format=auto");

	const paramsString = params.join(",");
	return `https://cdn-dev.getfirebuzz.com/cdn-cgi/image/${paramsString}/${normalizeSrc(src)}`;
};

/**
 * Cloudflare blur image loader
 */
const blurLoader = ({
	src,
	width,
	quality = 10,
	blur = 50,
}: ImageLoaderProps & { blur?: number }) => {
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
	return `https://cdn-dev.getfirebuzz.com/cdn-cgi/image/${paramsString}/${normalizeSrc(src)}`;
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

		// Handle src being either string or StaticImport
		const src = typeof srcProp === "object" ? srcProp.src : srcProp;

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

		// For responsive images, create srcSet with multiple sizes
		const generateSizes = [0.25, 0.5, 0.75, 1, 2];
		const srcSet =
			!unoptimized && defaultWidth
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
		const shouldUseBlurPlaceholder =
			placeholder === "blur" && (blurDataURL || src);
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
			setIsLoaded(true);
			if (onLoadingComplete) {
				const img = e.currentTarget;
				onLoadingComplete({
					naturalWidth: img.naturalWidth,
					naturalHeight: img.naturalHeight,
				});
			}
		};

		const imgAttributes = {
			src: unoptimized
				? src
				: loader({ src, width: defaultWidth, quality: qualityNum }),
			srcSet: unoptimized ? undefined : srcSet,
			sizes: !unoptimized ? sizes : undefined,
			width,
			height,
			loading: priority ? "eager" : loading,
			decoding: "async" as const,
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
