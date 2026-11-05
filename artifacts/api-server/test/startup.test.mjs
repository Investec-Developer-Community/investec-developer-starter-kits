import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import test from "node:test";
import { fileURLToPath } from "node:url";

const entrypoint = new URL("../dist/index.mjs", import.meta.url);

function startServer(port) {
  const child = spawn(
    process.execPath,
    ["--enable-source-maps", fileURLToPath(entrypoint)],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        LOG_LEVEL: "info",
        PORT: port,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  const collect = (chunk) => {
    output += chunk;
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  const closed = once(child, "close");
  return { child, closed, output: () => output };
}

for (const port of [
  "0.5",
  "3001.5",
  "65536",
  "Infinity",
  "0",
  "-1",
  "",
  "invalid-config-marker",
]) {
  test(`rejects invalid PORT ${JSON.stringify(port)} without echoing configuration`, async () => {
    const server = startServer(port);
    const timeout = setTimeout(() => server.child.kill(), 5000);
    server.child.stdout.on("data", () => {
      if (server.output().includes("Server listening")) server.child.kill();
    });
    try {
      const [code] = await server.closed;
      assert.equal(code, 1, server.output());
      assert.doesNotMatch(
        server.output(),
        /Server listening|invalid-config-marker/,
      );
      assert.match(
        server.output(),
        /PORT must be an integer between 1 and 65535/,
      );
    } finally {
      clearTimeout(timeout);
      if (server.child.exitCode === null) server.child.kill();
    }
  });
}

test("valid PORT still serves the mock health endpoint", async () => {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const { port } = reservation.address();
  await new Promise((resolve, reject) => {
    reservation.close((error) => (error ? reject(error) : resolve()));
  });

  const server = startServer(String(port));
  const timeout = setTimeout(() => server.child.kill(), 5000);
  try {
    await new Promise((resolve, reject) => {
      server.child.stdout.on("data", () => {
        if (server.output().includes("Server listening")) resolve();
      });
      server.closed.then(() => reject(new Error(server.output())));
    });
    const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  } finally {
    clearTimeout(timeout);
    server.child.kill();
    await server.closed;
  }
});
