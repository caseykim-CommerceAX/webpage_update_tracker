import os from "node:os";

const requestedPort = Number.parseInt(process.argv[2] ?? "3000", 10);
const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65535
  ? requestedPort
  : 3000;

const addresses = Object.values(os.networkInterfaces())
  .flatMap((entries) => entries ?? [])
  .filter((entry) => (
    entry.family === "IPv4"
    && !entry.internal
    && !entry.address.startsWith("169.254.")
  ))
  .map((entry) => entry.address)
  .filter((address, index, all) => all.indexOf(address) === index);

console.log("");
console.log("Team access URL(s):");

if (addresses.length === 0) {
  console.log(`  http://<this-PC-IPv4>:${port}`);
} else {
  for (const address of addresses) {
    console.log(`  http://${address}:${port}`);
  }
}

console.log("");
