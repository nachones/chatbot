# 🤖 Chatbot AI - Sistema Multicliente con IA

Sistema completo de chatbots personalizados potenciados por ChatGPT para sitios web. Permite crear, entrenar y gestionar múltiples chatbots con IA desde un panel de control centralizado.

## ✨ Características Principales

### 🎯 **Gestión Multicliente**
- Crea y administra múltiples chatbots desde un solo dashboard
- Cada chatbot tiene su propia configuración y entrenamiento
- Sistema de planes con límites de mensajes (Free, Starter, Pro, Enterprise)
- Contador de uso en tiempo real con reseteo mensual automático

### 🧠 **Inteligencia Artificial**
- Powered by OpenAI GPT-3.5-turbo / GPT-4
- Entrenamiento personalizado con múltiples fuentes:
  - Documentos (PDF, TXT, DOCX, Markdown)
  - URLs y sitios web
  - Texto directo
- Responde automáticamente hasta el 80% de consultas
- Disponible 24/7 sin intervención humana

### ⚡ **Respuestas Rápidas (Quick Prompts)**
- Botones interactivos para preguntas frecuentes
- Enlaces externos o mensajes predefinidos
- Interfaz estilo ChatGPT minimalista
- Configuración visual desde el dashboard

### 🔧 **Function Calling**
- Define funciones personalizadas que el chatbot puede ejecutar
- Integración con APIs externas (REST)
- Parámetros tipados y validación automática
- Ejemplos: consultar inventario, crear tickets, enviar emails

### 🎨 **Personalización Completa**
- Editor visual de apariencia del widget
- Colores, posición, mensajes personalizados
- Múltiples estilos predefinidos (Moderno, Profesional, Vibrante, etc.)
- Vista previa en tiempo real

### 📊 **Analytics y Monitoreo**
- Conversaciones guardadas y analizables
- Estadísticas de uso de mensajes/tokens
- Captura de leads automática
- Historial de interacciones por chatbot

### 🔌 **Integración Sencilla**
- Una línea de código JavaScript
- Compatible con cualquier sitio web
- Responsive (funciona en móvil y desktop)
- Sin dependencias externas

## 🚀 Instalación

### Requisitos Previos
- Node.js (v14 o superior)
- npm o yarn
- Cuenta de OpenAI con API Key

### Instalación Rápida

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/chatbot-ai.git
cd chatbot-ai

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env y agregar tu OPENAI_API_KEY

# Iniciar el servidor
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📖 Uso

### 1. Acceder al Dashboard
Abre `http://localhost:3000/dashboard.html` en tu navegador.

### 2. Crear un Chatbot
1. Haz clic en "Nuevo Chatbot"
2. Ingresa nombre y descripción
3. Configura el modelo (GPT-3.5-turbo recomendado)
4. Define el prompt del sistema

### 3. Entrenar el Chatbot
1. Ve a la sección "Entrenar Chatbot"
2. Sube documentos, ingresa URLs o texto directo
3. El contenido se procesa automáticamente
4. El chatbot aprende de todo el material proporcionado

### 4. Configurar Respuestas Rápidas
1. Ve a "Respuestas Rápidas"
2. Crea botones con:
   - Título del botón
   - Enlace externo (opcional)
   - Mensaje al chatbot (opcional)
3. Los botones aparecerán en el widget

### 5. Integrar en tu Sitio Web
1. Haz clic en "Integrar Chatbot"
2. Copia el código JavaScript proporcionado
3. Pégalo antes del cierre de `</body>` en tu HTML

Ejemplo:
```html
<script src="http://localhost:3000/chat-widget.js" 
        data-api-url="http://localhost:3000/api"
        data-api-key="chatbot_1234567890_abc123"
        data-title="Asistente Virtual"
        data-welcome="¡Hola! ¿En qué puedo ayudarte?">
</script>
```

## 🏗️ Estructura del Proyecto

