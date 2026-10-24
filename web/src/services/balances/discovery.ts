import { filter, firstValueFrom } from "rxjs";
import { DEV_IGNORE_STORAGE } from "../../common/constants";
import { parseTokenId } from "../../registry/tokens/helpers";
import { getLocalStorageKey } from "../../utils/getLocalStorageKey";
import { getResolvedSubstrateAddress$ } from "../addressResolution/service";
import type { BalanceDef, BalanceId } from "./types";
import { getBalanceId } from "./utils";
import { readBalances } from "./watchers";

export const DISCOVERY_INTERVAL = 5 * 60_000;
const FIRST_DISCOVERY_DELAY = 1_000;

const STORAGE_KEY = getLocalStorageKey("balances::discovery::v1");

type DiscoveryLog = Record<string, number>;

const loadLog = (): DiscoveryLog => {
	if (DEV_IGNORE_STORAGE) return {};
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
	} catch {
		return {};
	}
};

export const getLastDiscovery = (key: string): number | undefined =>
	loadLog()[key];

export const recordDiscovery = (key: string, at = Date.now()) => {
	localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({ ...loadLog(), [key]: at }),
	);
};

export const getNextDiscoveryDelay = (
	lastRunAt: number | undefined,
	now = Date.now(),
) =>
	lastRunAt === undefined
		? FIRST_DISCOVERY_DELAY
		: Math.max(FIRST_DISCOVERY_DELAY, lastRunAt + DISCOVERY_INTERVAL - now);

const resolveBalanceId = async ({
	address,
	tokenId,
}: BalanceDef): Promise<BalanceId | null> => {
	const { chainId } = parseTokenId(tokenId);
	const resolved = await firstValueFrom(
		getResolvedSubstrateAddress$({ address, chainId }).pipe(
			filter(({ status }) => status !== "loading"),
		),
	);
	return resolved.address
		? getBalanceId({ address: resolved.address, tokenId })
		: null;
};

export const discoverBalances = async (defs: BalanceDef[]) => {
	const balanceIds = (await Promise.all(defs.map(resolveBalanceId))).filter(
		(balanceId): balanceId is BalanceId => balanceId !== null,
	);
	await readBalances(balanceIds);
};
