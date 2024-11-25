import { startFromWorker } from "polkadot-api-test/smoldot/from-worker";
//import SmWorker from "polkadot-api-test/smoldot/worker?worker";
import SmWorker from "polkadot-api-test/smoldot/worker?worker";

export const smoldot = startFromWorker(new SmWorker(), {
	forbidWs: true,
});
