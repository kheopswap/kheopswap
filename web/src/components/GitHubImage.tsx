import { isRawGitHubUrl, toStaticallyCdnUrl } from "@kheopswap/utils";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";

type GitHubImageProps = Omit<
	React.ImgHTMLAttributes<HTMLImageElement>,
	"src"
> & {
	src: string;
	fallbackSrc?: string;
	alt: string;
};

/**
 * Strip query parameters from URL (e.g., ?rounded used for styling hints)
 */
const stripQueryParams = (url: string): string => url.split("?")[0] ?? url;

/**
 * Image component that loads GitHub images via Statically CDN with fallback
 * - For raw.githubusercontent.com URLs: tries Statically CDN first, falls back to raw GitHub
 * - For other URLs: loads directly with optional fallback
 */
export const GitHubImage: FC<GitHubImageProps> = ({
	src,
	alt,
	fallbackSrc = "/img/tokens/unknown.svg",
	onError,
	...props
}) => {
	const [useFallback, setUseFallback] = useState(false);
	const [useCdn, setUseCdn] = useState(true);

	// Reset state when src changes - src IS needed as dependency to reset on new images
	// biome-ignore lint/correctness/useExhaustiveDependencies: src is intentionally a dependency to reset state
	useEffect(() => {
		setUseFallback(false);
		setUseCdn(true);
	}, [src]);

	// Strip query params for actual URL fetching (CDN doesn't support them)
	const cleanSrc = useMemo(() => stripQueryParams(src), [src]);

	const cdnUrl = useMemo(() => {
		if (!isRawGitHubUrl(cleanSrc)) return null;
		return toStaticallyCdnUrl(cleanSrc);
	}, [cleanSrc]);

	const currentSrc = useMemo(() => {
		if (useFallback) return fallbackSrc;
		if (cdnUrl && useCdn) return cdnUrl;
		return cleanSrc;
	}, [useFallback, cdnUrl, useCdn, cleanSrc, fallbackSrc]);

	const handleError = useCallback(
		(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
			// If CDN failed, try raw GitHub
			if (cdnUrl && useCdn) {
				setUseCdn(false);
				return;
			}
			// If raw GitHub failed (or no CDN), use fallback
			if (!useFallback) {
				setUseFallback(true);
				return;
			}
			// If fallback also failed, call original onError
			onError?.(e);
		},
		[cdnUrl, useCdn, useFallback, onError],
	);

	return <img {...props} src={currentSrc} alt={alt} onError={handleError} />;
};
