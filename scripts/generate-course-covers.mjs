// Course covers drawn for Syllo: no photos, logos or the older pharmacy app's images.
//
//   npm run generate:course-covers
//
// Writes one SVG per seeded course (except Pharmacy Exam Prep, whose SVG is edited by hand) to
// assets/images/courses/source/, then renders every SVG in that folder to
// assets/images/courses/<slug>.jpg at 800x450 (the size the app's cards and hero expect).
// Each cover: a two-tone gradient, soft out-of-focus lights like a photo's bokeh, and a few
// simple objects for the subject, kept near the middle so square card crops still show them.
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "assets/images/courses/source");
const OUT = path.join(ROOT, "assets/images/courses");

const shadow = `<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#020617" flood-opacity="0.55"/></filter>`;

/** The shared frame: gradient, bokeh lights, a shadow filter, then the course's own art. */
function cover({ from, mid, to, glowA, glowB }, art, extraDefs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="0.55" stop-color="${mid}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="glowA" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${glowA}" stop-opacity="0.38"/><stop offset="1" stop-color="${glowA}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowB" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${glowB}" stop-opacity="0.32"/><stop offset="1" stop-color="${glowB}" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
    ${shadow}
    ${extraDefs}
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <g filter="url(#blur)">
    <circle cx="200" cy="160" r="160" fill="url(#glowA)"/>
    <circle cx="1430" cy="150" r="190" fill="url(#glowB)"/>
    <circle cx="1320" cy="770" r="170" fill="url(#glowA)"/>
    <circle cx="150" cy="760" r="130" fill="url(#glowB)"/>
    <circle cx="820" cy="70" r="90" fill="url(#glowA)"/>
  </g>
  <g fill="#FFFFFF" opacity="0.06"><circle cx="430" cy="640" r="60"/><circle cx="1190" cy="300" r="40"/><circle cx="990" cy="830" r="70"/></g>
${art}
</svg>
`;
}

/** A phone outline with a screen area; children are drawn in screen coordinates (0,0 = top left). */
function phone(x, y, rotate, screen, { w = 300, h = 600 } = {}) {
  return `<g transform="translate(${x} ${y}) rotate(${rotate})" filter="url(#shadow)">
    <rect width="${w}" height="${h}" rx="46" fill="#0F172A"/>
    <rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="34" fill="#F8FAFC"/>
    <rect x="${w / 2 - 40}" y="26" width="80" height="18" rx="9" fill="#0F172A"/>
    <g transform="translate(14 60)">${screen}</g>
  </g>`;
}

const COVERS = {
  // A phone with a component-built screen, a </> tag and a component tree.
  "react-native-basics": cover(
    { from: "#0B1D3A", mid: "#0E3A5C", to: "#0B5E78", glowA: "#FFFFFF", glowB: "#67E8F9" },
    `${phone(
      650,
      150,
      -4,
      `<rect x="20" y="10" width="232" height="120" rx="18" fill="#BAE6FD"/>
       <circle cx="70" cy="70" r="30" fill="#0EA5E9"/>
       <rect x="115" y="50" width="110" height="14" rx="7" fill="#0369A1"/><rect x="115" y="76" width="80" height="12" rx="6" fill="#38BDF8"/>
       <rect x="20" y="150" width="232" height="60" rx="14" fill="#E2E8F0"/><rect x="40" y="172" width="120" height="14" rx="7" fill="#94A3B8"/>
       <rect x="20" y="226" width="232" height="60" rx="14" fill="#E2E8F0"/><rect x="40" y="248" width="150" height="14" rx="7" fill="#94A3B8"/>
       <rect x="20" y="302" width="232" height="60" rx="14" fill="#E2E8F0"/><rect x="40" y="324" width="100" height="14" rx="7" fill="#94A3B8"/>
       <rect x="20" y="400" width="232" height="58" rx="29" fill="#0EA5E9"/><rect x="90" y="422" width="92" height="14" rx="7" fill="#FFFFFF"/>`,
    )}
    <g transform="translate(300 300) rotate(-8)" filter="url(#shadow)">
      <rect width="260" height="190" rx="28" fill="#1E293B"/>
      <text x="130" y="128" text-anchor="middle" font-family="Menlo, Consolas, monospace" font-size="96" font-weight="700" fill="#67E8F9">&lt;/&gt;</text>
    </g>
    <g transform="translate(1060 270)" filter="url(#shadow)" stroke="#E0F2FE" stroke-width="8" fill="none">
      <path d="M120 70 V130 M120 130 H40 V190 M120 130 H200 V190 M40 250 V300 H-10 V340 M40 300 H90 V340"/>
      <g stroke="none">
        <rect x="70" y="20" width="100" height="56" rx="14" fill="#38BDF8"/>
        <rect x="-10" y="190" width="100" height="56" rx="14" fill="#0EA5E9"/>
        <rect x="150" y="190" width="100" height="56" rx="14" fill="#0EA5E9"/>
        <rect x="-50" y="336" width="80" height="48" rx="12" fill="#7DD3FC"/>
        <rect x="50" y="336" width="80" height="48" rx="12" fill="#7DD3FC"/>
      </g>
    </g>`,
  ),

  // A colour palette, a layout wireframe and a pen nib with a curve.
  "ui-design-fundamentals": cover(
    { from: "#1E1B4B", mid: "#4C1D95", to: "#831843", glowA: "#FFFFFF", glowB: "#F9A8D4" },
    `<g transform="translate(230 250) rotate(-10)" filter="url(#shadow)">
      <rect width="330" height="400" rx="30" fill="#F8FAFC"/>
      <rect x="30" y="30" width="270" height="120" rx="18" fill="#E9D5FF"/>
      <rect x="30" y="170" width="125" height="90" rx="16" fill="#E2E8F0"/><rect x="175" y="170" width="125" height="90" rx="16" fill="#E2E8F0"/>
      <rect x="30" y="280" width="270" height="18" rx="9" fill="#CBD5E1"/><rect x="30" y="312" width="200" height="18" rx="9" fill="#CBD5E1"/>
      <rect x="30" y="346" width="120" height="30" rx="15" fill="#8B5CF6"/>
    </g>
    <g transform="translate(680 190)" filter="url(#shadow)">
      <rect width="260" height="470" rx="30" fill="#1E293B"/>
      <rect x="30" y="30" width="200" height="80" rx="16" fill="#F472B6"/>
      <rect x="30" y="126" width="200" height="80" rx="16" fill="#A78BFA"/>
      <rect x="30" y="222" width="200" height="80" rx="16" fill="#60A5FA"/>
      <rect x="30" y="318" width="200" height="80" rx="16" fill="#34D399"/>
      <rect x="30" y="414" width="96" height="30" rx="10" fill="#FBBF24"/><rect x="134" y="414" width="96" height="30" rx="10" fill="#F87171"/>
    </g>
    <g transform="translate(1040 260)" filter="url(#shadow)">
      <path d="M0 330 C 80 120, 240 420, 330 120" stroke="#FCE7F3" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="0" cy="330" r="16" fill="#F9A8D4"/><circle cx="330" cy="120" r="16" fill="#F9A8D4"/>
      <line x1="0" y1="330" x2="80" y2="120" stroke="#F9A8D4" stroke-width="4" stroke-dasharray="10 8"/>
      <circle cx="80" cy="120" r="12" fill="#FFFFFF"/>
      <g transform="translate(250 -40) rotate(35)">
        <path d="M0 0 L60 0 L60 120 L30 170 L0 120 Z" fill="#F8FAFC"/>
        <path d="M0 120 L30 170 L60 120 Z" fill="#E879F9"/><circle cx="30" cy="128" r="7" fill="#1E293B"/>
        <rect x="0" y="-30" width="60" height="40" rx="8" fill="#A78BFA"/>
      </g>
    </g>`,
  ),

  // A terminal with a ">>>" prompt, a code notebook and a friendly snake curve.
  "python-for-everyone": cover(
    { from: "#0C1E3E", mid: "#1D3A6E", to: "#3B3B12", glowA: "#FFFFFF", glowB: "#FDE68A" },
    `<g transform="translate(560 190)" filter="url(#shadow)">
      <rect width="560" height="380" rx="28" fill="#0F172A"/>
      <rect width="560" height="56" rx="28" fill="#1E293B"/><rect y="28" width="560" height="28" fill="#1E293B"/>
      <circle cx="40" cy="28" r="10" fill="#F87171"/><circle cx="72" cy="28" r="10" fill="#FBBF24"/><circle cx="104" cy="28" r="10" fill="#34D399"/>
      <g font-family="Menlo, Consolas, monospace" font-size="34" font-weight="700">
        <text x="36" y="120" fill="#FDE68A">&gt;&gt;&gt;</text><rect x="130" y="96" width="250" height="26" rx="8" fill="#60A5FA"/>
        <rect x="36" y="150" width="190" height="22" rx="8" fill="#94A3B8"/>
        <text x="36" y="232" fill="#FDE68A">&gt;&gt;&gt;</text><rect x="130" y="208" width="160" height="26" rx="8" fill="#60A5FA"/><rect x="300" y="208" width="120" height="26" rx="8" fill="#FCD34D"/>
        <rect x="36" y="262" width="300" height="22" rx="8" fill="#94A3B8"/>
        <text x="36" y="344" fill="#FDE68A">&gt;&gt;&gt;</text><rect x="130" y="322" width="18" height="30" fill="#E2E8F0"/>
      </g>
    </g>
    <g transform="translate(250 300) rotate(-9)" filter="url(#shadow)">
      <rect width="250" height="320" rx="24" fill="#F8FAFC"/>
      <rect x="0" width="40" height="320" rx="20" fill="#3B82F6"/><rect x="20" width="20" height="320" fill="#3B82F6"/>
      <rect x="66" y="40" width="150" height="18" rx="9" fill="#94A3B8"/><rect x="66" y="76" width="120" height="14" rx="7" fill="#CBD5E1"/>
      <rect x="66" y="120" width="150" height="70" rx="12" fill="#FEF3C7"/>
      <rect x="66" y="210" width="140" height="14" rx="7" fill="#CBD5E1"/><rect x="66" y="240" width="100" height="14" rx="7" fill="#CBD5E1"/>
    </g>
    <g transform="translate(1100 560)" filter="url(#shadow)">
      <path d="M0 120 C 60 0, 140 200, 220 80 S 330 40, 360 90" stroke="#FACC15" stroke-width="44" fill="none" stroke-linecap="round"/>
      <path d="M0 120 C 60 0, 140 200, 220 80 S 330 40, 360 90" stroke="#3B82F6" stroke-width="44" fill="none" stroke-linecap="round" stroke-dasharray="1 88" opacity="0.9"/>
      <circle cx="372" cy="86" r="34" fill="#FACC15"/><circle cx="384" cy="76" r="7" fill="#0F172A"/>
    </g>`,
  ),

  // A data table, a bar chart and a line chart with a magnifier.
  "data-analysis-pandas": cover(
    { from: "#0B1B3A", mid: "#1E1B4B", to: "#064E3B", glowA: "#FFFFFF", glowB: "#6EE7B7" },
    `<g transform="translate(220 230) rotate(-6)" filter="url(#shadow)">
      <rect width="380" height="320" rx="26" fill="#F8FAFC"/>
      <rect width="380" height="64" rx="26" fill="#6366F1"/><rect y="32" width="380" height="32" fill="#6366F1"/>
      <g fill="#E0E7FF"><rect x="24" y="22" width="90" height="20" rx="6"/><rect x="140" y="22" width="90" height="20" rx="6"/><rect x="256" y="22" width="90" height="20" rx="6"/></g>
      <g fill="#CBD5E1">
        <rect x="24" y="92" width="90" height="16" rx="6"/><rect x="140" y="92" width="70" height="16" rx="6"/><rect x="256" y="92" width="80" height="16" rx="6"/>
        <rect x="24" y="136" width="70" height="16" rx="6"/><rect x="140" y="136" width="90" height="16" rx="6"/><rect x="256" y="136" width="60" height="16" rx="6"/>
        <rect x="24" y="180" width="90" height="16" rx="6"/><rect x="140" y="180" width="60" height="16" rx="6"/><rect x="256" y="180" width="90" height="16" rx="6"/>
        <rect x="24" y="224" width="80" height="16" rx="6"/><rect x="140" y="224" width="90" height="16" rx="6"/><rect x="256" y="224" width="70" height="16" rx="6"/>
        <rect x="24" y="268" width="60" height="16" rx="6"/><rect x="140" y="268" width="80" height="16" rx="6"/><rect x="256" y="268" width="90" height="16" rx="6"/>
      </g>
    </g>
    <g transform="translate(690 180)" filter="url(#shadow)">
      <rect width="400" height="300" rx="26" fill="#1E293B"/>
      <line x1="40" y1="250" x2="360" y2="250" stroke="#475569" stroke-width="4"/>
      <rect x="60" y="150" width="50" height="100" rx="8" fill="#34D399"/><rect x="130" y="100" width="50" height="150" rx="8" fill="#6EE7B7"/>
      <rect x="200" y="170" width="50" height="80" rx="8" fill="#34D399"/><rect x="270" y="60" width="50" height="190" rx="8" fill="#A7F3D0"/>
    </g>
    <g transform="translate(860 520)" filter="url(#shadow)">
      <rect width="400" height="230" rx="26" fill="#F8FAFC"/>
      <polyline points="40,180 120,120 190,150 270,70 360,100" fill="none" stroke="#6366F1" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
      <g fill="#6366F1"><circle cx="40" cy="180" r="10"/><circle cx="120" cy="120" r="10"/><circle cx="190" cy="150" r="10"/><circle cx="270" cy="70" r="10"/><circle cx="360" cy="100" r="10"/></g>
    </g>
    <g transform="translate(1180 230)" filter="url(#shadow)">
      <circle cx="80" cy="80" r="70" fill="#ECFDF5" fill-opacity="0.25" stroke="#F8FAFC" stroke-width="18"/>
      <rect x="128" y="128" width="40" height="120" rx="20" transform="rotate(-45 148 188)" fill="#F8FAFC"/>
    </g>`,
  ),

  // A phone with stacked cards sliding, motion trails and an easing curve.
  "advanced-animations": cover(
    { from: "#1A103D", mid: "#3B0764", to: "#701A75", glowA: "#FFFFFF", glowB: "#F0ABFC" },
    `${phone(
      640,
      150,
      0,
      `<rect x="20" y="20" width="232" height="140" rx="20" fill="#E9D5FF"/>
       <rect x="40" y="185" width="232" height="140" rx="20" fill="#C084FC" opacity="0.55"/>
       <rect x="70" y="200" width="232" height="140" rx="20" fill="#A855F7" opacity="0.8"/>
       <rect x="100" y="215" width="232" height="140" rx="20" fill="#9333EA"/>
       <rect x="20" y="400" width="232" height="58" rx="29" fill="#F0ABFC"/>`,
    )}
    <g stroke="#F5D0FE" stroke-linecap="round" opacity="0.8">
      <line x1="980" y1="420" x2="1080" y2="420" stroke-width="10"/><line x1="990" y1="460" x2="1130" y2="460" stroke-width="10"/><line x1="1000" y1="500" x2="1060" y2="500" stroke-width="10"/>
    </g>
    <g transform="translate(240 270)" filter="url(#shadow)">
      <rect width="320" height="320" rx="28" fill="#1E293B"/>
      <line x1="40" y1="280" x2="280" y2="280" stroke="#475569" stroke-width="4"/><line x1="40" y1="280" x2="40" y2="40" stroke="#475569" stroke-width="4"/>
      <path d="M40 280 C 120 280, 140 40, 280 40" stroke="#F0ABFC" stroke-width="10" fill="none" stroke-linecap="round"/>
      <line x1="40" y1="280" x2="120" y2="280" stroke="#C084FC" stroke-width="4" stroke-dasharray="8 8"/><line x1="280" y1="40" x2="140" y2="40" stroke="#C084FC" stroke-width="4" stroke-dasharray="8 8"/>
      <circle cx="120" cy="280" r="12" fill="#FFFFFF"/><circle cx="140" cy="40" r="12" fill="#FFFFFF"/>
    </g>
    <g filter="url(#shadow)">
      <circle cx="1160" cy="300" r="46" fill="#F0ABFC" opacity="0.35"/><circle cx="1220" cy="300" r="46" fill="#F0ABFC" opacity="0.6"/><circle cx="1290" cy="300" r="46" fill="#FAE8FF"/>
    </g>`,
  ),

  // A board of components (button, toggle, input, chips) and colour tokens.
  "design-systems": cover(
    { from: "#0F172A", mid: "#134E4A", to: "#1E3A8A", glowA: "#FFFFFF", glowB: "#5EEAD4" },
    `<g transform="translate(230 200)" filter="url(#shadow)">
      <rect width="560" height="460" rx="32" fill="#F8FAFC"/>
      <rect x="40" y="40" width="200" height="64" rx="20" fill="#0D9488"/><rect x="80" y="64" width="120" height="16" rx="8" fill="#FFFFFF"/>
      <rect x="270" y="40" width="200" height="64" rx="20" fill="none" stroke="#0D9488" stroke-width="5"/><rect x="310" y="64" width="120" height="16" rx="8" fill="#0D9488"/>
      <rect x="40" y="140" width="480" height="64" rx="18" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="4"/><rect x="68" y="164" width="180" height="16" rx="8" fill="#CBD5E1"/>
      <rect x="40" y="240" width="110" height="60" rx="30" fill="#0D9488"/><circle cx="120" cy="270" r="22" fill="#FFFFFF"/>
      <rect x="180" y="240" width="110" height="60" rx="30" fill="#CBD5E1"/><circle cx="210" cy="270" r="22" fill="#FFFFFF"/>
      <rect x="40" y="336" width="120" height="46" rx="23" fill="#CCFBF1"/><rect x="176" y="336" width="140" height="46" rx="23" fill="#DBEAFE"/><rect x="332" y="336" width="110" height="46" rx="23" fill="#FCE7F3"/>
      <rect x="40" y="400" width="180" height="20" rx="10" fill="#94A3B8"/>
    </g>
    <g transform="translate(900 230)" filter="url(#shadow)">
      <rect width="440" height="400" rx="32" fill="#1E293B"/>
      <g>
        <rect x="40" y="40" width="160" height="90" rx="18" fill="#2DD4BF"/><rect x="40" y="140" width="110" height="14" rx="7" fill="#94A3B8"/>
        <rect x="240" y="40" width="160" height="90" rx="18" fill="#3B82F6"/><rect x="240" y="140" width="110" height="14" rx="7" fill="#94A3B8"/>
        <rect x="40" y="200" width="160" height="90" rx="18" fill="#F8FAFC"/><rect x="40" y="300" width="110" height="14" rx="7" fill="#94A3B8"/>
        <rect x="240" y="200" width="160" height="90" rx="18" fill="#0F172A" stroke="#475569" stroke-width="4"/><rect x="240" y="300" width="110" height="14" rx="7" fill="#94A3B8"/>
      </g>
      <g fill="#64748B"><rect x="40" y="346" width="20" height="20" rx="4"/><rect x="70" y="346" width="20" height="20" rx="10"/><rect x="100" y="346" width="20" height="20" rx="2"/></g>
    </g>`,
  ),
};

mkdirSync(SOURCE, { recursive: true });
for (const [slug, svg] of Object.entries(COVERS)) writeFileSync(path.join(SOURCE, `${slug}.svg`), svg);

for (const file of readdirSync(SOURCE).filter((name) => name.endsWith(".svg"))) {
  const slug = file.replace(/\.svg$/, "");
  const info = await sharp(path.join(SOURCE, file))
    .resize(800, 450)
    .flatten({ background: "#0F172A" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(OUT, `${slug}.jpg`));
  console.log(`${slug}.jpg ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)} KB`);
}
