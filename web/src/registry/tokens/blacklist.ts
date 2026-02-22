import YAML from "yaml";
import blacklistYaml from "./tokens-blacklist.yaml?raw";

const parsed = YAML.parse(blacklistYaml) as { blacklist?: string[] } | null;

/** Token IDs that should be ignored everywhere (build-time and runtime). */
export const TOKENS_BLACKLIST: ReadonlySet<string> = new Set(
	parsed?.blacklist ?? [],
);
