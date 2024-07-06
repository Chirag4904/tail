// Import necessary modules
const http = require("http"); // HTTP server module
const WebSocket = require("ws"); // WebSocket module for real-time communication
const fs = require("fs"); // File system module to interact with the file system
const path = require("path"); // Path module for file and directory path operations
const readline = require("readline"); // Module to read lines from a file

// Function to read the last N lines from a file asynchronously
const readLastLines = async (filePath, numLines) => {
	const lines = []; // Array to store the lines
	const fileStream = fs.createReadStream(filePath, {
		// Create a readable stream for the file
		encoding: "utf8",
		start: 0, // Start reading from the beginning
	});

	// Create an interface for reading lines from the file stream
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity, // Recognize all instances of CR LF as a single line break
	});

	// Iterate through each line in the file
	for await (const line of rl) {
		lines.push(line); // Add the line to the array
		if (lines.length > numLines) {
			lines.shift(); // Remove the first line if the array exceeds the specified number of lines
		}
	}

	return lines; // Return the last N lines
};

// Create an HTTP server to serve the client page
const server = http.createServer((req, res) => {
	if (req.url === "/log") {
		// Check if the request URL is "/log"
		// Read the "index.html" file and serve it
		fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
			if (err) {
				res.writeHead(500); // Send a 500 error if the file cannot be read
				return res.end("Error loading index.html"); // Send error message to the client
			}
			res.writeHead(200); // Send a 200 OK status code
			res.end(data); // Send the content of the "index.html" file
		});
	}
});

// Create a WebSocket server attached to the HTTP server
const wss = new WebSocket.Server({ server });

let clients = []; // Array to store connected clients
let lastSize = 0; // Variable to track the last read size of the log file

// Handle new WebSocket connections
wss.on("connection", async (ws) => {
	clients.push(ws); // Add the new client to the list of clients
	const logFilePath = "success.log"; // Path to the log file

	// Read and send the last 10 lines of the log file to the new client
	const lastLines = await readLastLines(logFilePath, 10);
	ws.send(JSON.stringify(lastLines)); // Send the lines as a JSON string

	// Handle client disconnection
	ws.on("close", () => {
		// Remove the client from the list of clients
		clients = clients.filter((client) => client !== ws);
	});
});

// Watch the log file for changes
const logFilePath = "success.log";
fs.watchFile(logFilePath, (curr, prev) => {
	if (curr.size > prev.size) {
		// Check if the file size has increased
		// Create a readable stream starting from the last read position
		const stream = fs.createReadStream(logFilePath, {
			encoding: "utf8",
			start: lastSize, // Start reading from the last known size of the file
		});

		// Read new data from the stream
		stream.on("data", (data) => {
			// Split the data into lines and filter out empty lines
			const newLines = data.split("\n").filter((line) => line.trim());
			newLines.forEach((line) => {
				// Send each new line to all connected clients
				clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify([line])); // Send the line as a JSON string
					}
				});
			});
		});

		lastSize = curr.size; // Update the last known size of the file
	}
});

// Start the HTTP server and listen on port 8082
server.listen(8082, () => {
	console.log("Server is listening on port 8082"); // Log a message indicating the server is running
});
