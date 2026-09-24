#!/bin/sh
# Pruebas de la PWA. No hay dependencias: sólo node.
#
#   ./test.sh
#
# Existen porque un ReferenceError en el renderizador dejó la pantalla de
# evaluación completamente muerta durante meses sin que nada lo señalara.
set -e
for prueba in js/conditions.test.js js/render.test.js; do
    node "$prueba"
done
