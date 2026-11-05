// Builds the pandas project dataset (prompts/19): a reproducible 1-in-5 sample of one week of
// London Santander Cycles journeys from TfL's open data portal.
//
//   node scripts/build-tfl-sample.mjs [path/to/JourneyDataExtract.csv]
//
// Input: a usage-stats journey extract from https://cycling.data.tfl.gov.uk/ (default: the
// file named in course-sources.json, saved in scratchpad/). Output:
// scratchpad/datasets/london-bike-trips-18-24-may-2026.csv (git-ignored; uploaded to R2 as a
// lesson resource by `npm run upload:lesson-videos`).
//
// Kept: start and end date/time, start and end station names, bike model and duration (ms).
// Dropped: the journey number, the bike number and the station numbers (no identifiers of bikes).
// A journey is kept when the first byte of md5(journey number) is divisible by 5, so the sample
// is the same on every run and independent of row order.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const registry = JSON.parse(readFileSync(path.join(ROOT, "supabase/seeds/source/course-sources.json"), "utf8"));
const dataset = registry.datasets["tfl-cycles"];
const input = process.argv[2] ?? path.join(ROOT, "scratchpad", path.basename(dataset.file));
const OUTPUT = path.join(ROOT, "scratchpad/datasets/london-bike-trips-18-24-may-2026.csv");
const FROM = "2026-05-18"; // Monday
const TO = "2026-05-25"; // up to, not including, the next Monday
const KEEP = ["Start date", "Start station", "End date", "End station", "Bike model", "Total duration (ms)"];

/** One CSV line → fields (quoted fields may contain commas and "" escapes). */
function parseLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      fields.push(field);
      field = "";
    } else field += ch;
  }
  fields.push(field);
  return fields;
}
const csvField = (value) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

const lines = readFileSync(input, "utf8").split(/\r?\n/).filter(Boolean);
const header = parseLine(lines[0]);
const at = (name) => {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`Column "${name}" not found in ${path.basename(input)}`);
  return index;
};
const number = at("Number");
const start = at("Start date");
const keep = KEEP.map(at);

let inWeek = 0;
const out = [KEEP.join(",")];
for (const line of lines.slice(1)) {
  const row = parseLine(line);
  const date = row[start];
  if (!(date >= FROM && date < TO)) continue;
  inWeek++;
  const byte = createHash("md5").update(row[number]).digest()[0];
  if (byte % 5 !== 0) continue;
  out.push(keep.map((i) => csvField(row[i])).join(","));
}

mkdirSync(path.dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${out.join("\n")}\n`);
const mb = (statSync(OUTPUT).size / 1e6).toFixed(2);
console.log(`Week ${FROM} to ${TO}: ${inWeek} journeys → sample of ${out.length - 1} (${((100 * (out.length - 1)) / inWeek).toFixed(1)}%), ${mb} MB`);
console.log(`Wrote ${path.relative(ROOT, OUTPUT)}`);
