# 🌸 ALMA Care — Patient Web App

Aplicación web para pacientes de **ALMA Care** (módulo B2C de **ALMA Health Intelligence System**), diseñada para realizar evaluaciones clínicas (DOM 07 — SUELO), seguimiento de progreso y visualización de rutinas de entrenamiento.

## 🛠️ Tecnologías
- **Core**: HTML5, Vanilla JavaScript.
- **Estilos**: CSS3 con variables personalizadas para Temas (Light/Dark).
- **Comunicación**: Fetch API integrada en `js/api.js`.

## 🚀 Inicio Rápido

1. **Configuración de API**:
   O backend Alma deve correr em `http://127.0.0.1:8001`. Por omissão `js/api.js` aponta para `/api/v1`.
   Em produção: `cp js/config.example.js js/config.js` e carrega `config.js` antes de `api.js`.
   Detalhe do contrato (chat, portas): [`config.example.md`](./config.example.md).

2. **Servidor Local**:
   ```bash
   python3 -m http.server 8080
   ```

3. **Acceso**:
   - **Email**: `test@alma.com` ou `ana@alma.com` (seed do backend)
   - **Password**: qualquer (modo dev / UID mock)

4. **Chat**:
   A app **nunca** chama o chatbot (`:8000`) — só o backend. Body de envio: `{ "content": "..." }`; texto AI: `content_encrypted`.

---

## 🏗️ Estructura
- `/js`: Lógica de API y sistema de traducciones.
- `/css`: Estilos globales y componentes UI.
- `/assets`: Imágenes y recursos visuales.
- `index.html`: Pantalla de Login / Entrada.
- `dashboard.html`: Vista principal del paciente.
