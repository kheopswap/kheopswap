import { Extensions, getExtensionIcon } from "@polkadot-ui/assets/extensions";
import type { ExtensionConfig } from "@polkadot-ui/assets/types";
import { useMemo } from "react";

import { TalismanIcon } from "src/components/icons";

/**
 *
 * @param name name of an entry from window.injectedWeb3
 * @returns
 */
export const useInjectedExtension = (name: string) => {
	return useMemo(
		() => ({
			extension: Extensions[name] as ExtensionConfig | undefined,
			Icon: name === "talisman" ? TalismanIcon : getExtensionIcon(name),
		}),
		[name],
	);
};
