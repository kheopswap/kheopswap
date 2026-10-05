#!/usr/bin/env node
// Drives Talisman in the run's container Chromium over raw CDP (agent-browser cannot see extension popups).
// Usage:
//   talisman.mjs list                                  open Talisman popups, one per line
//   talisman.mjs status                                print unlocked or locked
//   talisman.mjs unlock                                unlock with ~/.kheopswap/talisman.password
//   talisman.mjs text [--timeout 60]                   wait for a popup and print its text
//   talisman.mjs connect [--timeout 60]                approve a dapp connection request
//   talisman.mjs approve --signer <name> [--timeout 60] approve a signing request, only if <name> signs it
//   talisman.mjs reject [--timeout 60]                 reject the pending request
// A locked popup is unlocked with the password file first.
// Exit codes: 0 done, 1 no popup or button, 2 signer mismatch (nothing clicked), 3 wallet locked.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

const STATE = new URL("../.run/state.env", import.meta.url);
const PASSWORD = `${homedir()}/.kheopswap/talisman.password`;

if (!existsSync(STATE)) {
	console.error("no active run: run launch.sh first");
	process.exit(1);
}
const state = Object.fromEntries(
	[...readFileSync(STATE, "utf8").matchAll(/^export (\w+)=(.*)$/gm)].map(
		([, key, value]) => [key, value],
	),
);
const CDP = `http://127.0.0.1:${state.CDP}`;

const [command, ...rest] = process.argv.slice(2);
const option = (name, fallback) => {
	const index = rest.indexOf(`--${name}`);
	return index === -1 ? fallback : rest[index + 1];
};
const timeoutMs = Number(option("timeout", "60")) * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const listTargets = () =>
	fetch(`${CDP}/json`).then((response) => response.json());

const isExtensionPage = (target, path) =>
	target.type === "page" &&
	target.url.startsWith("chrome-extension://") &&
	new URL(target.url).pathname === path;

const listPopups = async () =>
	(await listTargets()).filter((target) =>
		isExtensionPage(target, "/popup.html"),
	);

const waitFor = async (find, what) => {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const found = await find();
		if (found) return found;
		await sleep(500);
	}
	console.error(`no ${what} within ${timeoutMs / 1000}s`);
	process.exit(1);
};

const waitForPopup = () =>
	waitFor(async () => (await listPopups())[0], "Talisman popup");

const connect = async (target) => {
	const ws = new WebSocket(target.webSocketDebuggerUrl);
	await new Promise((resolve, reject) => {
		ws.onopen = resolve;
		ws.onerror = reject;
	});
	let lastId = 0;
	const send = (method, params) =>
		new Promise((resolve) => {
			const id = ++lastId;
			const onMessage = (event) => {
				const message = JSON.parse(event.data);
				if (message.id !== id) return;
				ws.removeEventListener("message", onMessage);
				resolve(message.result);
			};
			ws.addEventListener("message", onMessage);
			ws.send(JSON.stringify({ id, method, params }));
		});
	const evaluate = async (expression) =>
		(
			await send("Runtime.evaluate", {
				expression,
				returnByValue: true,
				awaitPromise: true,
			})
		)?.result?.value;
	return { send, evaluate, close: () => ws.close() };
};

const readText = (page) => page.evaluate("document.body.innerText");

const isLocked = (text) =>
	/unlock/i.test(text) && /password/i.test(text) && !/approve/i.test(text);

const findWorker = async () =>
	(await listTargets()).find(
		(target) =>
			target.type === "service_worker" &&
			target.url.startsWith(state.EXTENSION),
	);

const openTab = (url) =>
	fetch(`${CDP}/json/new?${url}`, { method: "PUT" }).then((response) =>
		response.json(),
	);

const closeTab = (tab) => fetch(`${CDP}/json/close/${tab.id}`);

// Chromium stops an idle extension service worker; opening one of Talisman's pages starts it again.
const talismanWorker = async () => {
	const running = await findWorker();
	if (running) return running;
	const tab = await openTab(`${state.EXTENSION}/popup.html`);
	const worker = await waitFor(findWorker, "Talisman service worker");
	await closeTab(tab);
	return worker;
};

