# 🚀 Guía de Deployment en Plesk

## Requisitos Previos

- Servidor con Plesk instalado
- Node.js 18+ activado en Plesk
- Acceso SSH o File Manager
- Subdominio o dominio configurado

---

## 📋 Paso 1: Preparar el Dominio en Plesk

1. **Crear Subdominio/Dominio:**
   - Ve a **Sitios web y dominios**
   - Crea un nuevo subdominio (ej: `chatbot.tudominio.com`)
   - Anota la ruta del directorio raíz (ej: `/var/www/vhosts/tudominio.com/chatbot.tudominio.com`)

2. **Activar Node.js:**
   - En el dominio creado, ve a **Node.js**
   - Habilita Node.js
   - Selecciona versión **18.x o superior**
   - Modo de aplicación: **Producción**

---

## 📦 Paso 2: Subir los Archivos

### Opción A: Via Git (Recomendado)

```bash
# Conectar por SSH
ssh tu-usuario@tu-servidor.com

# Ir al directorio del dominio
cd /var/www/vhosts/tudominio.com/chatbot.tudominio.com

# Clonar el repositorio
git clone https://github.com/nachones/MIABOT.git .

# O si ya existe, hacer pull
git pull origin main
```

### Opción B: Via File Manager de Plesk

1. Descarga el repositorio como ZIP desde GitHub
2. Sube el ZIP usando el File Manager de Plesk
3. Extrae los archivos en el directorio raíz del dominio

### Opción C: Via FTP/SFTP

1. Conecta con FileZilla o similar
2. Sube todos los archivos al directorio raíz

---

## ⚙️ Paso 3: Configurar Variables de Entorno

### En Plesk Panel:

1. Ve a **Node.js** en tu dominio
2. En **Variables de entorno personalizadas**, añade:

```
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=tu-api-key-aqui
```

### O crea el archivo `.env`:

```bash
# Via SSH
cd /var/www/vhosts/tudominio.com/chatbot.tudominio.com
nano .env
```

Contenido del `.env`:
```env
# API Key de OpenAI
OPENAI_API_KEY=sk-tu-api-key-real-aqui

# Puerto (Plesk maneja el proxy automáticamente)
PORT=3000

# Modo de producción
NODE_ENV=production
```

---

## 🔧 Paso 4: Configurar Node.js en Plesk

1. **Ir a Node.js** en el panel del dominio

2. **Configurar Document Root:**
   - Document root: `/var/www/vhosts/tudominio.com/chatbot.tudominio.com`

3. **Configurar Application Startup File:**
   - Application startup file: `server.js`

4. **Application Mode:**
   - Seleccionar: `Production`

5. **Guardar configuración**

---

## 📦 Paso 5: Instalar Dependencias (Si es necesario)

Si subiste el proyecto SIN node_modules:

```bash
# Via SSH
cd /var/www/vhosts/tudominio.com/chatbot.tudominio.com
npm install --production
```

O usa el botón **"NPM Install"** en el panel de Node.js de Plesk.

---

## 🚀 Paso 6: Iniciar la Aplicación

### Opción A: Desde Plesk Panel (Recomendado)

1. Ve a **Node.js** en tu dominio
2. Click en **Enable Node.js**
3. Click en **Restart App**

### Opción B: Via SSH con PM2 (Avanzado)

```bash
# Instalar PM2 globalmente (si no está instalado)
npm install -g pm2

# Iniciar la aplicación
pm2 start ecosystem.config.js --env production

# Guardar la configuración para reinicio automático
pm2 save
pm2 startup
```

---

## 🔍 Paso 7: Verificar el Funcionamiento

1. **Acceder a tu dominio:**
   ```
   https://chatbot.tudominio.com
   ```

2. **Verificar endpoints:**
   - Landing: `https://chatbot.tudominio.com/`
   - Dashboard: `https://chatbot.tudominio.com/dashboard`
   - API: `https://chatbot.tudominio.com/api/chatbots`

3. **Verificar logs:**
   ```bash
   # Via SSH
   tail -f /var/www/vhosts/tudominio.com/chatbot.tudominio.com/logs/access.log
   tail -f /var/www/vhosts/tudominio.com/chatbot.tudominio.com/logs/error.log
   ```

   O en Plesk: **Logs** → Ver logs de Node.js

---

## 🔒 Paso 8: Configurar SSL (HTTPS)

1. En Plesk, ve a **SSL/TLS Certificates**
2. Instala un certificado Let's Encrypt (gratuito)
3. Activa **"Redirect from HTTP to HTTPS"**

---

## 🔄 Paso 9: Actualizaciones Futuras

### Via Git:

```bash
cd /var/www/vhosts/tudominio.com/chatbot.tudominio.com
git pull origin main
```

Luego en Plesk: **Node.js** → **Restart App**

### Via File Manager:

1. Sube los archivos modificados
2. Reemplaza los existentes
3. Reinicia la aplicación desde Plesk

---

## 📝 Configuración de Proxy Reverso (Si es necesario)

Si Plesk no maneja automáticamente el proxy, configura **nginx**:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 🐛 Solución de Problemas

### La aplicación no inicia:

1. **Verificar logs:**
   ```bash
   tail -f logs/error.log
   ```

2. **Verificar permisos:**
   ```bash
   chmod -R 755 /var/www/vhosts/tudominio.com/chatbot.tudominio.com
   chown -R tu-usuario:psacln /var/www/vhosts/tudominio.com/chatbot.tudominio.com
   ```

3. **Verificar Node.js:**
   ```bash
   node --version  # Debe ser 18+
   ```

### Error de base de datos:

```bash
# Verificar que database.sqlite existe y tiene permisos
ls -la database.sqlite
chmod 666 database.sqlite
chmod 777 uploads/
```

### Error de puerto ocupado:

```bash
# Ver qué proceso usa el puerto 3000
lsof -i :3000

# Matar el proceso si es necesario
kill -9 <PID>
```

### Error de API Key:

1. Verifica que `.env` existe y tiene la API key correcta
2. Verifica que las variables de entorno están configuradas en Plesk
3. Reinicia la aplicación

---

## 🎯 Checklist Final

- [ ] Dominio/subdominio creado en Plesk
- [ ] Node.js activado (v18+)
- [ ] Archivos subidos al directorio correcto
- [ ] `.env` configurado con OPENAI_API_KEY
- [ ] Dependencias instaladas (`node_modules/`)
- [ ] `database.sqlite` con permisos correctos
- [ ] Carpeta `uploads/` con permisos 777
- [ ] Carpeta `logs/` creada
- [ ] Aplicación iniciada desde Plesk
- [ ] SSL/HTTPS configurado
- [ ] Dashboard accesible en navegador
- [ ] Widget de chat funcionando

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs en `/logs/error.log`
2. Verifica la configuración de Node.js en Plesk
3. Asegúrate que todos los archivos están en el directorio correcto
4. Verifica que la base de datos tiene permisos de escritura

---

## 🎉 ¡Listo!

Tu sistema de chatbot AI está ahora en producción en Plesk.

**URLs importantes:**
- Landing: `https://tu-dominio.com/`
- Dashboard: `https://tu-dominio.com/dashboard`
- Widget de ejemplo: `https://tu-dominio.com/example`

**Código para integrar en tus sitios:**
```html
<script src="https://tu-dominio.com/chat-widget.js"></script>
<script>
  ChatWidget.init({
    chatbotId: 'tu-chatbot-id',
    position: 'bottom-right',
    primaryColor: '#007bff'
  });
</script>
```
