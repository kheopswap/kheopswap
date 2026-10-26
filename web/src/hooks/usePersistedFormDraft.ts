import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { parseTokenId } from "../registry/tokens/helpers";
import type { TokenId } from "../registry/tokens/types";
import { useSetting } from "./useSetting";
import { useWalletAccount } from "./useWalletAccount";

const FORM_DRAFT_KEY = "formDraft";

export type DraftFields<T> = {
	[Key in keyof T]: (value: unknown) => value is T[Key];
};

export const isDraftText = (value: unknown): value is string =>
	typeof value === "string";

export const isDraftTokenId = (value: unknown): value is TokenId => {
	if (typeof value !== "string") return false;
	if (value === "") return true;
	try {
		parseTokenId(value);
		return true;
	} catch {
		return false;
	}
};

const parseDraft = <T>(draft: unknown, fields: DraftFields<T>): Partial<T> => {
	const parsed: Partial<T> = {};
	if (!draft || typeof draft !== "object") return parsed;
	for (const key in fields) {
		const value: unknown = Reflect.get(draft, key);
		if (fields[key](value)) parsed[key] = value;
	}
	return parsed;
};

const readHistoryDraft = <T>(fields: DraftFields<T>): Partial<T> => {
	if (typeof window === "undefined") return {};
	return parseDraft(window.history.state?.[FORM_DRAFT_KEY], fields);
};

export const usePersistedFormDraft = <T extends { from: string }>(
	baseDefaults: T,
	fields: DraftFields<T>,
): [T, Dispatch<SetStateAction<T>>] => {
	const [defaultAccountId, setDefaultAccountId] =
		useSetting("defaultAccountId");
	const account = useWalletAccount({ id: defaultAccountId });

	const [persistedDraft] = useState(() => readHistoryDraft(fields));

	const defaults = useMemo<T>(
		() => ({
			...baseDefaults,
			from: account?.id ?? baseDefaults.from,
			...persistedDraft,
		}),
		[baseDefaults, account?.id, persistedDraft],
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
