/**
 * Prueba del renderizador de cuestionarios, sin navegador.
 *
 * La PWA no tiene infraestructura de pruebas, y eso permitió que un
 * `ReferenceError` en la función que dibuja cada pregunta viviera meses sin que
 * nadie lo notara: toda mujer que abría un cuestionario veía "Error al cargar
 * el formulario" (F41). Una verificación de sintaxis no lo habría encontrado,
 * porque la variable estaba mal usada, no mal escrita.
 *
 * Se monta un DOM mínimo, se extrae el script de assessment.html y se ejecuta
 * el render contra un esquema con los nueve tipos de pregunta.
 *
 *   node js/render.test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── DOM mínimo ─────────────────────────────────────────────────────────────

function crearElemento(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    children: [],
    dataset: {},
    style: {},
    attrs: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    hidden: false,
    appendChild(h) { this.children.push(h); return h; },
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    scrollIntoView() {},
    querySelectorAll(sel) {
      const clase = sel.replace(".", "");
      const salida = [];
      (function recorrer(n) {
        n.children.forEach((c) => {
          if (c.classList && c.classList.contains(clase)) salida.push(c);
          recorrer(c);
        });
      })(this);
      return salida;
    },
    get className() { return [...this.classList._s].join(" "); },
    set className(v) { this.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get innerHTML() { return this._html || ""; },
    set innerHTML(v) { this._html = v; if (v === "") this.children = []; },
  };
  return el;
}

const porId = {
  questionsList: crearElemento("div"),
  loading: crearElemento("div"),
  formContainer: crearElemento("div"),
};

const sandbox = {
  console,
  document: {
    createElement: crearElemento,
    getElementById: (id) => porId[id] || crearElemento("div"),
    querySelector: () => crearElemento("button"),
    addEventListener: () => {},
  },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  window: {},
  alert: (m) => { sandbox.__alertas.push(m); },
  fetch: () => Promise.reject(new Error("sin red en la prueba")),
  // El script se auto-ejecuta al cargar; sin este doble intentaría pedir el
  // formulario por red. La prueba llama a renderForm directamente.
  api: {
    getFormSchema: () => new Promise(() => {}),
    startSubmission: () => new Promise(() => {}),
    request: () => new Promise(() => {}),
    finalizeSubmission: () => new Promise(() => {}),
  },
  setTimeout,
  URLSearchParams,
  location: { href: "", search: "?code=TEST" },
  __alertas: [],
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

// ── Cargar el evaluador de condiciones y el script de la página ────────────

const raiz = path.join(__dirname, "..");
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(raiz, "js/conditions.js"), "utf8"), sandbox);

const html = fs.readFileSync(path.join(raiz, "assessment.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
vm.runInContext(scripts.join("\n"), sandbox);

// Las declaraciones con const y let no quedan como propiedades del contexto,
// así que se leen evaluando dentro de él.
const leer = (expr) => vm.runInContext(expr, sandbox);

// ── Esquema de prueba: los nueve tipos ─────────────────────────────────────

const opciones = (vals) =>
  vals.map((v, i) => ({ option_id: "o" + i, value: v, label_key: "opt." + v, score: i }));

const form = {
  form_id: "f1",
  code: "TEST",
  sections: [
    {
      section_id: "s1",
      title_key: "sec.principal",
      questions: [
        { question_id: "q1", data_key: "disparadora", text_key: "q.disparadora", type: "single", is_required: true, options: opciones(["si", "no"]) },
        { question_id: "q2", data_key: "frecuencia", text_key: "q.frecuencia", type: "single", show_if: "disparadora == 'si'", options: opciones(["0", "1", "2"]) },
        { question_id: "q3", data_key: "multiple", text_key: "q.multiple", type: "multi", options: opciones(["a", "b"]) },
        { question_id: "q4", data_key: "lista", text_key: "q.lista", type: "dropdown", options: opciones(["x", "y"]) },
        { question_id: "q5", data_key: "impacto", text_key: "q.impacto", type: "scale", config: { min: 0, max: 10 } },
        { question_id: "q6", data_key: "orden", text_key: "q.orden", type: "ranking", options: opciones(["p", "q", "r"]) },
        { question_id: "q7", data_key: "fecha", text_key: "q.fecha", type: "date" },
        { question_id: "q8", data_key: "edad", text_key: "q.edad", type: "text", ui_hint: "numeric_keyboard" },
        { question_id: "q9", data_key: "relato", text_key: "q.relato", type: "paragraph" },
        { question_id: "q10", text_key: "q.aviso", type: "info" },
      ],
    },
  ],
};

// ── Comprobaciones ─────────────────────────────────────────────────────────

let fallos = 0;
function comprobar(nombre, condicion, detalle) {
  if (condicion) {
    console.log("  ✓ " + nombre);
  } else {
    fallos += 1;
    console.log("  ✗ " + nombre + (detalle ? " — " + detalle : ""));
  }
}

console.log("\n  Renderizado del cuestionario\n");

let error = null;
try {
  sandbox.__form = form;
  leer("renderForm(globalThis.__form)");
} catch (e) {
  error = e;
}
comprobar("dibuja sin lanzar excepciones", error === null, error && error.message);

const montadas = leer("montadas");
comprobar("monta las diez preguntas", montadas.length === 10, "montadas: " + montadas.length);

const sinControl = montadas.filter(
  ({ card, q }) => q.type !== "info" && card.children.length < 2
);
comprobar("cada tipo dibuja su control", sinControl.length === 0,
  sinControl.map(({ q }) => q.type).join(", "));

console.log("\n  Lógica condicional\n");

const q2 = montadas.find((m) => m.q.question_id === "q2");
comprobar("la pregunta condicionada arranca oculta", q2.card.hidden === true);

leer("saveAnswer({ question_id: 'q1' }, 'si')");
comprobar("aparece cuando la disparadora la habilita", q2.card.hidden === false);

leer("saveAnswer({ question_id: 'q1' }, 'no')");
comprobar("vuelve a ocultarse al cambiar la respuesta", q2.card.hidden === true);

console.log("\n  Envío\n");

comprobar("una respuesta oculta no se considera visible",
  leer("estaVisible('q2')") === false);
comprobar("una respuesta a la vista sí", leer("estaVisible('q1')") === true);

console.log("");
if (fallos > 0) {
  console.log("  " + fallos + " fallo(s)\n");
  process.exit(1);
}
console.log("  todo correcto\n");
