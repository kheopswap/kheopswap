/**
 * Standalone Node.js script to fetch all tokens from Asset Hub chains via RPC
 * and write one JSON file per chain to src/registry/tokens/generated/.
 *
 * Each output file is a flat token array with deterministic `id` fields,
 * sorted lexicographically by `id`.
 *
 * Generated files (`tokens.<networkId>.json`) are read-only snapshots and
 * must not be edited manually. Manual changes belong in tokens-overrides.json
 * and must target tokens by exact `id`.
 *
 * Ethereum-origin foreign assets (Snowbridge) are enriched by calling the
 * ERC20 contract's name(), symbol() and decimals() via a public Ethereum
 * RPC. Results are cached in scripts/erc20-cache.json and refreshed at most
 * monthly.
 *
 * Run from the repository root:
 *   node --run fetch-tokens
 *   node --run fetch-tokens -- --chains pah,kah
 *   node --run fetch-tokens -- --timeout 60000
 *
 * Or directly from the web/ folder:
 *   node --experimental-transform-types scripts/fetch-tokens.ts
 */

import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { kah, pah, pasah, wah } from "@polkadot-api/descriptors";
import lzs from "lz-string";
import { createClient, type PolkadotClient, type TypedApi } from "polkadot-api";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider";
import { firstValueFrom } from "rxjs";
import sharp from "sharp";
import { createSufficientMap } from "../src/registry/tokens/mappers/createSufficientMap.ts";
import { isEthereumOriginLocation } from "../src/registry/tokens/mappers/isEthereumOriginLocation.ts";
import { mapAssetTokensFromEntries } from "../src/registry/tokens/mappers/mapAssetTokensFromEntries.ts";
import { mapForeignAssetTokensFromEntries } from "../src/registry/tokens/mappers/mapForeignAssetTokensFromEntries.ts";
import { mapPoolAssetTokensFromEntries } from "../src/registry/tokens/mappers/mapPoolAssetTokensFromEntries.ts";

// ---------------------------------------------------------------------------
// Chain & descriptor config
// ---------------------------------------------------------------------------

const DESCRIPTORS_BY_CHAIN = {
	pah,
	kah,
	wah,
	pasah,
} as const;

type ChainId = keyof typeof DESCRIPTORS_BY_CHAIN;

type RegistryChain = {
	id: string;
	name: string;
	wsUrl: string[];
};

type ChainConfig = {
	id: ChainId;
	name: string;
	wsUrl: string[];
	descriptors: (typeof DESCRIPTORS_BY_CHAIN)[ChainId];
};

const CHAINS = (
	JSON.parse(
		readFileSync(
			resolve(import.meta.dirname, "../src/registry/chains/chains.prod.json"),
			"utf-8",
		),
	) as RegistryChain[]
)
	.filter(
		(chain): chain is RegistryChain & { id: ChainId } =>
			chain.id in DESCRIPTORS_BY_CHAIN,
	)
	.map((chain) => ({
		id: chain.id,
		name: chain.name,
		wsUrl: chain.wsUrl,
		descriptors: DESCRIPTORS_BY_CHAIN[chain.id],
	}));

/** Output directory – tokens land next to the registry source files. */
const OUTPUT_DIR = resolve(
	import.meta.dirname,
	"../src/registry/tokens/generated",
);

/** ERC20 metadata cache file path (committed to repo). */
const ERC20_CACHE_PATH = resolve(import.meta.dirname, "erc20-cache.json");

/** Downloaded CoinGecko logo directory (under web/public). */
const COINGECKO_LOGO_DIR_ABS = resolve(
	import.meta.dirname,
	"../public/img/tokens/coingecko",
);
const COINGECKO_LOGO_DIR_REL = "/img/tokens/coingecko";

/** Re-fetch ERC20 metadata only when the cached entry is older than this. */
const ERC20_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Public Ethereum JSON-RPC endpoints (tried in order). */
const ETHEREUM_RPC_URLS = [
	"https://ethereum-rpc.publicnode.com",
	"https://eth.drpc.org",
	"https://rpc.ankr.com/eth",
];

/** Maximum time to wait for client shutdown before continuing. */
const CLIENT_DESTROY_TIMEOUT_MS = 10_000;

/** Maximum time to wait for Discord webhook notification requests. */
const DISCORD_NOTIFY_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// JSON serialization helpers (handles bigint + Binary)
//
// Must match the app's safeStringify so that token IDs (which embed
// lz-string–compressed JSON of the location) are identical.
// ---------------------------------------------------------------------------