```
chatbot-ai/
├── public/               # Archivos públicos (frontend)
│   ├── index.html       # Landing page
│   ├── dashboard.html   # Panel de control
│   ├── chat-widget.js   # Widget embebible
│   ├── css/
│   │   └── dashboard.css
│   └── js/
│       └── dashboard.js
├── routes/              # Rutas de la API
│   ├── api.js          # Chat endpoints
│   ├── chatbots.js     # CRUD chatbots
│   ├── functions.js    # Function calling
│   ├── quickPrompts.js # Respuestas rápidas
│   ├── training.js     # Entrenamiento
│   └── usage.js        # Estadísticas de uso
├── services/            # Lógica de negocio
│   ├── chatbotService.js      # Procesamiento de mensajes
│   ├── databaseService.js     # Operaciones BD
│   ├── documentProcessor.js   # Procesamiento de archivos
│   └── trainingService.js     # Gestión de entrenamiento
├── training-data/       # Datos de entrenamiento
├── uploads/            # Archivos subidos
├── server.js           # Servidor Express
├── database.sqlite     # Base de datos SQLite
└── package.json
```

## 📡 API Endpoints

### Chatbots
- `GET /api/chatbots` - Listar todos los chatbots
- `POST /api/chatbots` - Crear nuevo chatbot
- `GET /api/chatbots/:id` - Obtener chatbot específico
- `PUT /api/chatbots/:id` - Actualizar chatbot
- `DELETE /api/chatbots/:id` - Eliminar chatbot

### Chat
- `POST /api/chat` - Enviar mensaje al chatbot
- `GET /api/history/:sessionId` - Obtener historial de conversación

### Entrenamiento
- `POST /api/training/upload` - Subir documentos
- `POST /api/training/url` - Entrenar desde URL
- `POST /api/training/text` - Entrenar con texto
- `GET /api/training/data/:chatbotId` - Listar datos de entrenamiento

### Respuestas Rápidas
- `GET /api/quick-prompts?chatbotId=xxx` - Listar prompts
- `POST /api/quick-prompts` - Crear prompt
- `PUT /api/quick-prompts/:id` - Actualizar prompt
- `DELETE /api/quick-prompts/:id` - Eliminar prompt

### Funciones
- `GET /api/functions/:chatbotId` - Listar funciones
- `POST /api/functions` - Crear función
- `PUT /api/functions/:id` - Actualizar función
- `DELETE /api/functions/:id` - Eliminar función

### Uso
- `GET /api/usage/:chatbotId` - Obtener estadísticas de uso
- `PUT /api/usage/:chatbotId/plan` - Cambiar plan
- `POST /api/usage/:chatbotId/reset` - Resetear contador

## 💰 Planes y Límites

| Plan       | Mensajes/mes | Chatbots  | Contenido      | Precio   |
|------------|--------------|-----------|----------------|----------|
| Free       | 20           | 1         | 10 piezas      | $0       |
| Starter    | 2,000        | 5         | 200 piezas     | $29/mes  |
| Pro        | 5,000        | 10        | 500 piezas     | $49/mes  |
| Enterprise | 10,000       | Ilimitado | Ilimitado      | $89/mes  |

**Nota:** 1 mensaje ≈ 350 tokens promedio de OpenAI

## 🛠️ Tecnologías Utilizadas

- **Backend:** Node.js + Express.js
- **Base de Datos:** SQLite3
- **IA:** OpenAI GPT-3.5-turbo / GPT-4
- **Frontend:** Vanilla JavaScript + CSS
- **Procesamiento:** pdf-parse, mammoth, cheerio

## 🔒 Seguridad

- API keys almacenadas de forma segura
- Validación de datos en todas las peticiones
- Límites de tamaño de archivos (10MB)
- Sanitización de contenido HTML
- CORS configurado correctamente

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 📧 Contacto

Para soporte o consultas: soporte@chatbot-ai.com

---

**Desarrollado con ❤️ usando Node.js y OpenAI GPT**
