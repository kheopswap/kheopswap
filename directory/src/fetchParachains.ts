import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import {
	ChaindataProvider,
	type DotNetwork,
} from "@talismn/chaindata-provider";
import { filter, firstValueFrom } from "rxjs";

/**
 * Parachain type for directory output
 */
export type DirectoryParachain = {
	relay: "polkadot" | "kusama" | "paseo" | null;
	paraId: number;
	name: string;
	chainId?: "pah" | "kah" | "wah" | "pasah";
	logo?: string;
	subscanUrl?: string;
};

/**
 * Directory for downloaded logos
 */
const LOGOS_DIR = path.join(import.meta.dirname, "..", "logos");

/**
 * Downloaded logos cache to avoid re-downloading
 */
const downloadedLogos = new Set<string>();

/**
 * Download a logo from a URL and save it locally
 * Returns the local filename or undefined if download failed
 */
const downloadLogo = async (
	logoUrl: string,
	filename: string,
): Promise<string | undefined> => {
	if (downloadedLogos.has(filename)) {
		return filename;
	}

	const localPath = path.join(LOGOS_DIR, filename);

	// Check if file already exists
	if (fs.existsSync(localPath)) {
		downloadedLogos.add(filename);
		return filename;
	}

	try {
		const response = await fetch(logoUrl);
		if (!response.ok) {
			return undefined;
		}

		const buffer = await response.arrayBuffer();

		// Ensure logos directory exists
		if (!fs.existsSync(LOGOS_DIR)) {
			fs.mkdirSync(LOGOS_DIR, { recursive: true });
		}

		fs.writeFileSync(localPath, Buffer.from(buffer));
		downloadedLogos.add(filename);
		console.log(`  Downloaded parachain logo: ${filename}`);
		return filename;
	} catch (error) {
		console.warn(`  Failed to download logo from ${logoUrl}:`, error);
		return undefined;
	}
};

/**
 * Get current git branch name
 */
const getCurrentBranch = (): string => {
	try {
		return execSync("git rev-parse --abbrev-ref HEAD", {
			encoding: "utf-8",
		}).trim();
	} catch {
		return "main";
	}
};

const CURRENT_BRANCH = getCurrentBranch();
const LOGOS_BASE_URL = `https://raw.githubusercontent.com/kheopswap/kheopswap/${CURRENT_BRANCH}/directory/logos`;

/**
 * Map chaindata relay IDs to our relay format
 */
const mapRelayId = (
	relayId: string,
): "polkadot" | "kusama" | "paseo" | null => {
	switch (relayId) {
		case "polkadot":
			return "polkadot";
		case "kusama":
			return "kusama";
		case "paseo-testnet":
			return "paseo";
		default:
			return null;
	}
};

/**
 * Map relay and paraId to our chainId if it's one of our supported chains
 */
const getChainId = (
	relay: "polkadot" | "kusama" | "paseo" | null,
	paraId: number,
): "pah" | "kah" | "wah" | "pasah" | undefined => {
	// Asset Hubs are all paraId 1000
	if (paraId === 1000) {
		switch (relay) {
			case "polkadot":
				return "pah";
			case "kusama":
				return "kah";
			case "paseo":
				return "pasah";
		}
	}
	// Westend Asset Hub - if we ever include it
	// Note: Westend is not in chaindata as it's a testnet
	return undefined;
};

/**
 * Get subscan URL for a chain if available
 */
const getSubscanUrl = (network: DotNetwork): string | undefined => {
	const explorer = network.blockExplorerUrls.find((url) =>
		url.includes("subscan"),
	);
	return explorer?.replace(/\/$/, "");
};

/**
 * Fetch all parachains from Talisman chaindata
 */
export const fetchParachains = async (): Promise<DirectoryParachain[]> => {
	console.log("\nFetching parachains from chaindata...");

	const provider = new ChaindataProvider();

	// Wait for networks to load
	const networks = await firstValueFrom(
		provider.networks$.pipe(filter((n) => n.length > 0)),
	);

	console.log(`Chaindata: Loaded ${networks.length} networks`);

	// Filter for Polkadot-based parachains only
	const dotNetworks = networks.filter(
		(n): n is DotNetwork => n.platform === "polkadot",
	);

	console.log(`Chaindata: ${dotNetworks.length} are Polkadot-based`);

	const parachains: DirectoryParachain[] = [];

	for (const network of dotNetworks) {
		// Skip testnets except Paseo
		if (network.isTestnet && !network.id.startsWith("paseo")) {
			continue;
		}

		// Extract topology information
		const topology = network.topology;

		let relay: "polkadot" | "kusama" | "paseo" | null = null;
		let paraId: number | null = null;

		if (topology.type === "parachain") {
			relay = mapRelayId(topology.relayId);
			paraId = topology.paraId;
		} else if (topology.type === "relay") {
			// Skip relay chains themselves (polkadot, kusama)
			continue;
		} else {
			// standalone - skip
			continue;
		}

		// Skip if we couldn't map the relay
		if (!relay || paraId === null) {
			continue;
		}

		// Download logo if available
		let logo: string | undefined;
		if (network.logo) {
			const urlParts = network.logo.split("/");
			const originalFilename = urlParts[urlParts.length - 1] ?? "";
			const ext = path.extname(originalFilename) || ".svg";
			const filename = `parachain-${network.id}${ext}`;

			const downloaded = await downloadLogo(network.logo, filename);
			if (downloaded) {
				logo = `${LOGOS_BASE_URL}/${downloaded}`;
			}
		}

		const parachain: DirectoryParachain = {
			relay,
			paraId,
			name: network.name,
		};

		const chainId = getChainId(relay, paraId);
		if (chainId) {
			parachain.chainId = chainId;
		}

		if (logo) {
			parachain.logo = logo;
		}

		const subscanUrl = getSubscanUrl(network);
		if (subscanUrl) {
			parachain.subscanUrl = subscanUrl;
		}

		parachains.push(parachain);
	}

	// Sort by relay then paraId
	parachains.sort((a, b) => {
		const relayOrder = { polkadot: 0, kusama: 1, paseo: 2, null: 3 };
		const relayCompare =
			(relayOrder[a.relay ?? "null"] ?? 3) -
			(relayOrder[b.relay ?? "null"] ?? 3);
		if (relayCompare !== 0) return relayCompare;
		return a.paraId - b.paraId;
	});

	console.log(`Found ${parachains.length} parachains`);
	return parachains;
};
