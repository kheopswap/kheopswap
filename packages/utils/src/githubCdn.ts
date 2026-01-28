/**
 * Converts a raw GitHub URL to a Statically CDN URL
 * Statically CDN provides faster delivery and caching for GitHub files
 *
 * @param rawUrl - Original raw.githubusercontent.com URL
 * @returns Statically CDN URL
 */
export const toStaticallyCdnUrl = (rawUrl: string): string | null => {
	// Match raw.githubusercontent.com URLs
	// Format: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
	const match = rawUrl.match(
		/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
	);

	if (!match) return null;

	const [, owner, repo, branch, path] = match;
	return `https://cdn.statically.io/gh/${owner}/${repo}/${branch}/${path}`;
};

/**
 * Check if a URL is a raw GitHub URL that can be converted to Statically
 */
export const isRawGitHubUrl = (url: string): boolean => {
	return url.startsWith("https://raw.githubusercontent.com/");
};