const safeStringify = (value: unknown): string => {
	if (!value) return value?.toString() ?? "";
	return JSON.stringify(value, (_, v) => {
		if (typeof v === "bigint") return `bigint:${v.toString()}`;
		if (v && typeof v === "object" && typeof v.asHex === "function")
			return `binary:${v.asHex()}`;
		return v;
	});
};

/**
 * Top-level JSON replacer for writing files.
 * Same rules as safeStringify so location objects round-trip correctly.
 */
const jsonReplacer = (_key: string, value: unknown) => {
	if (typeof value === "bigint") return `bigint:${value.toString()}`;
	if (
		value &&
		typeof value === "object" &&
		typeof (value as { asHex?: unknown }).asHex === "function"
	)
		return `binary:${(value as { asHex: () => string }).asHex()}`;
	return value;
};

// ---------------------------------------------------------------------------
// TokenNoId shapes (mirrors the app's types, minus `id`)
// ---------------------------------------------------------------------------

// biome-ignore lint/suspicious/noExplicitAny: union of all token shapes used only for serialisation
type TokenNoId = Record<string, any>;

// ---------------------------------------------------------------------------
// ERC20 RPC + CoinGecko cache & enrichment
// ---------------------------------------------------------------------------

interface Erc20CacheEntry {
	fetchedAt: string;
	tokenName: string;
	symbol: string;
	decimals: number;
	coingeckoId?: string;
	image?: string;
}

type Erc20Cache = Record<string, Erc20CacheEntry>;

function loadErc20Cache(): Erc20Cache {
	try {
		if (existsSync(ERC20_CACHE_PATH)) {
			return JSON.parse(readFileSync(ERC20_CACHE_PATH, "utf-8"));
		}
	} catch (err) {
		console.warn(
			"  [erc20] Failed to load cache, starting fresh:",
			err instanceof Error ? err.message : err,
		);
	}
	return {};
}

function saveErc20Cache(cache: Erc20Cache): void {
	const sorted = Object.fromEntries(
		Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)),
	);
	writeFileSync(
		ERC20_CACHE_PATH,
		`${JSON.stringify(sorted, null, "\t")}\n`,
		"utf-8",
	);
}

/**
 * Extract the hex contract address from an Ethereum-origin foreign asset.
 * The address is stored as `"binary:0x..."` after JSON serialization, but at
 * this point the value is still a PAPI Binary instance or a raw string.
 */
function getContractAddress(token: TokenNoId): string | null {
	try {
		const key = token.location.interior.value[1].value.key;
		// key may be a PAPI Binary with asHex(), or a pre-serialized "binary:0x…" string
		const hex: string =
			typeof key === "string"
				? key.replace(/^binary:/, "")
				: typeof key?.asHex === "function"
					? key.asHex()
					: "";
		return hex?.startsWith("0x") ? hex.toLowerCase() : null;
	} catch {
		return null;
	}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function destroyClient(
	client: PolkadotClient | undefined,
	chainId: string,
): Promise<void> {
	if (!client) return;

	try {
		await Promise.race([
			Promise.resolve(client.destroy()),
			sleep(CLIENT_DESTROY_TIMEOUT_MS),
		]);
	} catch (err) {
		console.warn(
			`  [${chainId}] Failed during client destroy:`,
			err instanceof Error ? err.message : String(err),
		);
	}
}

const truncate = (input: string, maxLength: number): string =>
	input.length <= maxLength ? input : `${input.slice(0, maxLength - 3)}...`;

const nonFatalWarnings: string[] = [];

const pushNonFatalWarning = (message: string) => {
	nonFatalWarnings.push(message);
};

async function postDiscordWebhook(
	webhookUrl: string,
	body: { content: string },
	label: "failure notification" | "warnings summary",
): Promise<void> {
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		DISCORD_NOTIFY_TIMEOUT_MS,
	);

	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: controller.signal,
		});

		if (!response.ok) {
			console.error(`[discord] Failed to send ${label} (${response.status})`);
		}
	} catch (notificationErr) {
		if (
			notificationErr instanceof Error &&
			notificationErr.name === "AbortError"
		) {
			console.error(
				`[discord] Timed out sending ${label} after ${DISCORD_NOTIFY_TIMEOUT_MS}ms`,
			);
			return;
		}

		console.error(
			`[discord] Failed to send ${label}:`,
			notificationErr instanceof Error
				? notificationErr.message
				: String(notificationErr),
		);
	} finally {
		clearTimeout(timeoutId);
	}
}

