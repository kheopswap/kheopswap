import fs from "node:fs";
import path from "node:path";
import { safeStringify } from "./safeStringify";

const baseDataDir = path.resolve("./data");

export const dumpData = (dataRelativePath: string, data: unknown) => {
	const filepath = path.join(baseDataDir, dataRelativePath);
	const dirpath = path.dirname(filepath);
	if (!fs.existsSync(dirpath)) fs.mkdirSync(dirpath, { recursive: true });

	fs.writeFileSync(filepath, safeStringify(data));
	console.info(filepath, "saved");
};
