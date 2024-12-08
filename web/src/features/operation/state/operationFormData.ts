import {
	type TokenId,
	isAccountCompatibleWithToken,
} from "@kheopswap/registry";
import { bind } from "@react-rxjs/core";
import { BehaviorSubject } from "rxjs";

export type OperationFormData = {
	tokenIdIn?: TokenId;
	tokenIdOut?: TokenId;
	accountId?: string;
	recipient?: string;
	amountIn?: string;
};

const formData$ = new BehaviorSubject<OperationFormData>({});

export const [useOperationFormData, operationFormData$] = bind(formData$);

export const resetOperationFormData = (values: OperationFormData = {}) => {
	formData$.next(values);
};

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
