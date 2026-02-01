import { isEqual } from "lodash-es";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useNativeToken, useSetting, useWalletAccount } from "src/hooks";
import { useRelayChains } from "src/state";
import type { SwapFormInputs } from "./schema";

/**
 * Manages the swap form state with URL persistence.
 *
 * Responsibilities:
 * - Initialize form with defaults from account and native token
 * - Persist form state to location.state for browser navigation
 * - Sync account changes to settings
 */
export const useSwapFormData = () => {
	const { assetHub } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });

	const location = useLocation();
	const navigate = useNavigate();

	const [defaultAccountId, setDefaultAccountId] =
		useSetting("defaultAccountId");

	// account won't be available on first render
	const account = useWalletAccount({ id: defaultAccountId });

	const defaultValues = useMemo<SwapFormInputs>(() => {
		return {
			from: account?.id ?? "",
			to: "",
			tokenIdIn: nativeToken?.id ?? "",
			tokenIdOut: "",
			amountIn: "",
			...location.state,
		};
	}, [account?.id, nativeToken?.id, location.state]);

	const [formData, setFormData] = useState<SwapFormInputs>(defaultValues);

	useEffect(() => {
		if (!isEqual(location.state, formData)) {
			navigate(location, { state: formData, replace: true });
		}
	}, [formData, location, navigate]);

	// account won't be available on first render
	useEffect(() => {
		if (!formData.from && defaultValues.from)
			setFormData((prev) => ({ ...prev, from: defaultValues.from }));
	}, [defaultValues.from, formData.from]);

	useEffect(() => {
		if (formData.from) setDefaultAccountId(formData.from);
	}, [formData.from, setDefaultAccountId]);

	return [formData, setFormData] as const;
};

/**
 * Handles swap input amount calculations including app fee commission.
 *
 * Calculates:
 * - Total input amount in plancks
 * - App commission (if the fee address can receive)
 * - Net swap amount after commission
 */
export { useSwapInputs } from "./useSwapInputs";
