import { startFromWorker } from "polkadot-api/smoldot/from-worker";
import SmWorker from "polkadot-api/smoldot/worker?worker";

export const smoldot = startFromWorker(new SmWorker(), {
	forbidWs: true,
});
