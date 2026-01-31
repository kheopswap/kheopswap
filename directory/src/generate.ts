import * as fs from "node:fs";
import * as path from "node:path";
import { type ChainId, getChains } from "@kheopswap/registry";
import { isBigInt, isBinary } from "@kheopswap/utils";
import { fetchPools } from "./fetchPools";
import { fetchAllTokens } from "./fetchTokens";
import { disconnectAll } from "./getApi";
import type { DirectoryChainData } from "./types";

const DATA_DIR = path.join(import.meta.dirname, "..", "data", "v1");

/**
 * Generate directory data for a single chain
 */
const generateChainData = async (
	chainId: ChainId,
): Promise<DirectoryChainData> => {
	console.log(`\n${"=".repeat(50)}`);
	console.log(`Generating data for chain: ${chainId}`);
	console.log("=".repeat(50));

	const [tokens, pools] = await Promise.all([
		fetchAllTokens(chainId),
		fetchPools(chainId),
	]);

	return {
		chainId,
		generatedAt: new Date().toISOString(),
		tokens,
		pools,
	};
};

/**
 * JSON replacer that converts BigInt to string and Binary to hex string
 */
const jsonReplacer = (_key: string, value: unknown): unknown => {
	if (isBigInt(value)) return value.toString();
	if (isBinary(value)) return value.asHex();
	return value;
};

/**
 * Write chain data to JSON file
 */
const writeChainData = (chainId: ChainId, data: DirectoryChainData): void => {
	const filePath = path.join(DATA_DIR, `${chainId}.json`);

	// Ensure directory exists
	fs.mkdirSync(DATA_DIR, { recursive: true });

	// Write JSON file with pretty formatting (handle BigInt and Binary serialization)
	fs.writeFileSync(filePath, JSON.stringify(data, jsonReplacer, "\t"));

	console.log(`Written: ${filePath}`);
};

/**
 * Main entry point
 */
const main = async (): Promise<void> => {
	console.log("Starting directory generation...");
	console.log(`Output directory: ${DATA_DIR}`);

	const chains = getChains();
	console.log(`Chains to process: ${chains.map((c) => c.id).join(", ")}`);

	const failedChains: string[] = [];

	for (const chain of chains) {
		try {
			const data = await generateChainData(chain.id);
			writeChainData(chain.id, data);
		} catch (error) {
			console.error(`Failed to generate data for ${chain.id}:`, error);
			console.warn(
				`Skipping ${chain.id} - existing data file will remain unchanged`,
			);
			failedChains.push(chain.id);
		}
	}

	// Disconnect all clients
	await disconnectAll();

	console.log(`\n${"=".repeat(50)}`);
	if (failedChains.length > 0) {
		console.warn(
			`Warning: Generation failed for: ${failedChains.join(", ")} (existing files preserved)`,
		);
	}

	console.log("Directory generation complete!");
	console.log("=".repeat(50));

	// Exit cleanly (important for polkadot-api connections)
	process.exit(0);
};

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
