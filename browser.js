const express = require("express");
const { exec } = require("child_process");
const app = express();
const { platform } = require("os");
const CDP = require("chrome-remote-interface");

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API to start a browser with a specified URL
app.get("/start", (req, res) => {
	const browser = req.query.browser.toLowerCase();
	const url = req.query.url;
	let command;
	switch (browser) {
		case "chrome":
			if (process.platform === "win32") {
				command = `start chrome ${url}`;
			} else if (process.platform === "darwin") {
				command = `open -a "Google Chrome" ${url}`;
			}
			exec(command, (error, stdout, stderr) => {
				if (error) {
					console.error(`Error starting Chrome: ${error.message}`);
					res.status(500).send("Failed to start Chrome");
					return;
				}
				console.log(`Chrome started with URL: ${url}`);
				res.send(`Chrome started with URL: ${url}`);
			});
			break;
		case "firefox":
			if (process.platform === "win32") {
				command = `start firefox ${url}`;
			} else if (process.platform === "darwin") {
				command = `open -a "Firefox" ${url}`;
			}
			exec(command, (error, stdout, stderr) => {
				if (error) {
					console.error(`Error starting Firefox: ${error.message}`);
					res.status(500).send("Failed to start Firefox");
					return;
				}
				console.log(`Firefox started with URL: ${url}`);
				res.send(`Firefox started with URL: ${url}`);
			});
			break;
		default:
			res.status(400).send("Unsupported browser");
	}
});

// API to stop/close a browser
app.get("/stop", (req, res) => {
	const browser = req.query.browser.toLowerCase();
	let command;
	switch (browser) {
		case "chrome":
			if (process.platform === "win32") {
				command = `taskkill /F /IM chrome.exe`;
			} else if (process.platform === "darwin") {
				command = `pkill -f "Google Chrome"`;
			}

			exec(command, (error, stdout, stderr) => {
				if (error) {
					console.error(`Error stopping Chrome: ${error.message}`);
					res.status(500).send("Failed to stop Chrome");
					return;
				}
				console.log("Chrome stopped");
				res.send("Chrome stopped");
			});
			break;
		case "firefox":
			if (process.platform === "win32") {
				command = `taskkill /F /IM firefox.exe`;
			} else if (process.platform === "darwin") {
				command = `pkill -f "Firefox"`;
			}
			exec(command, (error, stdout, stderr) => {
				if (error) {
					console.error(`Error stopping Firefox: ${error.message}`);
					res.status(500).send("Failed to stop Firefox");
					return;
				}
				console.log("Firefox stopped");
				res.send("Firefox stopped");
			});
			break;
		default:
			res.status(400).send("Unsupported browser");
	}
});

function cleanUp() {
	exec(
		`rm ~/.mozilla/firefox/*.default/*.sqlite ~/.mozilla/firefox/*default/sessionstore.js`
	);
	exec(`rm -r ~/.cache/mozilla/firefox/*.default/*`);
}

// API to cleanup browser session information
app.get("/cleanup", (req, res) => {
	const browser = req.query.browser.toLowerCase();

	switch (browser) {
		case "chrome":
			exec(`start chrome --clear-browsing-data`, (error, stdout, stderr) => {
				if (error) {
					console.error(`Error cleaning up Chrome: ${error.message}`);
					res.status(500).send("Failed to cleanup Chrome");
					return;
				}
				console.log("Chrome session cleaned up");
				res.send("Chrome session cleaned up");
			});
			break;
		case "firefox":
			cleanUp();
			break;
		default:
			res.status(400).send("Unsupported browser");
	}
});

// API to get the current active tab's URL
app.get("/geturl", async (req, res) => {
	const browser = req.query.browser.toLowerCase();

	if (browser === "chrome") {
		try {
			// Connect to Chrome via CDP
			const client = await CDP();
			const { Target } = client;

			// Get a list of all open tabs
			const targets = await Target.getTargets();
			const activeTarget = targets.targetInfos.find(
				(target) => target.type === "page" && target.attached
			);

			if (!activeTarget) {
				throw new Error("No active tab found");
			}

			// Attach to the active tab
			const { sessionId } = await Target.attachToTarget({
				targetId: activeTarget.targetId,
				flatten: true,
			});

			// Get the current URL of the active tab
			const { result } = await client.send("Runtime.evaluate", {
				expression: "window.location.href",
				returnByValue: true,
				awaitPromise: true,
				contextId: activeTarget.targetId,
			});

			const activeUrl = result.value;
			await client.close();

			console.log(`Active tab URL in Chrome: ${activeUrl}`);
			res.send(activeUrl);
		} catch (err) {
			console.error("Error getting URL from Chrome:", err);
			res.status(500).send("Failed to get URL from Chrome");
		}
	} else {
		res.status(400).send("Unsupported browser");
	}
});
// Start the server
const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
