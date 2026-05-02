const fs = require("fs");
const vm = require("vm");

const htmlPath = process.argv[2] || "diagnostic-test.html";
const html = fs.readFileSync(htmlPath, "utf8");
const start = html.indexOf("const levels = ");
const end = html.indexOf("const levelNav", start);

if (start < 0 || end < 0) {
  throw new Error("Could not locate diagnostic levels in diagnostic-test.html");
}

const source = html.slice(start, end) + "\nlevels;";
const levels = vm.runInNewContext(source, {});
process.stdout.write(JSON.stringify(levels, null, 2));
