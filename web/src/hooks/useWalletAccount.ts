import { useWallets } from "@kheopskit/react";
import { getAddressFromAccountField } from "@kheopswap/utils";
import { useMemo } from "react";

export const useWalletAccount = ({ id }: { id: string | null | undefined }) => {
	const { accounts } = useWallets();

	return useMemo(() => {
		if (!id) return null;
		// Try exact ID match first
		const exactMatch = accounts.find((account) => account.id === id);
		if (exactMatch) return exactMatch;
		// Fall back to matching by address (handles legacy ID formats)
		const address = getAddressFromAccountField(id);
		if (address) {
			return accounts.find((account) => account.address === address) ?? null;
		}
		return null;
	}, [accounts, id]);
};
