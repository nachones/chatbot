# 🚀 Deployment en Plesk - app.micopiloto.es

## Datos del servidor

| Dato | Valor |
|------|-------|
| **Dominio** | app.micopiloto.es |
| **Directorio** | /app.micopiloto.es |
| **FTP User** | admingestion |
| **Application** | Node.js 18+ |
| **Startup file** | server.js |
| **Puerto** | 3000 (proxy reverso de Plesk) |

---

## Paso 1: Subir archivos por FTP

Conectar con FileZilla:
- **Host:** micopiloto.es
- **Usuario:** admingestion
- **Puerto:** 21

### Archivos a subir (TODO excepto estos):

**NO subir:**
- `node_modules/` (se instala en el servidor)
- `database.sqlite*` (se crea automáticamente)
- `.env` (se crea manualmente en el servidor)
- `logs/` (se crea automáticamente)
- `uploads/` (contenido de desarrollo)
- `training-data/` (contenido de desarrollo)
- `tests/` (no necesario en producción)
- `*.sqlite-shm`, `*.sqlite-wal`
- `_check_logger.js` (script temporal)
- `.git/`

### Estructura que debe quedar en el servidor:

```
/app.micopiloto.es/
├── server.js
├── package.json
├── ecosystem.config.js
├── nodemon.json
├── example.html
├── .env                    ← crear manualmente
├── public/
│   ├── chat-widget.js
│   ├── dashboard.html
│   ├── index.html
│   ├── widget-preview.html
│   ├── css/
│   └── js/
├── routes/
│   ├── api.js
│   ├── auth.js
│   ├── calendar.js
│   ├── chatbots.js
│   ├── dashboard.js
│   ├── functions.js
│   ├── leads.js
│   ├── payments.js
│   ├── quickPrompts.js
│   ├── training.js
│   └── usage.js
└── services/
    ├── calendarService.js
    ├── chatbotService.js
    ├── databaseService.js
    ├── documentProcessor.js
    ├── emailService.js
    ├── llmService.js
    ├── logger.js
    ├── planConfig.js
    ├── securityMiddleware.js
    └── trainingService.js
```

---

## Paso 2: Crear archivo .env en el servidor

Copiar el contenido de `.env.production` y rellenar los valores reales.

**OBLIGATORIO antes de arrancar:**

1. Generar JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. Configurar al menos una API key de LLM (GEMINI_API_KEY recomendada)

3. Configurar SMTP si quieres envío de emails

---

## Paso 3: Configurar Node.js en Plesk

1. Ir a **Sitios web y dominios** → **app.micopiloto.es**
2. Click en **Node.js**
3. Configurar:
   - **Node.js Version:** 18.x o superior
   - **Application Mode:** Production
   - **Application Root:** /app.micopiloto.es
   - **Application Startup File:** server.js
   - **Document Root:** /app.micopiloto.es/public

4. Click **"Enable Node.js"**

---

## Paso 4: Instalar dependencias

Desde el panel de Node.js en Plesk:
- Click en **"NPM Install"**

O por SSH:
```bash
cd /var/www/vhosts/micopiloto.es/app.micopiloto.es
npm install --production
```

---

## Paso 5: Crear directorios necesarios

```bash
mkdir -p logs uploads training-data
chmod 755 logs uploads training-data
```

(El servidor también los crea automáticamente al arrancar)

---

## Paso 6: Arrancar la aplicación

Desde Plesk: **Node.js** → **Restart App**

O por SSH con PM2:
```bash
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## Paso 7: Configurar SSL

1. En Plesk → **SSL/TLS Certificates**
2. Instalar certificado **Let's Encrypt** (gratuito)
3. Activar **Redirect HTTP → HTTPS**

---

## Paso 8: Verificar

| Endpoint | URL |
|----------|-----|
| Landing | https://app.micopiloto.es/ |
| Dashboard | https://app.micopiloto.es/dashboard |
| Health check | https://app.micopiloto.es/health |
| Widget JS | https://app.micopiloto.es/chat-widget.js |

---

## Paso 9: Configurar Stripe Webhook (si usas pagos)

En Stripe Dashboard → Developers → Webhooks:
- **URL:** `https://app.micopiloto.es/api/payments/webhook`
- **Eventos:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## Actualizaciones futuras

1. Subir archivos modificados por FTP
2. En Plesk → **Node.js** → **Restart App**

Si cambias `package.json`: click en **"NPM Install"** antes de reiniciar.

---

## Integración del widget en webs de clientes

```html
<script src="https://app.micopiloto.es/chat-widget.js"></script>
<script>
  ChatWidget.init({
    chatbotId: 'ID_DEL_CHATBOT',
    position: 'bottom-right',
    primaryColor: '#6C63FF'
  });
</script>
```

**IMPORTANTE:** Añadir los dominios de los clientes a `ALLOWED_ORIGINS` en `.env` para que el CORS permita las peticiones del widget.

---

## Troubleshooting

### La app no arranca
```bash
# Ver logs
tail -f logs/pm2-error.log
tail -f logs/pm2-out.log

# Verificar Node.js
node --version  # >= 18

# Verificar que .env existe
cat .env
```

### Error de base de datos
```bash
# La DB se crea automáticamente. Si hay problemas de permisos:
chmod 666 database.sqlite
chmod 755 uploads/ logs/ training-data/
```

### Widget no funciona en web externa
- Verificar que el dominio está en `ALLOWED_ORIGINS`
- Verificar que SSL está activo (HTTPS obligatorio)
- Comprobar que chat-widget.js carga correctamente

### Error 502 Bad Gateway
- La app Node.js no está corriendo → reiniciar desde Plesk
- Puerto incorrecto → verificar que PORT=3000 en .env
