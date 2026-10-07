#!/usr/bin/env node
// Prepares Talisman in the container's Chromium the way a user would, through its own pages.
// Usage:
//   setup-wallet.mjs restore   restore /verify/wallet/talisman.json through support.html → Restore
//   setup-wallet.mjs unlock    unlock with /verify/wallet/talisman.password through popup.html
// Never queries the accessibility tree: on support.html that crashes the renderer.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const BACKUP = "/verify/wallet/talisman.json";
const PASSWORD = "/verify/wallet/talisman.password";
const TIMEOUT = 60_000;

const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
const context = browser.contexts()[0];

const isTalisman = (worker) => worker.url().startsWith("chrome-extension://");
const extensionOrigin = (worker) =>
	`chrome-extension://${new URL(worker.url()).host}`;
const talismanWorker = async () =>
	context.serviceWorkers().find(isTalisman) ??
	context.waitForEvent("serviceworker", {
		predicate: isTalisman,
		timeout: TIMEOUT,
	});

const clickButton = (page, label, { prefix = false } = {}) =>
	page.waitForFunction(
		({ label, prefix }) => {
			const button = [...document.querySelectorAll("button")]
				.filter((b) => {
					const text = b.textContent.trim();
					return (
						!b.disabled && (prefix ? text.startsWith(label) : text === label)
					);
				})
				.at(-1);
			button?.click();
			return !!button;
		},
		{ label, prefix },
		{ timeout: TIMEOUT },
	);

const closeOnboarding = async () => {
	for (const page of context.pages())
		if (page.url().includes("/onboarding.html")) await page.close();
};

const isOnboarded = (worker) =>
	worker.evaluate(() =>
		chrome.storage.local
			.get("app")
			.then(({ app }) => app?.onboarded === "TRUE"),
	);

const isUnlocked = (worker) =>
	worker.evaluate(() =>
		chrome.storage.session
			.get("password")
			.then((session) => "password" in session),
	);

const restore = async () => {
	const backup = JSON.parse(readFileSync(BACKUP, "utf8"));
	if (!backup.isTalismanBackup)
		throw new Error("~/.kheopswap/talisman.json is not a Talisman backup");
	const worker = await talismanWorker();
	const origin = extensionOrigin(worker);
	console.log(`extension ${origin}`);
	writeFileSync("/verify/extension", origin);
	await closeOnboarding();

	const page = await context.newPage();
	await page.goto(`${origin}/support.html`);
	await clickButton(page, "Restore", { prefix: true });
	await page.setInputFiles("input[type=file]", BACKUP);
	await page.waitForFunction(
		() => document.body.innerText.includes("Ready to restore"),
		null,
		{ timeout: TIMEOUT },
	);
	const reloaded = context.waitForEvent("serviceworker", {
		predicate: isTalisman,
		timeout: TIMEOUT,
	});
	await clickButton(page, "Restore");
	const restarted = await reloaded;
	console.log(`extension reloaded after the restore: ${restarted.url()}`);
	if (!(await isOnboarded(restarted)))
		throw new Error("wallet not onboarded after the restore");
	await closeOnboarding();
	console.log(
		`restored the backup of ${new Date(backup.timestamp).toISOString()}`,
	);
};

const unlock = async () => {
	const password = readFileSync(PASSWORD, "utf8").replace(/\r?\n$/, "");
	const worker = await talismanWorker();
	if (await isUnlocked(worker)) return console.log("already unlocked");
	const page = await context.newPage();
	await page.goto(`${extensionOrigin(worker)}/popup.html`);
	await page.locator("input[type=password]").fill(password);
	await clickButton(page, "Unlock");
	await page.waitForFunction(
		() => {
			const text = document.body.innerText;
			if (text.includes("Talisman access denied"))
				throw new Error("wrong password in ~/.kheopswap/talisman.password");
			return !text.includes("Unlock the Talisman");
		},
		null,
		{ timeout: TIMEOUT },
	);
	if (!(await isUnlocked(worker)))
		throw new Error("wallet still locked after the unlock");
	await page.close();
	console.log("unlocked");
};

const steps = { restore, unlock };
const step = steps[process.argv[2]];
if (!step) {
	console.error("usage: setup-wallet.mjs restore | unlock");
	process.exit(1);
}
await step();
process.exit(0);
