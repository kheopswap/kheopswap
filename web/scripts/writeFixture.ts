import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PLAIN_KEY = /^[A-Za-z_$][\w$]*$/;

const toLiteral = (value: unknown, indent = ""): string => {
	const inner = `${indent}\t`;
	switch (typeof value) {
		case "undefined":
			return "undefined";
		case "bigint":
			return `${value}n`;
		case "string":
			return JSON.stringify(value);
		case "number":
		case "boolean":
			return String(value);
	}
	if (value === null) return "null";
	if (Array.isArray(value))
		return `[\n${value.map((item) => `${inner}${toLiteral(item, inner)},\n`).join("")}${indent}]`;
	if (
		typeof value !== "object" ||
		Object.getPrototypeOf(value) !== Object.prototype
	)
		throw new Error(`Cannot write ${String(value)} as a literal`);
	return `{\n${Object.entries(value)
		.map(
			([key, item]) =>
				`${inner}${PLAIN_KEY.test(key) ? key : JSON.stringify(key)}: ${toLiteral(item, inner)},\n`,
		)
		.join("")}${indent}}`;
};

export const writeFixture = ({
	out,
	header,
	type,
	name,
	value,
}: {
	out: string;
	header: string;
	type: string;
	name: string;
	value: unknown;
}) => {
	const exportBlock = `export const ${name}: ${type} = ${toLiteral(value)};\n`;
	const outPath = resolve(out);
	const source = existsSync(outPath) ? readFileSync(outPath, "utf8") : header;
	const existing = new RegExp(
		`export const ${name}: ${type} = \\{[\\s\\S]*?\\n\\};\\n`,
	);
	writeFileSync(
		outPath,
		existing.test(source)
			? source.replace(existing, exportBlock)
			: `${source}\n${exportBlock}`,
	);
	execFileSync("pnpm", ["exec", "biome", "format", "--write", outPath], {
		cwd: import.meta.dirname,
		stdio: "inherit",
	});
};