async function notifyDiscordFailure(error: unknown): Promise<void> {
	const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
	if (!webhookUrl) return;

	const message =
		error instanceof Error
			? `${error.name}: ${error.message}\n${error.stack ?? ""}`
			: String(error);
	const runUrl =
		process.env.GITHUB_SERVER_URL &&
		process.env.GITHUB_REPOSITORY &&
		process.env.GITHUB_RUN_ID
			? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
			: null;

	const body = {
		content: [
			"🚨 `pnpm fetch-tokens` failed",
			`Repository: ${process.env.GITHUB_REPOSITORY ?? "local"}`,
			runUrl ? `Run: ${runUrl}` : "Run: local",
			"```",
			truncate(message, 1500),
			"```",
		].join("\n"),
	};

	await postDiscordWebhook(webhookUrl, body, "failure notification");
}

async function notifyDiscordWarningsSummary(warnings: string[]): Promise<void> {
	const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
	if (!webhookUrl) return;
	if (warnings.length === 0) return;

	const uniqueWarnings = [...new Set(warnings)];
	const summary = uniqueWarnings.map((line) => `- ${line}`).join("\n");
	const runUrl =
		process.env.GITHUB_SERVER_URL &&
		process.env.GITHUB_REPOSITORY &&
		process.env.GITHUB_RUN_ID
			? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
			: null;

	const body = {
		content: [
			"⚠️ `pnpm fetch-tokens` completed with warnings",
			`Repository: ${process.env.GITHUB_REPOSITORY ?? "local"}`,
			runUrl ? `Run: ${runUrl}` : "Run: local",
			"```",
			truncate(summary, 1500),
			"```",
		].join("\n"),
	};

	await postDiscordWebhook(webhookUrl, body, "warnings summary");
}

function getTokenId(token: TokenNoId): string {
	switch (token.type) {
		case "native":
			return `native::${token.chainId}`;
		case "asset":
			return `asset::${token.chainId}::${token.assetId}`;
		case "pool-asset":
			return `pool-asset::${token.chainId}::${token.poolAssetId}`;
		case "foreign-asset":
			return `foreign-asset::${token.chainId}::${lzs.compressToBase64(safeStringify(token.location))}`;
		default:
			throw new Error(`Unsupported token type: ${String(token.type)}`);
	}
}

function getEthereumContractAddresses(tokens: TokenNoId[]): string[] {
	const addresses = new Set<string>();
	for (const token of tokens) {
		if (
			token.type !== "foreign-asset" ||
			!isEthereumOriginLocation(token.location)
		)
			continue;
		const addr = getContractAddress(token);
		if (addr) addresses.add(addr);
	}
	return [...addresses];
}

function sanitizeFileNamePart(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9-_]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function getCoinGeckoLogoRelativePath(coingeckoId: string): string {
	return `${COINGECKO_LOGO_DIR_REL}/${sanitizeFileNamePart(coingeckoId)}.webp`;
}

function getCoinGeckoLogoFilePath(coingeckoId: string): string {
	return resolve(
		COINGECKO_LOGO_DIR_ABS,
		`${sanitizeFileNamePart(coingeckoId)}.webp`,
	);
}

