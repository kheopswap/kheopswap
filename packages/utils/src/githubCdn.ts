/**
 * Converts a raw GitHub URL to a Statically CDN URL
 * Statically CDN provides faster delivery and caching for GitHub files
 * Only works for main branch - other branches go directly to raw.githubusercontent.com
 *
 * @param rawUrl - Original raw.githubusercontent.com URL
 * @returns Statically CDN URL (only for main branch), or null
 */
export const toStaticallyCdnUrl = (rawUrl: string): string | null => {
	// Strip query parameters before processing (e.g., ?rounded used for styling hints)
	const urlWithoutQuery = rawUrl.split("?")[0] ?? rawUrl;

	// Match raw.githubusercontent.com URLs
	// Format: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
	const match = urlWithoutQuery.match(
		/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
	);

	if (!match) return null;

	const [, owner, repo, branch, path] = match;

	// Only use Statically CDN for main branch - it has better caching
	// Non-main branches go directly to raw.githubusercontent.com
	if (branch !== "main") return null;

	return `https://cdn.statically.io/gh/${owner}/${repo}@${branch}/${path}`;
};

/**
 * Check if a URL is a raw GitHub URL that can be converted to Statically
 */
export const isRawGitHubUrl = (url: string): boolean => {
	return url.startsWith("https://raw.githubusercontent.com/");
};
