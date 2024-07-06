// const http = require("http");
// const WebSocket = require("ws");
// const fs = require("fs");
// const path = require("path");
// const readline = require("readline");

// // Function to read the last N lines from a file
// const readLastLines = async (filePath, numLines) => {
// 	const lines = [];
// 	const fileStream = fs.createReadStream(filePath, {
// 		encoding: "utf8",
// 		start: 0,
// 	});

// 	const rl = readline.createInterface({
// 		input: fileStream,
// 		crlfDelay: Infinity,
// 	});

// 	for await (const line of rl) {
// 		lines.push(line);
// 		if (lines.length > numLines) {
// 			lines.shift();
// 		}
// 	}

// 	return lines;
// };

// // Create HTTP server
// const server = http.createServer((req, res) => {
// 	if (req.url === "/log") {
// 		fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
// 			if (err) {
// 				res.writeHead(500);
// 				return res.end("Error loading index.html");
// 			}
// 			res.writeHead(200);
// 			res.end(data);
// 		});
// 	}
// });

// const wss = new WebSocket.Server({ server });

// let clients = [];

// // Handle WebSocket connections
// wss.on("connection", async (ws) => {
// 	clients.push(ws);
// 	const logFilePath = "success.log";

// 	// Send the last 10 lines initially
// 	const lastLines = await readLastLines(logFilePath, 10);
// 	ws.send(JSON.stringify(lastLines));

// 	// Handle new lines appended to the log file
// 	const fileStream = fs.createReadStream(logFilePath, {
// 		encoding: "utf8",
// 		flags: "r",
// 		start: fs.statSync(logFilePath).size,
// 	});

// 	fileStream.on("data", (data) => {
// 		console.log("data,fafaf", data);
// 		const newLines = data.split("\n");
// 		newLines.forEach((line) => {
// 			if (line.trim()) {
// 				clients.forEach((client) => {
// 					if (client.readyState === WebSocket.OPEN) {
// 						client.send(JSON.stringify([line]));
// 					}
// 				});
// 			}
// 		});
// 	});

// 	ws.on("close", () => {
// 		clients = clients.filter((client) => client !== ws);
// 	});
// });

// server.listen(8082, () => {
// 	console.log("Server is listening on port 8080");
// });

// server.js
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Function to read the last N lines from a file
const readLastLines = async (filePath, numLines) => {
	const lines = [];
	const fileStream = fs.createReadStream(filePath, {
		encoding: "utf8",
		start: 0,
	});

	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	});

	for await (const line of rl) {
		lines.push(line);
		if (lines.length > numLines) {
			lines.shift();
		}
	}

	return lines;
};

// Create HTTP server
const server = http.createServer((req, res) => {
	if (req.url === "/log") {
		fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
			if (err) {
				res.writeHead(500);
				return res.end("Error loading index.html");
			}
			res.writeHead(200);
			res.end(data);
		});
	}
});

const wss = new WebSocket.Server({ server });

let clients = [];
let lastSize = 0; // Track the size of the log file

// Handle WebSocket connections
wss.on("connection", async (ws) => {
	clients.push(ws);
	const logFilePath = "success.log";

	// Send the last 10 lines initially
	const lastLines = await readLastLines(logFilePath, 10);
	ws.send(JSON.stringify(lastLines));

	// Handle client disconnection
	ws.on("close", () => {
		clients = clients.filter((client) => client !== ws);
	});
});

// Watch the log file for changes
const logFilePath = "success.log";
fs.watchFile(logFilePath, (curr, prev) => {
	if (curr.size > prev.size) {
		// New data has been added to the file
		const stream = fs.createReadStream(logFilePath, {
			encoding: "utf8",
			start: lastSize,
		});

		stream.on("data", (data) => {
			const newLines = data.split("\n").filter((line) => line.trim());
			newLines.forEach((line) => {
				clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify([line]));
					}
				});
			});
		});

		lastSize = curr.size; // Update the last known size of the file
	}
});

server.listen(8082, () => {
	console.log("Server is listening on port 8080");
});