async function downloadCoinGeckoLogoAsWebp(
	coingeckoId: string,
	imageUrl: string,
): Promise<string | undefined> {
	if (!imageUrl) return undefined;
	if (!/^https?:\/\//.test(imageUrl)) return imageUrl;

	mkdirSync(COINGECKO_LOGO_DIR_ABS, { recursive: true });

	const relativePath = getCoinGeckoLogoRelativePath(coingeckoId);
	const filePath = getCoinGeckoLogoFilePath(coingeckoId);

	if (existsSync(filePath)) return relativePath;

	try {
		const response = await fetch(imageUrl);
		if (!response.ok) return undefined;

		const sourceBuffer = Buffer.from(await response.arrayBuffer());
		const webpBuffer = await sharp(sourceBuffer)
			.webp({ quality: 82 })
			.toBuffer();
		writeFileSync(filePath, webpBuffer);
		return relativePath;
	} catch {
		return undefined;
	}
}

async function migrateCachedImagesToLocal(
	cache: Erc20Cache,
	tokens: TokenNoId[],
	coingeckoApiKey: string | undefined,
): Promise<void> {
	const addresses = getEthereumContractAddresses(tokens);
	let migrated = 0;
	let copied = 0;

	for (const addr of addresses) {
		const cached = cache[addr];
		if (!cached?.image) continue;

		let coingeckoId = cached.coingeckoId;
		if (!coingeckoId) {
			const coingeckoData = await fetchCoinGeckoTokenData(
				addr,
				coingeckoApiKey,
			);
			coingeckoId = coingeckoData?.id;
			if (coingeckoId) {
				cached.coingeckoId = coingeckoId;
				cache[addr] = cached;
			}
		}

		if (!coingeckoId) continue;

		const expectedImagePath = getCoinGeckoLogoRelativePath(coingeckoId);
		if (cached.image === expectedImagePath) continue;

		if (/^https?:\/\//.test(cached.image)) {
			const localLogo = await downloadCoinGeckoLogoAsWebp(
				coingeckoId,
				cached.image,
			);
			if (!localLogo) continue;

			cache[addr] = { ...cached, image: localLogo, coingeckoId };
			migrated++;
			continue;
		}

		if (!cached.image.startsWith(`${COINGECKO_LOGO_DIR_REL}/`)) continue;

		const sourcePath = resolve(import.meta.dirname, `../public${cached.image}`);
		const targetPath = getCoinGeckoLogoFilePath(coingeckoId);

		if (!existsSync(sourcePath)) continue;
		if (!existsSync(targetPath)) {
			copyFileSync(sourcePath, targetPath);
			copied++;
		}

		cache[addr] = { ...cached, image: expectedImagePath, coingeckoId };
	}

	if (migrated > 0) {
		console.log(
			`  [erc20] Migrated ${migrated} cached logo URL(s) to local WebP`,
		);
	}
	if (copied > 0) {
		console.log(
			`  [erc20] Renamed ${copied} cached local logo(s) to CoinGecko IDs`,
		);
	}
}

function cleanupUnusedCoinGeckoLogos(cache: Erc20Cache): void {
	if (!existsSync(COINGECKO_LOGO_DIR_ABS)) return;

	const usedFiles = new Set(
		Object.values(cache)
			.map((entry) => entry.image)
			.filter((image): image is string =>
				Boolean(image?.startsWith(`${COINGECKO_LOGO_DIR_REL}/`)),
			)
			.map((image) => image.split("/").at(-1) ?? ""),
	);

	for (const fileName of readdirSync(COINGECKO_LOGO_DIR_ABS)) {
		if (!fileName.endsWith(".webp")) continue;
		if (usedFiles.has(fileName)) continue;

		unlinkSync(resolve(COINGECKO_LOGO_DIR_ABS, fileName));
	}
}

// ---------------------------------------------------------------------------
// ERC20 RPC helpers – call name(), symbol(), decimals() on Ethereum mainnet
// ---------------------------------------------------------------------------

/** Standard ERC20 function selectors (4 bytes, no arguments). */
const ERC20_SELECTORS = {
	name: "0x06fdde03",
	symbol: "0x95d89b41",
	decimals: "0x313ce567",
} as const;

/**
 * Execute a single `eth_call` against the first responsive Ethereum RPC.
 * Tries each URL in ETHEREUM_RPC_URLS in order; throws if all fail.
 */
async function ethCall(to: string, data: string): Promise<string> {
	let lastError: Error | undefined;
	for (const rpcUrl of ETHEREUM_RPC_URLS) {
		try {
			const res = await fetch(rpcUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "eth_call",
					params: [{ to, data }, "latest"],
				}),
			});
			const json = (await res.json()) as {
				result?: string;
				error?: { message: string };
			};
			if (json.error) throw new Error(json.error.message);
			if (json.result) return json.result;
			throw new Error("Empty result from eth_call");
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
		}
	}
	throw lastError ?? new Error("All Ethereum RPC endpoints failed");
}

/** Decode an ABI-encoded string (returned by name() and symbol()). */
function decodeAbiString(hex: string): string {
	// Remove 0x prefix
	const data = hex.startsWith("0x") ? hex.slice(2) : hex;
	if (data.length < 128) return ""; // minimum: offset(32) + length(32) + data(32)
	// Offset to string data (first 32 bytes) — usually 0x20
	const offset = Number.parseInt(data.slice(0, 64), 16) * 2;
	// String byte length (next 32 bytes at offset)
	const length = Number.parseInt(data.slice(offset, offset + 64), 16);
	// The UTF-8 bytes
	const strHex = data.slice(offset + 64, offset + 64 + length * 2);
	return Buffer.from(strHex, "hex").toString("utf-8");
}

/** Decode a uint8 return value (returned by decimals()). */
function decodeUint8(hex: string): number {
	const data = hex.startsWith("0x") ? hex.slice(2) : hex;
	return Number.parseInt(data, 16);
}

/**
 * Fetch ERC20 metadata (name, symbol, decimals) via direct contract calls.
 * Returns `null` if the contract does not implement ERC20 (all 3 calls fail).
 */
