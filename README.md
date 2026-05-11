# 🌸 Vela Patient Web App

Aplicación web para pacientes de **Vela**, diseñada para realizar evaluaciones clínicas, seguimiento de progreso y visualización de rutinas de entrenamiento.

## 🛠️ Tecnologías
- **Core**: HTML5, Vanilla JavaScript.
- **Estilos**: CSS3 con variables personalizadas para Temas (Light/Dark).
- **Comunicación**: Fetch API integrada en `js/api.js`.

## 🚀 Inicio Rápido

1. **Configuración de API**:
   Asegúrate de que el Backend esté corriendo en `http://localhost:8001`. Puedes verificar la URL en `js/api.js`.

2. **Servidor Local**:
   Al ser una aplicación estática, puedes abrir el archivo `index.html` directamente en tu navegador o usar un servidor local sencillo:
   ```bash
   # Si tienes Python instalado:
   python3 -m http.server 3000
   ```

3. **Acceso**:
   Usa las credenciales de prueba configuradas en el backend:
   - **Email**: `ana@vela.com`
   - **Password**: (Cualquiera en modo dev)

---

## 🏗️ Estructura
- `/js`: Lógica de API y sistema de traducciones.
- `/css`: Estilos globales y componentes UI.
- `/assets`: Imágenes y recursos visuales.
- `index.html`: Pantalla de Login / Entrada.
- `dashboard.html`: Vista principal del paciente.
