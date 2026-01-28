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

	const cdnUrl = useMemo(() => {
		if (!isRawGitHubUrl(src)) return null;
		return toStaticallyCdnUrl(src);
	}, [src]);

	const currentSrc = useMemo(() => {
		if (useFallback) return fallbackSrc;
		if (cdnUrl && useCdn) return cdnUrl;
		return src;
	}, [useFallback, cdnUrl, useCdn, src, fallbackSrc]);

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
