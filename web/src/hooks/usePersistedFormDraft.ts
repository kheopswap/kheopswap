import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { useSetting } from "./useSetting";
import { useWalletAccount } from "./useWalletAccount";

const FORM_DRAFT_KEY = "formDraft";

const readHistoryDraft = <T>(): Partial<T> => {
	if (typeof window === "undefined") return {};
	try {
		const draft = window.history.state?.[FORM_DRAFT_KEY];
		if (!draft || typeof draft !== "object") return {};
		return draft as Partial<T>;
	} catch {
		return {};
	}
};

export const usePersistedFormDraft = <T extends { from: string }>(
	baseDefaults: T,
): [T, Dispatch<SetStateAction<T>>] => {
	const location = useLocation();
	const [defaultAccountId, setDefaultAccountId] =
		useSetting("defaultAccountId");
	const account = useWalletAccount({ id: defaultAccountId });

	const persistedDraft = useMemo(() => readHistoryDraft<T>(), []);

	const defaults = useMemo<T>(
		() => ({
			...baseDefaults,
			from: account?.id ?? baseDefaults.from,
			...location.state,
			...persistedDraft,
		}),
		[baseDefaults, account?.id, location.state, persistedDraft],
	);

	const [formData, setFormData] = useState<T>(defaults);

	useEffect(() => {
		if (!formData.from && defaults.from)
			setFormData((prev) => ({ ...prev, from: defaults.from }));
	}, [defaults.from, formData.from]);

	useEffect(() => {
		if (formData.from) setDefaultAccountId(formData.from);
	}, [formData.from, setDefaultAccountId]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.history.replaceState(
			{ ...window.history.state, [FORM_DRAFT_KEY]: formData },
			"",
		);
	}, [formData]);

	return [formData, setFormData];
};
