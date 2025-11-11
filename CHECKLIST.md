# ✅ Lista de Verificación - Sistema Chatbot AI

## 📋 Checklist de Pruebas Completas

### 1. Configuración Inicial
- [ ] Verificar que el archivo `.env` existe y tiene `OPENAI_API_KEY` configurada
- [ ] Servidor corriendo en `http://localhost:3000`
- [ ] Dashboard accesible en `http://localhost:3000/dashboard.html`
- [ ] Landing page accesible en `http://localhost:3000`

### 2. Gestión de Chatbots
- [ ] Crear nuevo chatbot desde el botón "Nuevo Chatbot"
- [ ] Verificar que aparece en la lista del selector
- [ ] Cambiar entre chatbots usando el selector
- [ ] Editar configuración del chatbot (nombre, descripción, temperatura)
- [ ] Suspender chatbot
- [ ] Reactivar chatbot
- [ ] Eliminar chatbot

### 3. Entrenamiento
- [ ] Subir archivo PDF
- [ ] Subir archivo TXT
- [ ] Subir archivo DOCX
- [ ] Agregar URL de sitio web
- [ ] Agregar texto directo
- [ ] Verificar que los datos aparecen en la lista
- [ ] Eliminar dato de entrenamiento

### 4. Respuestas Rápidas
- [ ] Crear respuesta rápida con enlace externo
- [ ] Crear respuesta rápida con mensaje al chatbot
- [ ] Editar respuesta rápida
- [ ] Cambiar orden de respuestas
- [ ] Deshabilitar respuesta rápida
- [ ] Eliminar respuesta rápida
- [ ] Verificar que aparecen en el widget

### 5. Function Calling
- [ ] Crear función personalizada
- [ ] Configurar parámetros de la función
- [ ] Definir URL del endpoint
- [ ] Habilitar/deshabilitar función
- [ ] Probar que el chatbot ejecuta la función correctamente
- [ ] Editar función existente
- [ ] Eliminar función

### 6. Apariencia del Widget
- [ ] Cambiar color primario
- [ ] Cambiar posición del widget
- [ ] Personalizar título del widget
- [ ] Personalizar mensaje de bienvenida
- [ ] Cambiar estilo predefinido (Moderno, Profesional, Vibrante, etc.)
- [ ] Vista previa en tiempo real
- [ ] Guardar cambios

### 7. Integración y Código
- [ ] Copiar código de integración
- [ ] Verificar que incluye la API key correcta
- [ ] Probar widget en `example.html`
- [ ] Widget se abre y cierra correctamente
- [ ] Widget es responsive (funciona en móvil)

### 8. Chat y Conversaciones
- [ ] Enviar mensaje al chatbot
- [ ] Recibir respuesta del chatbot
- [ ] Verificar que usa el contenido de entrenamiento
- [ ] Hacer clic en respuesta rápida con enlace
- [ ] Hacer clic en respuesta rápida con mensaje
- [ ] Verificar historial de conversaciones en dashboard
- [ ] Buscar conversaciones por texto

### 9. Sistema de Uso y Mensajes
- [ ] Verificar contador de mensajes en header (ej: 5/10,000)
- [ ] Enviar mensaje y verificar que el contador aumenta
- [ ] Verificar que la barra de progreso se actualiza
- [ ] Verificar que cambia a naranja al llegar a 75%
- [ ] Verificar que cambia a rojo al llegar a 90%
- [ ] Verificar estadísticas en la sección de uso

### 10. Estadísticas y Analytics
- [ ] Ver estadísticas en el panel principal
- [ ] Verificar total de mensajes
- [ ] Verificar total de conversaciones
- [ ] Verificar total de contenido de entrenamiento
- [ ] Verificar gráfico de uso por día
- [ ] Ver conversaciones recientes

### 11. Captura de Leads
- [ ] Configurar captura de leads
- [ ] Chatbot solicita información de contacto
- [ ] Ver leads capturados en la sección Contactos
- [ ] Exportar leads

### 12. Errores y Validaciones
- [ ] Intentar crear chatbot sin nombre (debe mostrar error)
- [ ] Intentar crear respuesta rápida sin título (debe mostrar error)
- [ ] Intentar crear función sin nombre (debe mostrar error)
- [ ] Verificar que no hay errores en consola del navegador
- [ ] Verificar que los mensajes de error son claros y en español

## 🚀 Resultado Esperado

Al completar todas las tareas, el sistema debe:
- ✅ Funcionar sin errores
- ✅ Todos los textos en español
- ✅ Widget integrable funcional
- ✅ Chatbot respondiendo correctamente
- ✅ Estadísticas actualizándose en tiempo real
- ✅ Interfaz limpia y profesional

## 📝 Notas

- **Tokens vs Mensajes:** El sistema internamente cuenta tokens (como cobra OpenAI) pero muestra "mensajes" al usuario para facilitar comprensión. 1 mensaje ≈ 350 tokens.
- **Planes:** Free (20), Starter (2000), Pro (5000), Enterprise (10000 mensajes/mes).
- **Reseteo:** Los contadores se resetean automáticamente cada mes.

---

**Estado:** Sistema listo para producción
**Última revisión:** 11/11/2025
