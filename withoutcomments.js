const http = require("http"); 
const WebSocket = require("ws"); 
const fs = require("fs"); 
const path = require("path"); 
const readline = require("readline"); 

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
let lastSize = 0; 

wss.on("connection", async (ws) => {
	clients.push(ws); 
	const logFilePath = "success.log"; 

	const lastLines = await readLastLines(logFilePath, 10);
	ws.send(JSON.stringify(lastLines));
	ws.on("close", () => {
		clients = clients.filter((client) => client !== ws);
	});
});

const logFilePath = "success.log";
fs.watchFile(logFilePath, (curr, prev) => {
	if (curr.size > prev.size) {
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

		lastSize = curr.size; 
	}
});

server.listen(8082, () => {
	console.log("Server is listening on port 8082"); 
});
