# Auditoría Integral de Código — chatbot-widget

*Fecha: Junio 2025*  
*Alcance: Todos los archivos del proyecto (server, routes, services, public/js, public/css, tests, configuración)*

---

## Tabla de Contenidos

1. [Código Muerto / No Utilizado](#1-código-muerto--no-utilizado)
2. [Duplicación de Código](#2-duplicación-de-código)
3. [Seguridad](#3-seguridad)
4. [Rendimiento](#4-rendimiento)
5. [Manejo de Errores](#5-manejo-de-errores)
6. [Dependencias](#6-dependencias)
7. [CSS](#7-css)
8. [JavaScript Frontend](#8-javascript-frontend)
9. [Configuración](#9-configuración)
10. [Estructura de Archivos](#10-estructura-de-archivos)

---

## 1. Código Muerto / No Utilizado

### 1.1 — Import no utilizado: `DocumentProcessor` en routes/api.js

| Campo | Valor |
|---|---|
| **Archivo** | `routes/api.js` línea 8 |
| **Severidad** | Baja |
| **Código** | `const DocumentProcessor = require('../services/documentProcessor');` |
| **Detalle** | `DocumentProcessor` se importa pero nunca se usa en ninguna ruta de api.js. Todo el procesamiento de documentos ocurre en `routes/training.js`. |
| **Fix sugerido** | Eliminar la línea de import. |

### 1.2 — `startTraining()` simulado en trainingService.js

| Campo | Valor |
|---|---|
| **Archivo** | `services/trainingService.js` ~línea 170-195 |
| **Severidad** | Baja |
| **Código** | `async startTraining(chatbotId) { ... setTimeout(() => resolve() , 2000); }` |
| **Detalle** | El método simula fine-tuning con un `setTimeout` de 2 segundos. Solo actualiza un campo de BD a "completed". No realiza entrenamiento real. |
| **Fix sugerido** | Eliminar el método o implementar funcionalidad real. Si queda, documentar que es un placeholder. |

### 1.3 — Funciones exportadas pero nunca importadas de securityMiddleware.js

| Campo | Valor |
|---|---|
| **Archivo** | `services/securityMiddleware.js` líneas 19, 34, 51, 107, 114 |
| **Severidad** | Media |
| **Código** | `sanitizeObject`, `validateChatbotId`, `validateChatMessage`, `asyncHandler`, `verifyApiKey` |
| **Detalle** | El archivo exporta 7 funciones pero solo `requestLogger` se importa (en `server.js` L11). Las otras 6 funciones (sanitización, validación, async handler, API key verification) están escritas pero **nunca se usan** en ninguna ruta. Esto significa que toda la lógica de sanitización y validación de entrada es código muerto. |
| **Fix sugerido** | Integrar `validateChatbotId` en rutas que reciben chatbotId, `validateChatMessage` en el endpoint de chat, `sanitizeObject` como middleware global, `verifyApiKey` en endpoints públicos del widget. |

### 1.4 — package.json: `qs` y `busboy` potencialmente no usados

| Campo | Valor |
|---|---|
| **Archivo** | `package.json` |
| **Severidad** | Baja |
| **Código** | `"qs": "^6.14.0"`, `"busboy": "^1.6.0"` |
| **Detalle** | No hay `require('qs')` ni `require('busboy')` en ningún archivo del proyecto. `busboy` se duplica funcionalmente con `multer` (que sí se usa para uploads). `qs` podría ser usado internamente por Express pero no necesita estar como dependencia directa. |
| **Fix sugerido** | Verificar y eliminar ambas dependencias si no se necesitan. Ejecutar `npm prune` después. |

### 1.5 — Script de test vacío

| Campo | Valor |
|---|---|
| **Archivo** | `package.json` línea scripts |
| **Severidad** | Baja |
| **Código** | `"test": "echo \"Error: no test specified\" && exit 1"` |
| **Detalle** | El script `test` es un placeholder que nunca ejecuta los archivos en `tests/`. Los 3 archivos de test (`test-api.js`, `test-e2e.js`, `test-client-experience.js`) son scripts ad-hoc que se ejecutan manualmente con `node`. |
| **Fix sugerido** | Actualizar a `"test": "node tests/test-api.js"` o migrar a un framework como Jest/Mocha. |

---

## 2. Duplicación de Código

### 2.1 — Funciones utilitarias clonadas en TODOS los módulos frontend

| Campo | Valor |
|---|---|
| **Archivos** | `public/js/training.js`, `settings.js`, `conversations.js`, `functions.js`, `prompts.js`, `test-chatbot.js` |
| **Severidad** | Alta |
| **Funciones duplicadas** | `escapeHtml()`, `showSuccess()`, `showError()`, `showLoading()`, `hideLoading()`, `formatDate()` |
| **Detalle** | Cada módulo IIFE tiene su propia copia idéntica de estas funciones. Son entre 5-6 funciones × 6 archivos = ~30 copias. Las variantes de `showLoading` crean cada una un `div` distinto con ID basado en el módulo (`training-loading`, `functions-loading`, `settings-loading`, `prompts-loading`), todas con estilos CSS inline idénticos. |
| **Fix sugerido** | Extraer a un módulo compartido `public/js/utils.js` y exponerlo vía `window.appUtils`. Cada módulo las importa de ahí. |

**Ejemplo** (se repite textualmente en 6 archivos):
```js
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    if (window.dashboardApp && window.dashboardApp.showSuccess) {
        window.dashboardApp.showSuccess(message);
    }
}

function showError(message) {
    if (window.dashboardApp && window.dashboardApp.showError) {
        window.dashboardApp.showError(message);
    }
}
```

### 2.2 — Patrón `setInterval` de polling duplicado en 6 módulos

| Campo | Valor |
|---|---|
| **Archivos** | `training.js:15`, `settings.js:15`, `functions.js:16`, `prompts.js:15`, `test-chatbot.js:17`, `conversations.js:18` |
| **Severidad** | Media |
| **Código** | `setInterval(() => { const newId = getChatbotId(); if (newId !== currentChatbotId) { ... load...; } }, 1000);` |
| **Detalle** | Cada módulo abre un `setInterval` de 1 segundo para detectar cambio de chatbot seleccionado. Son 6 intervalos independientes corriendo simultáneamente, cada uno verificando `window.dashboardApp.getCurrentChatbotId()` cada segundo. |
| **Fix sugerido** | Implementar un patrón observer/pub-sub en `dashboardApp` que emita un evento `chatbotChanged`, al que cada módulo se suscribe. Esto elimina 6 timers y crea un flujo reactivo. |

### 2.3 — Helper `request` / `makeRequest` duplicado en los 3 archivos de tests

| Campo | Valor |
|---|---|
| **Archivos** | `tests/test-api.js:14`, `tests/test-client-experience.js:32`, `tests/test-e2e.js:57` |
| **Severidad** | Baja |
| **Detalle** | Cada archivo de test implementa su propia función HTTP helper que hace esencialmente lo mismo. |
| **Fix sugerido** | Extraer a `tests/helpers.js`. |

### 2.4 — `new DatabaseService()` instanciado 13 veces

| Campo | Valor |
|---|---|
| **Archivos** | Todos los archivos de `routes/` (9 archivos) + todos los `services/` que lo usan (4 servicios) |
| **Severidad** | Alta (también es tema de rendimiento) |
| **Código** | `const db = new DatabaseService();` / `this.db = new DatabaseService();` |
| **Detalle** | Cada archivo crea una nueva instancia que abre una nueva conexión SQLite. Son 13 conexiones abiertas simultáneamente contra el mismo fichero de BD. |
| **Fix sugerido** | Convertir `DatabaseService` en singleton (como ya se hace con `LLMService` y `EmailService`) y exportar `module.exports = new DatabaseService();`. |

### 2.5 — Regex de validación de email replicada

| Campo | Valor |
|---|---|
| **Archivos** | `routes/auth.js`, `routes/leads.js`, `routes/payments.js`, `services/securityMiddleware.js`, `public/chat-widget.js` |
| **Severidad** | Baja |
| **Detalle** | La misma regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (o variantes) se define en al menos 5 archivos. |
| **Fix sugerido** | Backend: definir en `securityMiddleware.js` y reusar. Frontend: definir en un módulo `utils.js`. |

---

## 3. Seguridad

### 3.1 — CORS permite todos los orígenes (CRÍTICO)

| Campo | Valor |
|---|---|
| **Archivo** | `server.js` líneas 45-54 |
| **Severidad** | **Crítica** |
| **Código** | `} else { callback(null, true); // Widget can be embedded anywhere }` |
| **Detalle** | La rama `else` del handler de CORS siempre retorna `true`, lo que anula completamente la lista de `allowedOrigins`. Cualquier origen puede hacer requests con credenciales (`credentials: true`). Esto hace al sistema vulnerable a CSRF. |
| **Fix sugerido** | Separar la política CORS: endpoints de API del dashboard deben restringirse a orígenes autorizados. Endpoints del widget (`/api/chat`, `/api/quick-prompts` GET, `/api/leads` POST) pueden ser abiertos. Implementar 2 configuraciones CORS distintas. |

### 3.2 — `error.message` expuesto al cliente en múltiples rutas

| Campo | Valor |
|---|---|
| **Archivos** | `routes/calendar.js` (8 ocurrencias), `routes/quickPrompts.js` (5), `routes/leads.js` (4), `routes/api.js` (1) |
| **Severidad** | Media |
| **Código** | `res.status(500).json({ error: error.message })` |
| **Detalle** | Exponer `error.message` al cliente puede filtrar información interna (nombres de tablas SQL, rutas de archivos, estado interno del servidor). Son 18+ endpoints que leak errores directamente. |
| **Fix sugerido** | Retornar mensajes genéricos al cliente (`"Error interno del servidor"`) y logear `error.message` solo en servidor. |

### 3.3 — Falta verificación de ownership en múltiples endpoints

| Campo | Valor |
|---|---|
| **Archivo** | `routes/chatbots.js` — endpoint GET `/:id/stats` (~línea 104) |
| **Severidad** | Alta |
| **Detalle** | El endpoint `/:id/stats` no verifica que el chatbotId pertenezca al usuario autenticado. Un usuario puede consultar estadísticas de chatbots de otros usuarios proporcionando un ID válido. |
| **Fix sugerido** | Agregar `verifyOwnership` como los endpoints `PUT /:id` y `DELETE /:id` de la misma ruta. |

| Campo | Valor |
|---|---|
| **Archivo** | `routes/usage.js` — todos los endpoints |
| **Severidad** | Alta |
| **Detalle** | `router.use(authMiddleware)` protege la ruta, pero ningún endpoint verifica que el `chatbotId` del query pertenezca al `req.user`. Un usuario autenticado puede ver/resetear el uso de chatbots ajenos. |
| **Fix sugerido** | Agregar verificación de ownership en cada endpoint. |

| Campo | Valor |
|---|---|
| **Archivo** | `routes/functions.js` — endpoints GET `/:id` y DELETE `/:id` |
| **Severidad** | Alta |
| **Detalle** | Aunque `router.use(authMiddleware)` está activo, GET y DELETE de funciones individuales no verifican que la función pertenezca a un chatbot del usuario. |
| **Fix sugerido** | Verificar ownership antes de retornar/eliminar. |

### 3.4 — Quick Prompts GET público sin rate limiting específico

| Campo | Valor |
|---|---|
| **Archivo** | `routes/quickPrompts.js` líneas 9-50 |
| **Severidad** | Media |
| **Código** | GET `/` y GET `/:id` — sin `authMiddleware` |
| **Detalle** | Estos endpoints son públicos (usados por el widget). Un atacante podría enumerar prompts de todos los chatbots. Deberían tener rate limiting más estricto que el general o al menos solo retornar datos del chatbotId proporcionado. |
| **Fix sugerido** | El endpoint requiere `chatbotId` como query param, pero no valida el formato. Agregar `validateChatbotId`. |

### 3.5 — Passwords auto-generadas en webhook de Stripe

| Campo | Valor |
|---|---|
| **Archivo** | `routes/payments.js` ~líneas 270-310 |
| **Severidad** | Media |
| **Detalle** | Cuando un pago de Stripe crea una cuenta automáticamente, genera una contraseña con `crypto.randomBytes(12).toString('hex')`, que es segura. Sin embargo, esta contraseña se envía por email, creando un vector si el email está comprometido. |
| **Fix sugerido** | Forzar el cambio de contraseña en primer login, o usar un flujo de "establecer contraseña" con token temporal. |

### 3.6 — Falta sanitización de inputs en chat widget

| Campo | Valor |
|---|---|
| **Archivo** | `public/chat-widget.js` líneas ~640-660 |
| **Severidad** | Media |
| **Código** | Bot messages: `contentDiv.innerHTML = marked.parse(content);` |
| **Detalle** | Las respuestas del bot se renderizan como HTML vía `marked.parse()`. Si la respuesta del LLM contiene HTML/JS malicioso (inyección de prompt → XSS), se ejecutará en el navegador del usuario. `marked` por defecto NO sanitiza HTML. |
| **Fix sugerido** | Usar `marked` con la opción `{ sanitize: true }` o complementar con DOMPurify: `contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content));`. |

### 3.7 — JWT sin expiración explícita en .env.example

| Campo | Valor |
|---|---|
| **Archivo** | `routes/auth.js` línea 86 |
| **Severidad** | Baja |
| **Detalle** | Los tokens JWT se crean con `expiresIn: '30d'` (30 días), que es excesivamente largo. No hay mecanismo de revocación. |
| **Fix sugerido** | Reducir expiración a 24h e implementar refresh tokens, o al menos permitir configurar la duración vía variable de entorno. |

### 3.8 — Helmet con CSP deshabilitado

| Campo | Valor |
|---|---|
| **Archivo** | `server.js` líneas 58-60 |
| **Severidad** | Media |
| **Código** | `app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));` |
| **Detalle** | Content Security Policy está completamente deshabilitado, eliminando una de las defensas más importantes contra XSS. |
| **Fix sugerido** | Configurar CSP con directivas adecuadas en lugar de deshabilitarlo: `defaultSrc: ["'self'"]`, `scriptSrc: ["'self'", cdn.jsdelivr.net]`, etc. |

---

## 4. Rendimiento

### 4.1 — 13 conexiones SQLite abiertas simultáneamente

| Campo | Valor |
|---|---|
| **Archivos** | Ver sección 2.4 |
| **Severidad** | **Alta** |
| **Detalle** | 13 instancias de `new DatabaseService()` = 13 conexiones SQLite abiertas al mismo fichero. SQLite maneja un solo writer a la vez; múltiples conexiones causan contención de locks, especialmente bajo carga. |
| **Fix sugerido** | Convertir a singleton. Exportar una instancia única: `module.exports = new DatabaseService();` |

### 4.2 — `searchRelevantContent` carga TODOS los datos de entrenamiento en memoria

| Campo | Valor |
|---|---|
| **Archivo** | `services/trainingService.js` ~líneas 100-150 |
| **Severidad** | Alta |
| **Código** | `const allData = await this.db.getTrainingData(chatbotId); // Loads all rows` → luego itera y calcula cosine similarity en JS |
| **Detalle** | Para cada búsqueda semántica, se cargan TODOS los registros de entrenamiento del chatbot, se deserializa el embedding de cada uno (JSON.parse), y se calcula cosine similarity en un loop. Con cientos o miles de chunks, esto es muy costoso (O(n) por cada mensaje de usuario). |
| **Fix sugerido** | Implementar una búsqueda vectorial más eficiente: usar un índice en memoria (HNSW vía `hnswlib-node`), o al mínimo cachear los embeddings deserializados en memoria en lugar de hacer JSON.parse en cada búsqueda. |

### 4.3 — 6 `setInterval` de 1 segundo corriendo simultáneamente en el frontend

| Campo | Valor |
|---|---|
| **Archivos** | Ver sección 2.2 |
| **Severidad** | Media |
| **Detalle** | 6 timers de polling cada 1000ms sobrecargan el event loop del navegador innecesariamente. Cada uno hace una comprobación string. |
| **Fix sugerido** | Reemplazar con un sistema de eventos (pub-sub). Un solo listener en `dashboardApp` propaga el cambio. |

### 4.4 — index.html de 1539 líneas con CSS inline masivo

| Campo | Valor |
|---|---|
| **Archivo** | `public/index.html` |
| **Severidad** | Media |
| **Detalle** | La landing page tiene todo el CSS embebido dentro de una etiqueta `<style>` en el propio HTML (~900+ líneas de CSS inline). Esto impide el caching del CSS por el navegador. |
| **Fix sugerido** | Extraer a `public/css/landing.css` y referenciar con `<link rel="stylesheet">`. |

### 4.5 — chat-widget.js carga marked.js dinámicamente sin fallback eficiente

| Campo | Valor |
|---|---|
| **Archivo** | `public/chat-widget.js` líneas 4-7 |
| **Severidad** | Baja |
| **Código** | `const markedScript = document.createElement('script'); markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js'; document.head.appendChild(markedScript);` |
| **Detalle** | Si el CDN no responde, `marked` no estará disponible y el fallback usa `textContent` (sin formato). La carga no tiene `async` ni `defer` explícitos, ni `onerror` handler. Además, no se fija la versión (`marked/marked.min.js` siempre trae la última), lo que puede romper por breaking changes. |
| **Fix sugerido** | Fijar versión: `marked@12.0.0/marked.min.js`. Agregar `onerror` handler. Considerar bundlearlo o usar fetch con timeout. |

---

## 5. Manejo de Errores

### 5.1 — Endpoint token-usage retorna `success: true` ante error

| Campo | Valor |
|---|---|
| **Archivo** | `routes/dashboard.js` ~línea 107 |
| **Severidad** | Alta |
| **Código** | `catch (error) { ... res.json({ success: true, usage: { totalTokens: 0, tokenLimit: 50000, ... } }); }` |
| **Detalle** | Cuando falla la consulta de uso de tokens, el handler retorna `success: true` con datos fabricados (0 tokens). El frontend mostrará información incorrecta sin saber que hubo un error. |
| **Fix sugerido** | Retornar `success: false` con un mensaje de error apropiado. |

### 5.2 — `catch {}` vacíos en múltiples lugares

| Campo | Valor |
|---|---|
| **Archivos** | `public/chat-widget.js` (2 ocurrencias — `checkLeadCaptured`, `markLeadCaptured`), `public/js/preview.js` (~línea 358 `catch (_) {}`) |
| **Severidad** | Media |
| **Detalle** | Excepciones silenciadas sin logging dificultan el debugging. |
| **Fix sugerido** | Al mínimo agregar `console.warn()` en cada catch vacío. |

### 5.3 — Respuestas de error no retornadas en tests de archivo

| Campo | Valor |
|---|---|
| **Archivo** | `public/js/wizard.js` líneas 340-358 |
| **Severidad** | Baja |
| **Código** | `const response = await fetch('/api/training/upload', { ... }); return response.json();` |
| **Detalle** | `uploadTrainingFiles` y `trainFromUrl` no verifican si `response.ok` antes de parsear JSON. Un error 500 podría causar un error de parse silencioso. |
| **Fix sugerido** | Agregar `if (!response.ok) throw new Error(...)`. |

### 5.4 — No hay error handler global para Express

| Campo | Valor |
|---|---|
| **Archivo** | `server.js` |
| **Severidad** | Media |
| **Detalle** | No hay un middleware de error centralizado (`app.use((err, req, res, next) => ...)`). Si una ruta lanza una excepción no manejada, Express retorna un stack trace HTML por defecto, lo cual es un leak de información. |
| **Fix sugerido** | Agregar un error handler al final de los middleware: `app.use((err, req, res, next) => { console.error(err); res.status(500).json({ success: false, error: 'Error interno' }); });` |

### 5.5 — `process.exit(1)` en auth.js si JWT_SECRET no existe

| Campo | Valor |
|---|---|
| **Archivo** | `routes/auth.js` líneas 10-13 |
| **Severidad** | Media |
| **Código** | `if (!process.env.JWT_SECRET) { console.error('FATAL: JWT_SECRET no configurado'); process.exit(1); }` |
| **Detalle** | `process.exit(1)` en un módulo de ruta se ejecuta al primer `require()`. Esto rompe si no se configura el env, lo cual es correcto, pero no permite un graceful shutdown y evita que PM2 lo reinicie indefinidamente. |
| **Fix sugerido** | Lanzar un `Error` en vez de `process.exit()`, o manejarlo en `server.js`. |

---

## 6. Dependencias

### 6.1 — Resumen de dependencias en package.json

| Dependencia | ¿Usada? | Notas |
|---|---|---|
| `axios` | ✅ | documentProcessor, calendarService |
| `bcrypt` | ✅ | auth.js |
| `busboy` | ❌ | Nunca importado. Multer se usa en su lugar. |
| `cheerio` | ✅ | documentProcessor |
| `cors` | ✅ | server.js |
| `dotenv` | ✅ | server.js |
| `express` | ✅ | server.js |
| `express-rate-limit` | ✅ | server.js |
| `googleapis` | ✅ | calendarService |
| `groq-sdk` | ✅ | llmService |
| `helmet` | ✅ | server.js |
| `jsonwebtoken` | ✅ | auth.js |
| `mammoth` | ✅ | documentProcessor |
| `multer` | ✅ | training.js |
| `nodemailer` | ✅ | emailService |
| `openai` | ✅ | llmService |
| `pdf-parse` | ✅ | documentProcessor |
| `qs` | ❌ | Nunca importado directamente. Posiblemente dependencia transitiva. |
| `sqlite3` | ✅ | databaseService |
| `stripe` | ✅ | payments.js |
| `uuid` | ✅ | multiple files |

### 6.2 — Sin lockfile mencionado

| Campo | Valor |
|---|---|
| **Severidad** | Media |
| **Detalle** | No se ve `package-lock.json` en el workspace (podría existir en .gitignore). Sin lockfile, las instalaciones pueden variar entre deploys. |
| **Fix sugerido** | Asegurar que `package-lock.json` se commitee al repo. |

### 6.3 — Sin devDependencies

| Campo | Valor |
|---|---|
| **Severidad** | Baja |
| **Detalle** | No hay `devDependencies` en package.json. `nodemon` se menciona en scripts pero no está listado como dependencia (probablemente instalado globalmente). Tampoco hay linter (ESLint) ni test framework. |
| **Fix sugerido** | Agregar `nodemon`, `eslint`, y un framework de tests (jest/mocha) como devDependencies. |

### 6.4 — `@google/generative-ai` como dependencia implícita

| Campo | Valor |
|---|---|
| **Archivo** | `services/llmService.js` línea 3, `services/trainingService.js` línea 3 |
| **Severidad** | Media |
| **Código** | `const { GoogleGenerativeAI } = require('@google/generative-ai');` |
| **Detalle** | Este paquete se importa en 2 archivos pero **no está listado** en `package.json`. La aplicación fallará si se hace un `npm install` limpio. |
| **Fix sugerido** | Agregar `@google/generative-ai` a las dependencias de `package.json`. |

---

## 7. CSS

### 7.1 — CSS bien organizado con design tokens

| Campo | Valor |
|---|---|
| **Archivo** | `public/css/variables.css` |
| **Severidad** | — (Positivo) |
| **Detalle** | El sistema de variables CSS está bien estructurado con colores semánticos, espaciado, radii y sombras en `:root`. Buena práctica. |

### 7.2 — CSS landing page embebido en HTML

| Campo | Valor |
|---|---|
| **Archivo** | `public/index.html` |
| **Severidad** | Media |
| **Detalle** | ~900 líneas de CSS inline dentro de `<style>` en index.html. No reutiliza las variables de `variables.css` (define sus propias `--primary-color`, `--text-primary`, etc.). Duplicación de tokens de diseño. |
| **Fix sugerido** | Extraer a `public/css/landing.css`, unificar variables con `variables.css`. |

### 7.3 — CSS del widget completamente inline en JS

| Campo | Valor |
|---|---|
| **Archivo** | `public/chat-widget.js` líneas ~55-400 |
| **Severidad** | Baja (aceptable) |
| **Detalle** | El widget embebible tiene ~350 líneas de CSS inyectadas vía JS. Esto es aceptable para un widget embebible (evita dependencias externas de CSS), pero dificulta el mantenimiento. |
| **Fix sugerido** | Considerar un build step que minifique el CSS e inyecte como template literal. |

### 7.4 — Estilos inline repetidos en showLoading de cada módulo

| Campo | Valor |
|---|---|
| **Archivos** | `training.js:487-510`, `settings.js:402-428`, `functions.js:410-435`, `prompts.js:290-310` |
| **Severidad** | Media |
| **Detalle** | Cada módulo frontend crea un elemento de loading con los mismos estilos inline exactos (~15 líneas de `style.cssText`). |
| **Fix sugerido** | Definir una clase CSS `.module-loading` en el dashboard CSS y reutilizar. |

### 7.5 — `auth.css` no importa variables.css

| Campo | Valor |
|---|---|
| **Archivo** | `public/css/auth.css` |
| **Severidad** | Baja |
| **Detalle** | Si `auth.css` se carga sin `variables.css`, las variables CSS no se resolverán. Depende del orden de carga en el HTML. |
| **Fix sugerido** | Documentar el orden de carga requerido o usar `@import` en los CSS que dependen de variables. |

---

## 8. JavaScript Frontend

### 8.1 — Fetch calls sin Authorization header (datos sensibles accesibles)

| Campo | Valor |
|---|---|
| **Archivo** | `public/js/settings.js` — funciones `loadSettings()` y `saveOpenAISettings()` |
| **Severidad** | **Alta** |
| **Detalle** | `loadSettings` usa `fetch()` sin headers de auth: `const response = await fetch(API_URL + '/chatbots/' + chatbotId);`. `saveOpenAISettings` también usa fetch sin auth. Estos endpoints requieren `authMiddleware` en el backend, por lo que estas requests **fallarán con 401** si la autenticación está correctamente aplicada. |
| **Fix sugerido** | Crear una función `authFetch()` centralizada (como en `calendar.js`) y usarla en todos los módulos. Mejor aún, exponer `window.dashboardApp.authFetch` y reutilizar. |

| Campo | Valor |
|---|---|
| **Archivo** | `public/js/training.js` — función de file upload (~línea 76) |
| **Severidad** | Alta |
| **Detalle** | El upload de archivos usa `fetch('/api/training/upload', { method: 'POST', body: formData })` sin header Authorization. |
| **Fix sugerido** | Agregar `headers: { 'Authorization': 'Bearer ' + localStorage.getItem('miabot_token') }`. |

| Campo | Valor |
|---|---|
| **Archivos** | `public/js/functions.js` — save, toggle, delete funciones |
| **Severidad** | Alta |
| **Detalle** | Todas las calls a `/api/functions/*` se hacen con `fetch()` sin auth headers. |
| **Fix sugerido** | Usar `authFetch()` compartido. |

### 8.2 — `document.execCommand('copy')` deprecado

| Campo | Valor |
|---|---|
| **Archivo** | `public/js/integrations.js` línea ~30 |
| **Severidad** | Baja |
| **Código** | `document.execCommand('copy')` como fallback |
| **Detalle** | `document.execCommand` está deprecado en la mayoría de los navegadores modernos. Se usa como fallback de `navigator.clipboard.writeText`, lo cual está bien como degradation, pero debería documentarse. |
| **Fix sugerido** | Mantener como fallback pero agregar comentario. Bajo prioridad. |

### 8.3 — Variable `window` shadowed en chat-widget.js

| Campo | Valor |
|---|---|
| **Archivo** | `public/chat-widget.js` — métodos `open()` y `close()` |
| **Severidad** | Baja |
| **Código** | `const window = document.getElementById('chat-widget-window');` |
| **Detalle** | La variable local `window` shadows la global `window`. Esto funciona porque `window` global no se usa dentro de estos métodos, pero es confuso y propenso a bugs futuros. |
| **Fix sugerido** | Renombrar a `chatWindow` o `widgetWindow`. |

### 8.4 — Sin manejo de errores en quick prompts del widget

| Campo | Valor |
|---|---|
| **Archivo** | `public/chat-widget.js` — `renderQuickPrompts()` |
| **Severidad** | Baja |
| **Detalle** | Los prompts con `link` usan `window.open(prompt.link, '_blank')` sin validar que la URL sea segura. Un prompt malicioso podría contener `javascript:` URLs. |
| **Fix sugerido** | Validar que el link empiece con `http://` o `https://`. |

### 8.5 — `Math.random()` usado para generar session IDs

| Campo | Valor |
|---|---|
| **Archivo** | `public/chat-widget.js` línea ~42 |
| **Severidad** | Baja |
| **Código** | `'widget_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)` |
| **Detalle** | `Math.random()` no es criptográficamente seguro. Para session IDs del widget esto es aceptable (no son tokens de autenticación), pero podría ser predecible. |
| **Fix sugerido** | Usar `crypto.getRandomValues()` si se necesita más seguridad: `Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(36)).join('')`. |

---

## 9. Configuración

### 9.1 — .env.example contiene credenciales reales

| Campo | Valor |
|---|---|
| **Archivo** | `.env.example` |
| **Severidad** | **Alta** |
| **Código** | `SMTP_HOST=mail.micopiloto.es`, `SMTP_USER=hola@micopiloto.es`, `SMTP_PASS=xxx` |
| **Detalle** | El archivo `.env.example` contiene un hostname SMTP real y un usuario real. Aunque la contraseña es `xxx`, revela infraestructura de producción. |
| **Fix sugerido** | Reemplazar con valores genéricos: `SMTP_HOST=smtp.example.com`, `SMTP_USER=user@example.com`. |

### 9.2 — `JWT_SECRET` no está en .env.example

| Campo | Valor |
|---|---|
| **Archivo** | `.env.example` |
| **Severidad** | Media |
| **Detalle** | `JWT_SECRET` no aparece en `.env.example`, pero `auth.js` hace `process.exit(1)` si no existe. Un desarrollador nuevo no sabrá que es requerido hasta que la app crashee. |
| **Fix sugerido** | Agregar `JWT_SECRET=your-super-secret-key-change-this` a `.env.example`. |

### 9.3 — Comentario EMAIL_VERIFICATION mal ubicado

| Campo | Valor |
|---|---|
| **Archivo** | `.env.example` ~línea 90+ |
| **Severidad** | Baja |
| **Detalle** | La línea comentada `# EMAIL_VERIFICATION=true` está colocada después de la sección de Stripe en lugar de con las variables de email. |
| **Fix sugerido** | Mover junto a las variables SMTP en la sección de email. |

### 9.4 — `example.html` con URLs hardcodeadas a localhost

| Campo | Valor |
|---|---|
| **Archivo** | `example.html` líneas 93-102 |
| **Severidad** | Baja |
| **Código** | `src="http://localhost:3000/chat-widget.js"`, `data-api-url="http://localhost:3000/api"` |
| **Detalle** | Las URLs están hardcodeadas a localhost:3000. No es un problema de producción (es un archivo de ejemplo), pero puede confundir. |
| **Fix sugerido** | Agregar un comentario indicando que se debe cambiar la URL al dominio de producción. |

### 9.5 — Stripe keys de producción en .env.example

| Campo | Valor |
|---|---|
| **Archivo** | `.env.example` líneas 75-76 |
| **Severidad** | Media |
| **Código** | `STRIPE_SECRET_KEY=sk_live_xxx`, `STRIPE_PUBLISHABLE_KEY=pk_live_xxx` |
| **Detalle** | Los placeholders usan prefijos `sk_live_` y `pk_live_` que indican modo producción. Un .env.example debería guiar al uso de test keys. |
| **Fix sugerido** | Cambiar a `sk_test_xxx` y `pk_test_xxx`. |

---

## 10. Estructura de Archivos

### 10.1 — Arquitectura general

```
chatbot-widget/
├── server.js              ← Entry point (251 líneas)
├── routes/                ← 11 archivos de rutas
│   ├── api.js             ← Chat, config, models (136 líneas)
│   ├── auth.js            ← Auth + middleware export (282 líneas)
│   └── ...
├── services/              ← 8 servicios
│   ├── databaseService.js ← 1363 líneas (GOD CLASS)
│   └── ...
├── public/
│   ├── js/                ← 11 módulos frontend
│   ├── css/               ← 6 archivos CSS
│   ├── index.html         ← Landing (1539 líneas)
│   └── chat-widget.js     ← Widget embebible (786 líneas)
├── tests/                 ← 3 scripts ad-hoc
└── ...
```

### 10.2 — `databaseService.js` es un God Object (1363 líneas)

| Campo | Valor |
|---|---|
| **Archivo** | `services/databaseService.js` |
| **Severidad** | Alta |
| **Detalle** | Un solo archivo/clase maneja TODAS las operaciones de BD: chatbots, training data, conversations, chat history, leads, functions, quick prompts, usage, calendar, user auth, payments, tokens. 60+ métodos en una clase. |
| **Fix sugerido** | Dividir en repositorios por dominio: `chatbotRepository.js`, `userRepository.js`, `trainingRepository.js`, `conversationRepository.js`, etc. Todos comparten la misma instancia de conexión SQLite. |

### 10.3 — `auth.js` mezcla ruta y middleware

| Campo | Valor |
|---|---|
| **Archivo** | `routes/auth.js` |
| **Severidad** | Media |
| **Detalle** | El archivo define rutas de autenticación Y exporta `authMiddleware`, que es importado por todos los demás archivos de rutas. Esto crea un acoplamiento: `routes/chatbots.js` depende de `routes/auth.js`. |
| **Fix sugerido** | Extraer `authMiddleware` a `services/authMiddleware.js` o `middleware/auth.js`. |

### 10.4 — Tests no integrados ni con framework

| Campo | Valor |
|---|---|
| **Archivo** | `tests/` |
| **Severidad** | Media |
| **Detalle** | Los 3 archivos de test son scripts standalone que requieren un servidor corriendo. Usan HTTP raw en lugar de supertest. No tienen assertions formales (solo console.log con ✅/❌). No hay tests unitarios de servicios. |
| **Fix sugerido** | Migrar a Jest + supertest. Agregar tests unitarios para `databaseService`, `llmService`, `chatbotService`. |

### 10.5 — Directorios vacíos: `logs/`, `training-data/`, `uploads/`

| Campo | Valor |
|---|---|
| **Severidad** | Baja |
| **Detalle** | Estos directorios existen vacíos en el repo. Es buena práctica incluir un `.gitkeep` en cada uno. Verificar que `.gitignore` no excluya los archivos generados a futuro. |

### 10.6 — Falta middleware/ directory

| Campo | Valor |
|---|---|
| **Severidad** | Baja |
| **Detalle** | No hay directorio `middleware/`. El auth middleware vive en `routes/auth.js` y el security middleware en `services/securityMiddleware.js`. |
| **Fix sugerido** | Crear `middleware/` y mover `authMiddleware` y `securityMiddleware` ahí. |

---

## Resumen Ejecutivo

| Categoría | Crítico | Alto | Medio | Bajo |
|---|---|---|---|---|
| 1. Código Muerto | 0 | 0 | 1 | 4 |
| 2. Duplicación | 0 | 2 | 2 | 1 |
| 3. Seguridad | 1 | 3 | 3 | 1 |
| 4. Rendimiento | 0 | 2 | 2 | 1 |
| 5. Errores | 0 | 1 | 3 | 1 |
| 6. Dependencias | 0 | 1 | 2 | 1 |
| 7. CSS | 0 | 0 | 3 | 2 |
| 8. Frontend JS | 0 | 3 | 0 | 3 |
| 9. Configuración | 0 | 1 | 2 | 2 |
| 10. Estructura | 0 | 1 | 3 | 2 |
| **TOTAL** | **1** | **14** | **21** | **18** |

### Top 5 Prioridades Inmediatas

1. **CORS abierto** (§3.1) — Cualquier sitio puede hacer requests autenticados a la API.
2. **13 conexiones SQLite** (§4.1 / §2.4) — Convertir DatabaseService a singleton.
3. **Falta ownership verification** (§3.3) — Usuarios pueden acceder a datos de otros.
4. **Funciones duplicadas en frontend** (§2.1) — Extraer a módulo compartido.
5. **Fetch sin auth headers** (§8.1) — Múltiples módulos frontend envían requests sin token.

### Métricas Generales

| Métrica | Valor |
|---|---|
| Total líneas de código (aprox.) | ~12,000 |
| Archivos fuente | ~35 |
| Dependencias de producción | 21 (2 no usadas, 1 faltante) |
| Tests automatizados | 0 (3 scripts ad-hoc) |
| Security middleware functions usadas | 1 de 7 (14%) |
| Funciones frontend duplicadas | ~30 copias en 6 archivos |
| Conexiones SQLite simultáneas | 13 |
