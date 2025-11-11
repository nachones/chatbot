# 🎯 Guía Rápida de Deployment en Plesk

## Pasos Mínimos para Deploy

### 1️⃣ Subir Archivos
- Sube todos los archivos a tu directorio en Plesk
- Ruta típica: `/var/www/vhosts/tudominio.com/subdominio.tudominio.com`

### 2️⃣ Configurar Node.js en Plesk
1. Ve a **Node.js** en tu dominio
2. **Enable Node.js**
3. **Node.js version**: 18.x o superior
4. **Application mode**: Production
5. **Application startup file**: `server.js`
6. **Document root**: (dejar por defecto o ajustar al directorio actual)

### 3️⃣ Configurar Variables de Entorno
En el panel de Node.js, añade estas variables:

```
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=sk-tu-api-key-de-openai
```

### 4️⃣ Instalar Dependencias (si es necesario)
Si NO subiste `node_modules/`:
- Click en **"NPM Install"** en el panel de Node.js
- O por SSH: `npm install --production`

### 5️⃣ Iniciar la Aplicación
- Click en **"Restart App"** en el panel de Node.js

### 6️⃣ Verificar
- Accede a: `https://tu-dominio.com/`
- Dashboard: `https://tu-dominio.com/dashboard`

---

## ⚠️ Checklist Rápido

- [ ] Archivos subidos al servidor
- [ ] Node.js activado en Plesk (v18+)
- [ ] Variables de entorno configuradas (especialmente OPENAI_API_KEY)
- [ ] Aplicación reiniciada
- [ ] SSL/HTTPS activado
- [ ] Permisos correctos en uploads/ (777)
- [ ] Dashboard accesible en navegador

---

## 🐛 Problemas Comunes

**Error: Cannot find module**
- Solución: Ejecuta `npm install` o usa "NPM Install" en Plesk

**Error: OPENAI_API_KEY not found**
- Solución: Verifica las variables de entorno en Node.js settings

**Error 502 Bad Gateway**
- Solución: Verifica que la app esté corriendo en el puerto 3000
- Reinicia la aplicación desde Plesk

**Base de datos no funciona**
- Solución: `chmod 666 database.sqlite` y `chmod 777 uploads/`

---

## 📞 Información de Contacto

Para más detalles, consulta: **DEPLOYMENT_PLESK.md**