async function fetchErc20Metadata(
	contractAddress: string,
): Promise<{ tokenName: string; symbol: string; decimals: number } | null> {
	const results = await Promise.allSettled([
		ethCall(contractAddress, ERC20_SELECTORS.name),
		ethCall(contractAddress, ERC20_SELECTORS.symbol),
		ethCall(contractAddress, ERC20_SELECTORS.decimals),
	]);

	const nameResult =
		results[0].status === "fulfilled" ? decodeAbiString(results[0].value) : "";
	const symbolResult =
		results[1].status === "fulfilled" ? decodeAbiString(results[1].value) : "";
	const decimalsResult =
		results[2].status === "fulfilled" ? decodeUint8(results[2].value) : 0;

	// If we couldn't get any info at all, treat as not an ERC20
	if (!nameResult && !symbolResult && !decimalsResult) return null;

	return {
		tokenName: nameResult,
		symbol: symbolResult,
		decimals: decimalsResult,
	};
}

// ---------------------------------------------------------------------------
// CoinGecko – free API for token logos
// ---------------------------------------------------------------------------

/**
 * CoinGecko delay between calls (ms).
 * Without API key the free tier is very aggressive (~5-10 req/min).
 * With a demo key the limit is 30 req/min → 2s is safe.
 */
const COINGECKO_DELAY_WITH_KEY_MS = 2_000;
const COINGECKO_DELAY_NO_KEY_MS = 6_000;

/** Maximum retries for CoinGecko 429 (rate limit) responses. */
const COINGECKO_MAX_RETRIES = 3;

/**
 * Hard cap on CoinGecko API calls per script invocation.
 * Can be overridden with COINGECKO_BUDGET_PER_RUN.
 */
const coingeckoBudgetFromEnv = Number(
	process.env.COINGECKO_BUDGET_PER_RUN ?? "500",
);
const COINGECKO_BUDGET_PER_RUN =
	Number.isFinite(coingeckoBudgetFromEnv) && coingeckoBudgetFromEnv > 0
		? Math.floor(coingeckoBudgetFromEnv)
		: 500;

/** Tracks CoinGecko API calls within this script run. */
let coingeckoCalls = 0;

/**
 * Fetch CoinGecko token metadata for an Ethereum contract.
 * When an API key is provided it is sent as `x-cg-demo-api-key` header.
 * Retries with exponential backoff on 429 (rate limited).
 * Returns undefined if the token is unknown, budget is exhausted,
 * or all retries fail.
 */
async function fetchCoinGeckoTokenData(
	contractAddress: string,
	apiKey: string | undefined,
): Promise<{ id?: string; imageUrl?: string } | undefined> {
	if (coingeckoCalls >= COINGECKO_BUDGET_PER_RUN) {
		console.log("  [coingecko] Budget exhausted, skipping remaining logos");
		return undefined;
	}

	const url = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${contractAddress}`;
	const headers: Record<string, string> = { Accept: "application/json" };
	if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

	const delayMs = apiKey
		? COINGECKO_DELAY_WITH_KEY_MS
		: COINGECKO_DELAY_NO_KEY_MS;

	for (let attempt = 0; attempt <= COINGECKO_MAX_RETRIES; attempt++) {
		try {
			coingeckoCalls++;
			const res = await fetch(url, { headers });

			if (res.status === 429) {
				// Rate limited — back off and retry
				const backoff = delayMs * 2 ** attempt;
				console.log(
					`  [coingecko] Rate limited, retrying in ${backoff / 1000}s...`,
				);
				if (attempt === COINGECKO_MAX_RETRIES) {
					pushNonFatalWarning(
						`[coingecko] ${contractAddress}: rate limited after ${COINGECKO_MAX_RETRIES + 1} attempts`,
					);
				}
				await sleep(backoff);
				continue;
			}

			if (!res.ok) {
				pushNonFatalWarning(
					`[coingecko] ${contractAddress}: HTTP ${res.status}`,
				);
				return undefined;
			}
			const json = (await res.json()) as {
				id?: string;
				image?: { large?: string; small?: string; thumb?: string };
			};
			return {
				id: json.id,
				imageUrl: json.image?.large ?? json.image?.small,
			};
		} catch (err) {
			if (attempt === COINGECKO_MAX_RETRIES) {
				pushNonFatalWarning(
					`[coingecko] ${contractAddress}: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
			return undefined;
		}
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Cache refresh — combines ERC20 RPC + CoinGecko
// ---------------------------------------------------------------------------

/**
 * Refresh the ERC20 cache for the given tokens.
 * Only fetches entries that are missing or older than ERC20_MAX_AGE_MS.
 * ERC20 RPC calls are parallelised; CoinGecko calls are rate-limited.
 */
