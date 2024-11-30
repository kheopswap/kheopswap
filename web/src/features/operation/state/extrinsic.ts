import { logger } from "@kheopswap/utils";
import type { OperationInputs } from "./inputs.state";

export const getTransferOperation = (inputs: OperationInputs) => {
	logger.debug("getTransferOperation", { inputs });
};
