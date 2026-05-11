# Vela Frontend - Configuración

Este proyecto es una aplicación estática (HTML/JS puro). 
Para configurar la conexión con el backend:

1. El archivo principal de configuración es `js/api.js`.
2. Por defecto apunta a: `http://127.0.0.1:8001/api/v1`

## ─── API ──────────────────────────────────────────────────────────────────────

Para cambiar la URL de la API (por ejemplo, para producción), modifica la constante `API_URL` al inicio de `js/api.js`:

```javascript
// Local Development
const API_URL = 'http://127.0.0.1:8001/api/v1';

// Production Example
// const API_URL = 'https://api.vela.com/api/v1';
```