async function refreshErc20Cache(
	cache: Erc20Cache,
	tokens: TokenNoId[],
	coingeckoApiKey: string | undefined,
): Promise<void> {
	const addresses = getEthereumContractAddresses(tokens);

	const now = Date.now();
	const staleAddresses = addresses.filter((addr) => {
		const entry = cache[addr];
		if (!entry) return true;
		return now - new Date(entry.fetchedAt).getTime() > ERC20_MAX_AGE_MS;
	});

	if (staleAddresses.length === 0) {
		console.log("  [erc20] Cache is up-to-date, nothing to fetch");
		return;
	}

	console.log(
		`  [erc20] Fetching metadata for ${staleAddresses.length} contract(s)...`,
	);

	// Step 1: Fetch ERC20 metadata sequentially (public RPCs rate-limit parallel bursts)
	const metadataResults: Array<{
		addr: string;
		metadata: Awaited<ReturnType<typeof fetchErc20Metadata>>;
	}> = [];
	for (const addr of staleAddresses) {
		const metadata = await fetchErc20Metadata(addr).catch(() => null);
		if (!metadata) {
			pushNonFatalWarning(
				`[erc20] ${addr}: metadata fetch failed or contract is not valid ERC20`,
			);
		}
		metadataResults.push({ addr, metadata });
		// Small delay to avoid public RPC rate limits
		await sleep(200);
	}

	// Step 2: Fetch CoinGecko images sequentially (rate-limited)
	const delayMs = coingeckoApiKey
		? COINGECKO_DELAY_WITH_KEY_MS
		: COINGECKO_DELAY_NO_KEY_MS;
	let fetched = 0;
	for (const { addr, metadata } of metadataResults) {
		if (!metadata) {
			console.log(`  [erc20] ${addr} — not a valid ERC20, skipping`);
			continue;
		}

		// Rate-limit CoinGecko (skip delay before first call)
		if (fetched > 0) await sleep(delayMs);
		const coingeckoData = await fetchCoinGeckoTokenData(addr, coingeckoApiKey);
		const image =
			coingeckoData?.id && coingeckoData?.imageUrl
				? await downloadCoinGeckoLogoAsWebp(
						coingeckoData.id,
						coingeckoData.imageUrl,
					)
				: undefined;

		cache[addr] = {
			fetchedAt: new Date().toISOString(),
			tokenName: metadata.tokenName,
			symbol: metadata.symbol,
			decimals: metadata.decimals,
			coingeckoId: coingeckoData?.id,
			image,
		};
		fetched++;

		if (image) {
			console.log(`  [erc20] ${addr} → ${metadata.symbol} (with logo)`);
		} else {
			console.log(`  [erc20] ${addr} → ${metadata.symbol} (no logo)`);
		}
	}

	console.log(`  [erc20] Fetched ${fetched}/${staleAddresses.length} token(s)`);
	console.log(
		`  [coingecko] API calls this run: ${coingeckoCalls}/${COINGECKO_BUDGET_PER_RUN}`,
	);
}

/**
 * Enrich Ethereum-origin foreign asset tokens from the ERC20 cache.
 * Fills missing symbol, name, decimals; sets logo if available.
 */
function enrichFromErc20Cache(tokens: TokenNoId[], cache: Erc20Cache): void {
	for (const token of tokens) {
		if (
			token.type !== "foreign-asset" ||
			!isEthereumOriginLocation(token.location)
		)
			continue;

		const addr = getContractAddress(token);
		if (!addr) continue;

		const cached = cache[addr];
		if (!cached) continue;

		if (!token.symbol && cached.symbol) token.symbol = cached.symbol;
		if (!token.name && cached.tokenName) token.name = cached.tokenName;
		if (!token.decimals && cached.decimals) token.decimals = cached.decimals;
		if (!token.logo && cached.image) token.logo = cached.image;
	}
}

// ---------------------------------------------------------------------------
// Fetchers — each returns TokenNoId[] (no `id` field)
// ---------------------------------------------------------------------------

async function fetchAssetTokens(
	chain: ChainConfig,
	api: TypedApi<ChainConfig["descriptors"]>,
	signal: AbortSignal,
): Promise<TokenNoId[]> {
	console.log(`  [${chain.id}] Fetching asset metadata + asset info...`);

	const [metadatas, assets] = await Promise.all([
		api.query.Assets.Metadata.getEntries({ at: "best", signal }),
		api.query.Assets.Asset.getEntries({ at: "best", signal }),
	]);
	console.log(
		`  [${chain.id}] Found ${metadatas.length} asset metadatas, ${assets.length} asset infos`,
	);

	return mapAssetTokensFromEntries(
		chain.id,
		metadatas,
		createSufficientMap(assets),
	);
}

