import { useMemo } from "react";

import { useWallets } from "./useWallets";

export const useWalletAccount = ({ id }: { id: string | null | undefined }) => {
	const { accounts } = useWallets();

	return useMemo(
		() => accounts.find((account) => account.id === id) ?? null,
		[accounts, id],
	);
};
