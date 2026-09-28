/**
 * Pruebas del evaluador de condiciones `show_if`.
 *
 *   node js/conditions.test.js
 */
"use strict";

const { debeMostrarse } = require("./conditions.js");

const casos = [
  // [nombre, expresión, contexto, esperado]
  ["sin condición se muestra", "", {}, true],
  ["igualdad de texto", "disparadora == 'si'", { disparadora: "si" }, true],
  ["igualdad que no se cumple", "disparadora == 'si'", { disparadora: "no" }, false],
  ["comillas dobles", 'disparadora == "si"', { disparadora: "si" }, true],

  // Las opciones guardan su valor como texto: comparar alfabéticamente daría
  // lo contrario de lo esperado justo en los casos altos, que son los graves.
  ["número guardado como texto", "freq > 2", { freq: "3" }, true],
  ["diez es mayor que nueve", "freq > 9", { freq: "10" }, true],
  ["decimales", "puntaje >= 2.5", { puntaje: "2.5" }, true],

  ["conjunción", "a == 1 and b == 2", { a: 1, b: 2 }, true],
  ["conjunción parcial", "a == 1 and b == 2", { a: 1, b: 5 }, false],
  ["disyunción", "a == 1 or b == 2", { a: 9, b: 2 }, true],
  ["negación", "not (a == 1)", { a: 2 }, true],
  ["precedencia con paréntesis", "(a == 1 or b == 1) and c == 1", { a: 0, b: 1, c: 1 }, true],
  ["precedencia sin paréntesis", "a == 1 or b == 1 and c == 1", { a: 1, b: 0, c: 0 }, true],
  ["mayúsculas", "a == 1 AND b == 2", { a: 1, b: 2 }, true],

  // Una pregunta sin responder no vale cero: darla por contestada haría
  // aparecer preguntas que dependen de algo que nadie dijo.
  ["sin responder no satisface", "freq > 2", {}, false],
  ["sin responder es distinto de todo", "freq != 'si'", {}, true],
  ["sin responder no es igual a nada", "freq == 'si'", {}, false],

  // Ante una condición que no se entiende la pregunta SE MUESTRA: en un
  // cuestionario clínico es preferible preguntar de más que perder el dato.
  ["sintaxis rota se muestra", "a == == 1", { a: 1 }, true],
  ["identificador suelto", "a", { a: true }, true],
  ["intento de inyección se muestra", "a); alert(1); (", { a: 1 }, true],
  ["comilla sin cerrar se muestra", "a == 'si", { a: "si" }, true],
];

let fallos = 0;
console.log("\n  Evaluador de condiciones\n");

for (const [nombre, expr, ctx, esperado] of casos) {
  let obtenido;
  try {
    obtenido = debeMostrarse(expr, ctx);
  } catch (e) {
    obtenido = "excepción: " + e.message;
  }
  if (obtenido === esperado) {
    console.log("  ✓ " + nombre);
  } else {
    fallos += 1;
    console.log("  ✗ " + nombre + " — esperaba " + esperado + ", dio " + obtenido);
  }
}

console.log("");
if (fallos > 0) {
  console.log("  " + fallos + " fallo(s)\n");
  process.exit(1);
}
console.log("  todo correcto\n");
