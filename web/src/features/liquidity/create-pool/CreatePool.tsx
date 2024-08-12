import type { FC } from "react";
import type { TokenId } from "src/config/tokens";
import { CreatePoolFollowUp } from "./CreatePoolFollowUp";
import { CreatePoolForm } from "./CreatePoolForm";
import { CreatePoolProvider } from "./CreatePoolProvider";
import { CreatePoolTransactionProvider } from "./CreatePoolTransactionProvider";

export const CreatePool: FC<{ tokenId: TokenId }> = ({ tokenId }) => (
	<CreatePoolProvider tokenId={tokenId}>
		<CreatePoolTransactionProvider>
			<CreatePoolForm />
			<CreatePoolFollowUp />
		</CreatePoolTransactionProvider>
	</CreatePoolProvider>
);