const isUnlocked = async () => {
	const page = await connect(await talismanWorker());
	const unlocked = await page.evaluate(
		`chrome.storage.session.get("password").then((session) => "password" in session)`,
	);
	page.close();
	return unlocked;
};

const tryClick = (page, matcher) =>
	page.evaluate(`(() => {
		const button = [...document.querySelectorAll("button")].find((b) => (${matcher})(b.innerText.trim()));
		if (!button || button.disabled) return null;
		button.click();
		return button.innerText.trim();
	})()`);

const clickButton = (page, matcher) =>
	waitFor(() => tryClick(page, matcher), `enabled button matching ${matcher}`);

const waitForClose = (target) =>
	waitFor(
		async () => !(await listPopups()).some((popup) => popup.id === target.id),
		"popup close after the click",
	);

const typePassword = async (page) => {
	if (!existsSync(PASSWORD)) {
		console.error(
			`Talisman is locked and ${PASSWORD} does not exist. Ask the user to unlock it; never guess the password.`,
		);
		process.exit(3);
	}
	const password = readFileSync(PASSWORD, "utf8").replace(/\r?\n$/, "");
	await page.evaluate(`document.querySelector("input[type=password]").focus()`);
	await page.send("Input.insertText", { text: password });
	await clickButton(page, `(t) => t === "Unlock"`);
	await waitFor(async () => {
		const text = await readText(page);
		if (text.includes("Talisman access denied")) {
			console.error(`Talisman rejected the password in ${PASSWORD}`);
			process.exit(3);
		}
		return !isLocked(text);
	}, "unlocked popup");
	console.error("unlocked Talisman with the password file");
};

const withPopup = async (action) => {
	const target = await waitForPopup();
	const page = await connect(target);
	await sleep(1000);
	let text = await readText(page);
	if (isLocked(text)) {
		await typePassword(page);
		await sleep(1000);
		text = await readText(page);
	}
	await action(page, text, target);
	page.close();
};

switch (command) {
	case "list":
		for (const popup of await listPopups())
			console.log(`${popup.id} ${popup.url}`);
		break;
	case "status": {
		const unlocked = await isUnlocked();
		console.log(unlocked ? "unlocked" : "locked");
		process.exit(unlocked ? 0 : 3);
		break;
	}
	case "unlock": {
		if (await isUnlocked()) {
			console.log("already unlocked");
			break;
		}
		const tab = await openTab(`${state.EXTENSION}/popup.html`);
		const page = await connect(tab);
		await waitFor(
			() => page.evaluate(`!!document.querySelector("input[type=password]")`),
			"password field",
		);
		await typePassword(page);
		page.close();
		await closeTab(tab);
		console.log((await isUnlocked()) ? "unlocked" : "still locked");
		break;
	}
	case "text":
		await withPopup((_page, text) => console.log(text));
		break;
	case "connect":
		await withPopup(async (page, _text, target) => {
			await tryClick(page, `(t) => t === "Connect All"`);
			console.log(
				`clicked ${await clickButton(page, `(t) => /^Connect \\d+$/.test(t)`)}`,
			);
			await waitForClose(target);
		});
		break;
	case "approve": {
		const signer = option("signer");
		if (!signer) {
			console.error("approve needs --signer <account name>");
			process.exit(1);
		}
		await withPopup(async (page, _text, target) => {
			await waitFor(
				() =>
					page.evaluate(
						`[...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Approve" && !b.disabled)`,
					),
				"enabled Approve button (the request is still being analysed)",
			);
			const text = await readText(page);
			if (!text.includes(signer)) {
				console.error(
					`signer "${signer}" not found in the request, nothing clicked:\n${text}`,
				);
				process.exit(2);
			}
			console.log(text);
			console.log(
				`clicked ${await clickButton(page, `(t) => t === "Approve"`)}`,
			);
			await waitForClose(target);
		});
		break;
	}
	case "reject":
		await withPopup(async (page, _text, target) => {
			console.log(
				`clicked ${await clickButton(page, `(t) => t === "Cancel" || t === "Reject"`)}`,
			);
			await waitForClose(target);
		});
		break;
	default:
		console.error(
			"usage: talisman.mjs list | status | unlock | text | connect | approve --signer <name> | reject",
		);
		process.exit(1);
}
