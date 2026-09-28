/**
 * Prueba del formateador de fechas del listado de evaluaciones.
 *
 *   node js/evaluations.test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "evaluations.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

const sandbox = {
  console,
  document: { getElementById: () => ({ innerHTML: "" }), addEventListener: () => {} },
  localStorage: { getItem: () => null },
  api: { getForms: () => new Promise(() => {}) },
  Date,
  isNaN,
  Math,
  setTimeout,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(scripts.join("\n"), sandbox);
const leer = (expr) => vm.runInContext(expr, sandbox);

const dia = 86400000;
const enDias = (n) => new Date(Date.now() + n * dia + 3600000).toISOString();

const casos = [
  ["sin fecha", "cuando(null)", "más adelante"],
  ["fecha inválida", "cuando('no es una fecha')", "más adelante"],
  ["ya pasó", `cuando('${enDias(-5)}')`, "hoy"],
  ["mañana", `cuando('${enDias(1)}')`, "mañana"],
  ["esta semana", `cuando('${enDias(3)}')`, "en 3 días"],
];

let fallos = 0;
console.log("\n  Listado de evaluaciones\n");
for (const [nombre, expr, esperado] of casos) {
  const r = leer(expr);
  const ok = r === esperado;
  if (!ok) fallos += 1;
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${ok ? "" : ` — esperaba "${esperado}", dio "${r}"`}`);
}

// Más allá de una semana devuelve una fecha con nombre de mes, no un conteo.
const lejano = leer(`cuando('${enDias(40)}')`);
const okLejano = /^el \d+ de \p{L}+$/u.test(lejano);
if (!okLejano) fallos += 1;
console.log(`  ${okLejano ? "✓" : "✗"} fecha lejana nombra el día y el mes — "${lejano}"`);

console.log("");
if (fallos > 0) { console.log(`  ${fallos} fallo(s)\n`); process.exit(1); }
console.log("  todo correcto\n");