async function fetchPoolAssetTokens(
	chain: ChainConfig,
	api: TypedApi<ChainConfig["descriptors"]>,
	signal: AbortSignal,
): Promise<TokenNoId[]> {
	console.log(`  [${chain.id}] Fetching pool assets...`);
	const entries = await api.query.PoolAssets.Asset.getEntries({
		at: "best",
		signal,
	});
	console.log(`  [${chain.id}] Found ${entries.length} pool assets`);

	return mapPoolAssetTokensFromEntries(chain.id, entries);
}

async function fetchForeignAssetTokens(
	chain: ChainConfig,
	api: TypedApi<ChainConfig["descriptors"]>,
	signal: AbortSignal,
): Promise<TokenNoId[]> {
	console.log(`  [${chain.id}] Fetching foreign assets...`);

	const [assets, metadatas] = await Promise.all([
		api.query.ForeignAssets.Asset.getEntries({ at: "best", signal }),
		api.query.ForeignAssets.Metadata.getEntries({ at: "best", signal }),
	]);
	console.log(
		`  [${chain.id}] Found ${assets.length} foreign assets (${metadatas.length} with metadata)`,
	);

	const metadataLocations = new Set(
		metadatas.map((entry) => safeStringify(entry.keyArgs[0])),
	);

	for (const asset of assets) {
		const locationKey = safeStringify(asset.keyArgs[0]);
		if (metadataLocations.has(locationKey)) continue;
		if (isEthereumOriginLocation(asset.keyArgs[0])) continue;

		const warning = `[${chain.id}] Ignored non-Ethereum foreign asset without metadata: ${truncate(locationKey, 220)}`;
		console.warn(`  [${chain.id}] ${warning}`);
		pushNonFatalWarning(warning);
	}

	return mapForeignAssetTokensFromEntries(chain.id, assets, metadatas, {
		keepEthereumWithoutMetadata: true,
	});
}

// ---------------------------------------------------------------------------
// Per-chain orchestration
// ---------------------------------------------------------------------------

async function fetchTokensForChain(
	chain: ChainConfig,
	timeout: number,
): Promise<TokenNoId[]> {
	console.log(`\nConnecting to ${chain.name} (${chain.id})...`);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);

	let client: PolkadotClient | undefined;

	try {
		client = createClient(
			withPolkadotSdkCompat(getWsProvider(chain.wsUrl as unknown as string[])),
		);
		const api = client.getTypedApi(chain.descriptors);

		// Wait for the chain to be reachable
		console.log(`  [${chain.id}] Waiting for first block...`);
		const waitForBlockTimeout = new Promise<never>((_, reject) => {
			const timerId = setTimeout(
				() => reject(new Error(`Timeout waiting for ${chain.id}`)),
				timeout,
			);
			controller.signal.addEventListener("abort", () => clearTimeout(timerId), {
				once: true,
			});
		});
		await Promise.race([
			firstValueFrom(client.bestBlocks$),
			waitForBlockTimeout,
		]);
		console.log(`  [${chain.id}] Connected`);

		const signal = controller.signal;

		const tokens: TokenNoId[] = [];

		// Fetch each type independently so a failure in one doesn't lose the others
		for (const [label, fetcher] of [
			["assets", () => fetchAssetTokens(chain, api, signal)],
			["pool assets", () => fetchPoolAssetTokens(chain, api, signal)],
			["foreign assets", () => fetchForeignAssetTokens(chain, api, signal)],
		] as const) {
			try {
				const result = await (fetcher as () => Promise<TokenNoId[]>)();
				tokens.push(...result);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				console.error(`  [${chain.id}] Failed to fetch ${label}:`, message);
				pushNonFatalWarning(
					`[${chain.id}] Failed to fetch ${label}: ${message}`,
				);
			}
		}

		const assetCount = tokens.filter((t) => t.type === "asset").length;
		const poolCount = tokens.filter((t) => t.type === "pool-asset").length;
		const foreignCount = tokens.filter(
			(t) => t.type === "foreign-asset",
		).length;
		console.log(
			`  [${chain.id}] Total: ${tokens.length} tokens (${assetCount} assets + ${poolCount} pool assets + ${foreignCount} foreign assets)`,
		);
		return tokens;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`  [${chain.id}] Error:`, message);
		pushNonFatalWarning(`[${chain.id}] RPC/connectivity error: ${message}`);
		return [];
	} finally {
		clearTimeout(timer);
		controller.abort();
		await destroyClient(client, chain.id);
	}
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
	const args = process.argv.slice(2);
	let chainFilter: string[] | null = null;
	let timeout = 120_000;

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case "--chains":
				chainFilter = args[++i]?.split(",").map((s) => s.trim()) ?? null;
				break;
			case "--timeout":
				timeout = Number(args[++i] ?? timeout);
				break;
			case "--help":
				console.log(`Usage: node --run fetch-tokens [-- options]

Options:
  --chains <chain1,chain2> Comma-separated chain IDs to fetch (default: all)
                           Available: pah, kah, wah, pasah
  --timeout <ms>           Per-chain timeout in ms (default: 120000)
  --help                   Show this help

Environment:
  COINGECKO_API_KEY        CoinGecko Demo API key (optional, improves rate limits).
                           Set in web/.env.local for local runs,
                           or as a GitHub secret for CI.
	DISCORD_WEBHOOK_URL      Discord webhook URL (optional).
													 Sends an error notification when the script fails.
  COINGECKO_BUDGET_PER_RUN Maximum CoinGecko calls per run (optional, default: 500).

Output files are written to src/registry/tokens/generated/tokens.<chainId>.json`);
				process.exit(0);
		}
	}

	return { chainFilter, timeout };
}

