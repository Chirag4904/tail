const express = require("express");
const { exec } = require("child_process");
const app = express();

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API to start a browser with a specified URL
app.get("/start", (req, res) => {
	const browser = req.query.browser.toLowerCase();
	const url = req.query.url;

	switch (browser) {
		case "chrome":
			exec(`start chrome ${url}`, (error, stdout, stderr) => {
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
			exec(`start firefox  ${url}`, (error, stdout, stderr) => {
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

	switch (browser) {
		case "chrome":
			exec(`taskkill /F /IM chrome.exe`, (error, stdout, stderr) => {
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
			exec(`taskkill /F /IM firefox.exe`, (error, stdout, stderr) => {
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
app.get("/geturl", (req, res) => {
	const browser = req.query.browser.toLowerCase();

	switch (browser) {
		case "chrome":
			exec(
				`start chrome --new-window "about:blank"`,
				(error, stdout, stderr) => {
					if (error) {
						console.error(`Error getting URL from Chrome: ${error.message}`);
						res.status(500).send("Failed to get URL from Chrome");
						return;
					}
					console.log("Retrieved URL from Chrome");
					res.send(stdout.trim());
				}
			);
			break;
		case "firefox":
			exec(`start firefox --new-tab "about:blank"`, (error, stdout, stderr) => {
				if (error) {
					console.error(`Error getting URL from Firefox: ${error.message}`);
					res.status(500).send("Failed to get URL from Firefox");
					return;
				}
				console.log("Retrieved URL from Firefox");
				res.send(stdout.trim());
			});
			break;
		default:
			res.status(400).send("Unsupported browser");
	}
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
