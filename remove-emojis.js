const fs = require('fs');
const path = require('path');

// Only target actual emoji characters - NOT copyright/registered symbols
// Using specific emoji ranges that won't affect code
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{1FA00}-\u{1FA9F}]|[\u{1FAA0}-\u{1FAFF}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2600}-\u{2604}]|[\u{260E}]|[\u{2611}]|[\u{2614}-\u{2615}]|[\u{2618}]|[\u{261D}]|[\u{2620}]|[\u{2622}-\u{2623}]|[\u{2626}]|[\u{262A}]|[\u{262E}-\u{262F}]|[\u{2638}-\u{263A}]|[\u{2640}]|[\u{2642}]|[\u{2648}-\u{2653}]|[\u{265F}-\u{2660}]|[\u{2663}]|[\u{2665}-\u{2666}]|[\u{2668}]|[\u{267B}]|[\u{267E}-\u{267F}]|[\u{2692}-\u{2697}]|[\u{2699}]|[\u{269B}-\u{269C}]|[\u{26A0}-\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26B0}-\u{26B1}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}-\u{26CF}]|[\u{26D1}]|[\u{26D3}-\u{26D4}]|[\u{26E9}-\u{26EA}]|[\u{26F0}-\u{26F5}]|[\u{26F7}-\u{26FA}]|[\u{26FD}]|[\u{FE0F}]/gu;

const SRC_DIR = path.join(__dirname, 'frontend', 'src');
const EXTENSIONS = ['.jsx', '.js'];
const SKIP = ['node_modules', 'dist', '.git'];

let totalFixed = 0;
let totalFiles = 0;

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP.some(s => entry.name.includes(s))) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  totalFiles++;
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(EMOJI_REGEX, '');

  if (updated !== content) {
    // Write with same line endings as original
    fs.writeFileSync(filePath, updated, 'utf8');
    totalFixed++;
    console.log('Fixed:', path.relative(SRC_DIR, filePath));
  }
}

walkDir(SRC_DIR);
console.log(`\nDone. Scanned ${totalFiles} files, fixed ${totalFixed} files.`);
