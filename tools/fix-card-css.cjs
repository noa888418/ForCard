const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "styles.css");
let s = fs.readFileSync(file, "utf8");

// Fix broken triple selectors: ".card--special ., .card--color ., .card--fort .foo" -> proper
s = s.replace(
  /\.card--special \., \.card--color \., \.card--fort \.([^\s{]+)/g,
  ".card--special .$1, .card--color .$1, .card--fort .$1"
);

// Fix effect-changed line: ".card--fort.effect-changed .card-visual" was merged wrong
s = s.replace(
  /\.card--special\.effect-changed, \.card--color\.effect-changed, \.card--fort\.effect-changed \.card-visual/g,
  ".card--special.effect-changed .card-visual, .card--color.effect-changed .card-visual, .card--fort.effect-changed .card-visual"
);

fs.writeFileSync(file, s);
console.log("fixed");