async function main() {
	const { chainFilter, timeout } = parseArgs();

	const chainsToFetch = chainFilter
		? CHAINS.filter((c) => chainFilter.includes(c.id))
		: [...CHAINS];

	if (chainsToFetch.length === 0) {
		throw new Error(
			`No matching chains found. Available: ${CHAINS.map((c) => c.id).join(", ")}`,
		);
	}

	console.log(
		`Fetching tokens from ${chainsToFetch.length} chain(s): ${chainsToFetch.map((c) => c.id).join(", ")}`,
	);
	console.log(`Timeout per chain: ${timeout}ms`);
	console.log(`Output directory: ${OUTPUT_DIR}`);

	// 1. Fetch tokens from all chains into memory
	const tokensByChain = new Map<string, TokenNoId[]>();
	for (const chain of chainsToFetch) {
		const tokens = await fetchTokensForChain(chain, timeout);
		if (tokens.length > 0) {
			tokensByChain.set(chain.id, tokens);
		} else {
			pushNonFatalWarning(
				`[${chain.id}] No tokens written (chain unavailable or fetch failed)`,
			);
		}
	}

	// 2. ERC20 + CoinGecko enrichment for Ethereum-origin foreign assets
	const allTokens = [...tokensByChain.values()].flat();

	const erc20Cache = loadErc20Cache();
	const coingeckoApiKey = process.env.COINGECKO_API_KEY;
	console.log(
		`\n[erc20] Enriching Ethereum-origin tokens via ERC20 RPC + CoinGecko${coingeckoApiKey ? " (with API key)" : ""}`,
	);
	await refreshErc20Cache(erc20Cache, allTokens, coingeckoApiKey);
	await migrateCachedImagesToLocal(erc20Cache, allTokens, coingeckoApiKey);
	cleanupUnusedCoinGeckoLogos(erc20Cache);
	saveErc20Cache(erc20Cache);

	// Apply cached data (even without fresh fetches, the cache may have data from prior runs)
	enrichFromErc20Cache(allTokens, erc20Cache);

	// 3. Write per-chain files
	let totalTokens = 0;
	for (const [chainId, tokens] of tokensByChain) {
		// Final filter: drop foreign assets still missing symbol+name after enrichment
		const filtered = tokens.filter((t) => {
			if (t.type === "foreign-asset") return t.symbol && t.name;
			return true;
		});

		const outputTokens = filtered
			.map((token) => {
				const withId = {
					...token,
					id: getTokenId(token),
				} as TokenNoId & { id: string; logo?: string };
				if (!withId.logo) {
					const { logo: _, ...rest } = withId;
					return rest;
				}
				return withId;
			})
			.sort((a, b) => a.id.localeCompare(b.id));

		const filePath = resolve(OUTPUT_DIR, `tokens.${chainId}.json`);
		const jsonContent = `${JSON.stringify(outputTokens, jsonReplacer, "\t")}\n`;
		writeFileSync(filePath, jsonContent, "utf-8");
		console.log(
			`  [${chainId}] Wrote ${filtered.length} tokens to tokens.${chainId}.json`,
		);
		totalTokens += filtered.length;
	}

	console.log(
		`\nDone! Wrote ${totalTokens} tokens across ${tokensByChain.size} file(s).`,
	);

	await notifyDiscordWarningsSummary(nonFatalWarnings);
}

main()
	.then(() => {
		process.exit(0);
	})
	.catch(async (err) => {
		console.error("Fatal error:", err);
		await notifyDiscordFailure(err);
		process.exit(1);
	});
