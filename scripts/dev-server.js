const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = path.join(__dirname, "..");
const PORT = 3000;
const ENV_PATH = path.join(ROOT, ".env");

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    return;
  }

  fs.readFileSync(ENV_PATH, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
}

function createMockResponse(serverResponse) {
  const response = {
    statusCode: 200,
    setHeader(name, value) {
      serverResponse.setHeader(name, value);
      return this;
    },
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(payload) {
      serverResponse.writeHead(response.statusCode, {
        "Content-Type": "application/json; charset=utf-8",
      });
      serverResponse.end(JSON.stringify(payload));
    },
  };

  return response;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function serveStatic(urlPath, serverResponse) {
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.join(ROOT, path.normalize(safePath).replace(/^(\.\.[/\\])+/, ""));

  if (!filePath.startsWith(ROOT)) {
    serverResponse.writeHead(403);
    serverResponse.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      serverResponse.writeHead(error.code === "ENOENT" ? 404 : 500);
      serverResponse.end(error.code === "ENOENT" ? "Not Found" : "Internal Server Error");
      return;
    }

    serverResponse.writeHead(200, { "Content-Type": getContentType(filePath) });
    serverResponse.end(content);
  });
}

async function handleApiRequest(request, serverResponse) {
  const bodyText = await readRequestBody(request);

  try {
    request.body = bodyText ? JSON.parse(bodyText) : {};
  } catch (error) {
    serverResponse.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    serverResponse.end(JSON.stringify({ success: false, error: "JSON 형식이 올바르지 않습니다." }));
    return;
  }

  const geminiHandler = require(path.join(ROOT, "api", "gemini-counseling.js"));
  await geminiHandler(request, createMockResponse(serverResponse));
}

loadEnvFile();

const server = http.createServer(async (request, serverResponse) => {
  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);

  if (url.pathname === "/api/gemini-counseling") {
    await handleApiRequest(request, serverResponse);
    return;
  }

  serveStatic(url.pathname, serverResponse);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Dev server running at http://127.0.0.1:${PORT}`);
  console.log("API route: http://127.0.0.1:3000/api/gemini-counseling");
});
