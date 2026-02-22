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

/**
 * Manages form state with browser history-entry persistence and default-account synchronization.
 *
 * - Reads a persisted draft from the current history entry on mount (survives page refresh).
 * - Merges `location.state` from React Router into the initial values (for cross-page navigation).
 * - Syncs the `from` field bidirectionally with the `defaultAccountId` setting.
 * - Writes form data to the current history entry via `history.replaceState` on every change.
 *
 * Because state is tied to the navigation entry, each tab has independent state
 * and a fresh navigation always starts with a clean form.
 */
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

	// Account won't be available on first render — sync once available
	useEffect(() => {
		if (!formData.from && defaults.from)
			setFormData((prev) => ({ ...prev, from: defaults.from }));
	}, [defaults.from, formData.from]);

	// Persist account selection back to global setting
	useEffect(() => {
		if (formData.from) setDefaultAccountId(formData.from);
	}, [formData.from, setDefaultAccountId]);

	// Persist form data to the current history entry
	useEffect(() => {
		if (typeof window === "undefined") return;
		window.history.replaceState(
			{ ...window.history.state, [FORM_DRAFT_KEY]: formData },
			"",
		);
	}, [formData]);

	return [formData, setFormData];
};
