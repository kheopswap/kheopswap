import {
	type TokenId,
	isAccountCompatibleWithToken,
} from "@kheopswap/registry";
import { getSetting$, setSetting } from "@kheopswap/settings";
import { bind } from "@react-rxjs/core";
import { BehaviorSubject, combineLatest } from "rxjs";
import { relayId$ } from "src/state";

export type OperationFormData = {
	tokenIdIn?: TokenId;
	tokenIdOut?: TokenId;
	accountId?: string;
	recipient?: string;
	amountIn?: string;
};

const formData$ = new BehaviorSubject<OperationFormData>({});

export const [useOperationFormData, operationFormData$] = bind(formData$, {});

export const updateOperationFormData = (
	data: OperationFormData | ((prev: OperationFormData) => OperationFormData),
) => {
	const newValue =
		typeof data === "function"
			? data(formData$.value)
			: { ...formData$.value, ...data };

	formData$.next(consolidateFormData(newValue));
};

const consolidateFormData = (data: OperationFormData): OperationFormData => {
	const newValue = structuredClone(data);

	if (
		!!data.tokenIdIn &&
		!data.tokenIdOut &&
		(!data.recipient ||
			isAccountCompatibleWithToken(data.recipient, data.tokenIdIn))
	)
		newValue.tokenIdOut = data.tokenIdIn;

	if (
		!!data.tokenIdOut &&
		!data.tokenIdIn &&
		(!data.accountId ||
			isAccountCompatibleWithToken(data.accountId, data.tokenIdOut))
	)
		newValue.tokenIdIn = data.tokenIdOut;

	if (
		!!data.accountId &&
		!data.recipient &&
		(!data.tokenIdOut ||
			isAccountCompatibleWithToken(data.accountId, data.tokenIdOut))
	)
		newValue.recipient = data.accountId;

	return newValue;
};

// keep form data in sync with default account
combineLatest([formData$, getSetting$("defaultAccountId")]).subscribe(
	([formData, defaultAccountId]) => {
		if (defaultAccountId && !formData.accountId) {
			updateOperationFormData({
				accountId: defaultAccountId,
			});
		} else if (formData.accountId && formData.accountId !== defaultAccountId) {
			setSetting("defaultAccountId", formData.accountId);
		}
	},
);

// set default route for current relay
relayId$.subscribe((relayId) => {
	switch (relayId) {
		case "polkadot":
			return updateOperationFormData({
				tokenIdIn: "native::pah",
				tokenIdOut: "asset::pah::1337",
			});

		case "kusama":
			return updateOperationFormData({
				tokenIdIn: "native::kah",
				tokenIdOut:
					"foreign-asset::kah::N4IgDghgTgpgdgFwM4gFwCYA0ICWiZQ4D2UaoCAnmDGiABoCMI2AbhADYCuNq5VPIAOLsiAIw4BhInCTwknFKw7cyIStVoAFIuwDWEACZEEIAL7nTQA=", // foreign DOT
			});

		case "paseo":
			return updateOperationFormData({
				tokenIdIn: "native::paseo",
				tokenIdOut: "native::pasah",
			});

		default: {
			return updateOperationFormData({
				tokenIdIn: undefined,
				tokenIdOut: undefined,
			});
		}
	}
});
