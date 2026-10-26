import { useMemo } from "react";
import { useWallets } from "../common/kheopskit";
import { getAddressFromAccountField } from "../utils/getAddressFromAccountField";

export const useWalletAccount = ({ id }: { id: string | null | undefined }) => {
	const { accounts } = useWallets();

	return useMemo(() => {
		if (!id) return null;
		const exactMatch = accounts.find((account) => account.id === id);
		if (exactMatch) return exactMatch;
		const address = getAddressFromAccountField(id);
		if (address) {
			return accounts.find((account) => account.address === address) ?? null;
		}
		return null;
	}, [accounts, id]);
};
