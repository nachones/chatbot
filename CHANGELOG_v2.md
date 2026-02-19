# MIABOT — Changelog v2 (19/02/2026)

## Resumen

Reestructuración completa del flujo de pago y onboarding. El usuario ahora paga primero en Stripe y su cuenta se crea automáticamente. Se añade captura de leads en el widget y se actualizan todos los planes de precios.

---

## Nuevos Planes de Precios

| Plan | Mensual | Anual | Chatbots | Mensajes/mes | Tokens |
|------|---------|-------|----------|--------------|--------|
| **Starter** | 9,95€ | 99€ | 1 | 1.000 | 100.000 |
| **Pro** ⭐ | 39,95€ | 399€ | 10 | 10.000 | 500.000 |
| **Empresas** | — | 850€ | Ilimitados | Ilimitados | Ilimitados (API key propia) |

- Toggle mensual/anual en la landing page
- Plan Empresas solo disponible en facturación anual
- Pro marcado como "Más Popular"

---

## Nuevo Flujo de Compra (Stripe Checkout)

### Antes
```
Registro → Login → Elegir plan → Pagar en Stripe
```

### Ahora
```
Elegir plan → Introducir nombre + email → Pagar en Stripe → Cuenta creada automáticamente → Email con credenciales
```

### Cambios técnicos

- **`POST /api/payments/checkout`** — Ya no requiere autenticación (público)
  - Recibe: `planId`, `billing` (monthly/annual), `email`, `name`
  - Crea cliente en Stripe y redirige a Checkout
- **Webhook `checkout.session.completed`** — Crea la cuenta:
  - Genera contraseña aleatoria segura
  - Crea usuario en BD con plan activo y email verificado
  - Envía email de bienvenida con credenciales
  - Si el usuario ya existe, hace upgrade del plan
- **Webhook `customer.subscription.deleted`** — Desactiva la cuenta (no hay plan gratuito)
- **Webhook `invoice.payment_failed`** — Envía email de aviso
- Registro público oculto en la landing (la pestaña "Crear Cuenta" ya no es visible)

---

## Nuevos Email Templates

| Email | Cuándo se envía |
|-------|-----------------|
| **Bienvenida con credenciales** | Tras primer pago (nuevo usuario) |
| **Upgrade de plan** | Cuando usuario existente cambia de plan |
| **Pago fallido** | Cuando Stripe no puede cobrar |
| **Suscripción cancelada** | Cuando se cancela la suscripción |

Todos los emails incluyen diseño HTML responsive con branding MIABOT.

---

## Lead Capture en el Widget

El widget ahora muestra un formulario de captura de datos **antes** de permitir chatear:

- **Campos**: Nombre (obligatorio), Email (obligatorio), Teléfono (opcional)
- Los datos se envían a `POST /api/leads`
- Se guarda en `sessionStorage` para no volver a preguntar en la misma sesión
- **Configurable** vía atributos del script:

```html
<script src="https://app.micopiloto.es/chat-widget.js"
  data-api-key="TU_CHATBOT_ID"
  data-lead-capture="true"
  data-lead-title="Antes de empezar..."
  data-lead-subtitle="Déjanos tus datos para poder ayudarte mejor">
</script>
```

Para desactivar: `data-lead-capture="false"`

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `routes/payments.js` | Planes nuevos, checkout público, webhook con creación de cuentas |
| `services/emailService.js` | 4 nuevos templates de email |
| `services/databaseService.js` | `verifyEmailDirect()`, `password` en `updateUser` allowed fields |
| `public/index.html` | Precios actualizados, toggle mensual/anual, modal de checkout, registro oculto |
| `public/chat-widget.js` | Formulario de lead capture antes del chat |
| `public/css/auth.css` | Estilos para billing toggle |
| `.env` / `.env.example` | Nuevas variables: `STRIPE_*_ANNUAL_PRICE_ID`, `STRIPE_EMPRESAS_PRICE_ID` |

---

## Variables de Entorno Nuevas

```env
# Precios anuales (nuevos)
STRIPE_STARTER_ANNUAL_PRICE_ID=price_xxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_xxx

# Plan Empresas (reemplaza STRIPE_CUSTOM_PRICE_ID)
STRIPE_EMPRESAS_PRICE_ID=price_xxx
```

---

## Pendiente

- [ ] Crear cuenta de Stripe y configurar claves en `.env`
- [ ] Crear productos y precios en Stripe Dashboard (6 prices: 3 planes × mensual/anual)
- [ ] Configurar webhook en Stripe apuntando a `https://app.micopiloto.es/api/payments/webhook`
- [ ] Probar flujo completo de compra end-to-end
