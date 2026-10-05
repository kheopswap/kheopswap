#!/usr/bin/env node
// Drives Talisman popups in the dev Chrome over raw CDP (agent-browser cannot see extension popups).
// Usage:
//   talisman.mjs list                                  open Talisman popups, one per line
//   talisman.mjs text [--timeout 60]                   wait for a popup and print its text
//   talisman.mjs connect [--timeout 60]                approve a dapp connection request
//   talisman.mjs approve --signer <name> [--timeout 60] approve a signing request, only if <name> signs it
//   talisman.mjs reject [--timeout 60]                 reject the pending request
// Exit codes: 0 done, 1 no popup or button, 2 signer mismatch (nothing clicked), 3 wallet locked.

const CDP = `http://127.0.0.1:${process.env.VERIFY_CDP_PORT ?? 9222}`;

const [command, ...rest] = process.argv.slice(2);
const option = (name, fallback) => {
	const index = rest.indexOf(`--${name}`);
	return index === -1 ? fallback : rest[index + 1];
};
const timeoutMs = Number(option("timeout", "60")) * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const listPopups = async () => {
	const targets = await fetch(`${CDP}/json`).then((response) =>
		response.json(),
	);
	return targets.filter(
		(target) =>
			target.type === "page" &&
			target.url.startsWith("chrome-extension://") &&
			new URL(target.url).pathname === "/popup.html",
	);
};

const waitForPopup = async () => {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const [popup] = await listPopups();
		if (popup) return popup;
		await sleep(500);
	}
	console.error(`no Talisman popup within ${timeoutMs / 1000}s`);
	process.exit(1);
};

const connect = async (target) => {
	const ws = new WebSocket(target.webSocketDebuggerUrl);
	await new Promise((resolve, reject) => {
		ws.onopen = resolve;
		ws.onerror = reject;
	});
	let lastId = 0;
	const evaluate = (expression) =>
		new Promise((resolve) => {
			const id = ++lastId;
			const onMessage = (event) => {
				const message = JSON.parse(event.data);
				if (message.id !== id) return;
				ws.removeEventListener("message", onMessage);
				resolve(message.result?.result?.value);
			};
			ws.addEventListener("message", onMessage);
			ws.send(
				JSON.stringify({
					id,
					method: "Runtime.evaluate",
					params: { expression, returnByValue: true, awaitPromise: true },
				}),
			);
		});
	return { evaluate, close: () => ws.close() };
};

const readText = (page) => page.evaluate("document.body.innerText");

const isLocked = (text) =>
	/unlock/i.test(text) && /password/i.test(text) && !/approve/i.test(text);

const tryClick = (page, matcher) =>
	page.evaluate(`(() => {
		const button = [...document.querySelectorAll("button")].find((b) => (${matcher})(b.innerText.trim()));
		if (!button || button.disabled) return null;
		button.click();
		return button.innerText.trim();
	})()`);

const clickButton = async (page, matcher) => {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const clicked = await tryClick(page, matcher);
		if (clicked) return clicked;
		await sleep(500);
	}
	console.error(
		`no enabled button matching ${matcher} within ${timeoutMs / 1000}s`,
	);
	process.exit(1);
};

const waitForClose = async (target) => {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const popups = await listPopups();
		if (!popups.some((popup) => popup.id === target.id)) return;
		await sleep(500);
	}
	console.error("popup still open after the click");
	process.exit(1);
};

const withPopup = async (action) => {
	const target = await waitForPopup();
	const page = await connect(target);
	await sleep(1000);
	const text = await readText(page);
	if (isLocked(text)) {
		page.close();
		console.error(
			"Talisman is locked. Ask the user to unlock it; never guess the password.",
		);
		process.exit(3);
	}
	await action(page, text, target);
	page.close();
};

switch (command) {
	case "list":
		for (const popup of await listPopups())
			console.log(`${popup.id} ${popup.url}`);
		break;
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
		await withPopup(async (page, text, target) => {
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
			"usage: talisman.mjs list | text | connect | approve --signer <name> | reject",
		);
		process.exit(1);
}
