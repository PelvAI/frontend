/**
 * Evaluador de condiciones `show_if`.
 *
 * Las preguntas pueden declarar una condición que decide si se muestran, por
 * ejemplo `disparadora == 'si' and frecuencia > 2`. Hasta ahora nadie la
 * evaluaba —ni la aplicación ni el backend—, así que todo cuestionario
 * ramificado se comportaba como una lista plana y le preguntaba a todas cosas
 * que no correspondían (F22).
 *
 * No se usa `eval` ni `new Function` a propósito: la expresión viene de la
 * base de datos y esto corre en el teléfono de la paciente. Un analizador
 * propio sólo entiende lo que se le enseñó.
 *
 * La sintaxis sigue la de las fórmulas de puntuación, que el backend evalúa
 * con simpleeval, para que una condición signifique lo mismo de los dos lados:
 * los operandos son `data_key` de preguntas, y valen `and`, `or`, `not`, los
 * seis comparadores y los paréntesis.
 */
(function (global) {
  "use strict";

  const COMPARADORES = ["==", "!=", ">=", "<=", ">", "<"];
  const PALABRAS = { and: "and", or: "or", not: "not", true: true, false: false };

  function tokenizar(texto) {
    const tokens = [];
    let i = 0;

    while (i < texto.length) {
      const c = texto[i];

      if (/\s/.test(c)) {
        i += 1;
        continue;
      }

      if (c === "(" || c === ")") {
        tokens.push({ tipo: c });
        i += 1;
        continue;
      }

      const dos = texto.slice(i, i + 2);
      if (COMPARADORES.includes(dos)) {
        tokens.push({ tipo: "comparador", valor: dos });
        i += 2;
        continue;
      }
      if (COMPARADORES.includes(c)) {
        tokens.push({ tipo: "comparador", valor: c });
        i += 1;
        continue;
      }

      if (c === "'" || c === '"') {
        const cierre = texto.indexOf(c, i + 1);
        if (cierre === -1) throw new Error("Cadena sin cerrar en la condición");
        tokens.push({ tipo: "literal", valor: texto.slice(i + 1, cierre) });
        i = cierre + 1;
        continue;
      }

      const numero = /^-?\d+(\.\d+)?/.exec(texto.slice(i));
      if (numero) {
        tokens.push({ tipo: "literal", valor: parseFloat(numero[0]) });
        i += numero[0].length;
        continue;
      }

      const palabra = /^[A-Za-z_][A-Za-z0-9_]*/.exec(texto.slice(i));
      if (palabra) {
        const bruta = palabra[0];
        const clave = bruta.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(PALABRAS, clave)) {
          const valor = PALABRAS[clave];
          if (typeof valor === "boolean") {
            tokens.push({ tipo: "literal", valor: valor });
          } else {
            tokens.push({ tipo: valor });
          }
        } else {
          tokens.push({ tipo: "identificador", valor: bruta });
        }
        i += bruta.length;
        continue;
      }

      throw new Error("Carácter inesperado en la condición: " + c);
    }

    return tokens;
  }

  function analizar(tokens, contexto) {
    let pos = 0;

    const mirar = () => tokens[pos];
    const consumir = (tipo) => {
      if (!tokens[pos] || tokens[pos].tipo !== tipo) {
        throw new Error("Se esperaba " + tipo + " en la condición");
      }
      return tokens[pos++];
    };

    // Precedencia: or < and < not < comparación < primario
    function expresion() {
      let izq = conjuncion();
      while (mirar() && mirar().tipo === "or") {
        pos += 1;
        const der = conjuncion();
        izq = Boolean(izq) || Boolean(der);
      }
      return izq;
    }

    function conjuncion() {
      let izq = negacion();
      while (mirar() && mirar().tipo === "and") {
        pos += 1;
        const der = negacion();
        izq = Boolean(izq) && Boolean(der);
      }
      return izq;
    }

    function negacion() {
      if (mirar() && mirar().tipo === "not") {
        pos += 1;
        return !Boolean(negacion());
      }
      return comparacion();
    }

    function comparacion() {
      const izq = primario();
      if (mirar() && mirar().tipo === "comparador") {
        const op = consumir("comparador").valor;
        const der = primario();
        return comparar(izq, op, der);
      }
      return izq;
    }

    function primario() {
      const t = mirar();
      if (!t) throw new Error("Condición incompleta");

      if (t.tipo === "(") {
        pos += 1;
        const valor = expresion();
        consumir(")");
        return valor;
      }
      if (t.tipo === "literal") {
        pos += 1;
        return t.valor;
      }
      if (t.tipo === "identificador") {
        pos += 1;
        // Una pregunta sin responder vale indefinido, no cero: comparar contra
        // cero la daría por contestada.
        return Object.prototype.hasOwnProperty.call(contexto, t.valor)
          ? contexto[t.valor]
          : undefined;
      }
      throw new Error("Token inesperado en la condición");
    }

    const resultado = expresion();
    if (pos !== tokens.length) throw new Error("Sobra texto en la condición");
    return resultado;
  }

  function comparar(izq, op, der) {
    if (izq === undefined || der === undefined) {
      // Sin respuesta no hay comparación que valga: sólo "distinto de" puede
      // ser cierto, igual que en cualquier lenguaje con nulos.
      return op === "!=";
    }

    // Si los dos lados parecen números, se comparan como números. Las opciones
    // guardan su valor como texto ("3"), y comparar "10" < "9" alfabéticamente
    // daría lo contrario de lo esperado.
    const a = normalizar(izq);
    const b = normalizar(der);

    switch (op) {
      case "==": return a === b;
      case "!=": return a !== b;
      case ">":  return a > b;
      case "<":  return a < b;
      case ">=": return a >= b;
      case "<=": return a <= b;
      default:   throw new Error("Comparador desconocido: " + op);
    }
  }

  function normalizar(v) {
    if (typeof v === "number" || typeof v === "boolean") return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) {
      return Number(v);
    }
    return v;
  }

  /**
   * Devuelve true si la pregunta debe mostrarse.
   *
   * Ante una condición que no se entiende, la pregunta SE MUESTRA. En un
   * cuestionario clínico es preferible preguntar de más que ocultar algo por
   * un error de sintaxis y quedarse sin el dato.
   */
  function debeMostrarse(expresion, contexto) {
    if (!expresion || !String(expresion).trim()) return true;
    try {
      return Boolean(analizar(tokenizar(String(expresion)), contexto || {}));
    } catch (e) {
      console.warn("Condición ignorada:", expresion, "—", e.message);
      return true;
    }
  }

  const api = { debeMostrarse: debeMostrarse, tokenizar: tokenizar };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Condiciones = api;
})(typeof window !== "undefined" ? window : globalThis);
