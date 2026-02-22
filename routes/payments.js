const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../services/databaseService');
const emailService = require('../services/emailService');
const { authMiddleware } = require('./auth');

// Initialize Stripe only if key is configured
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✓ Stripe configurado');
} else {
  console.log('⚠ Stripe no configurado (STRIPE_SECRET_KEY no encontrada)');
}

// ==========================================
// PLAN DEFINITIONS
// ==========================================
const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: '9,95€/mes',
    annualPrice: '99€/año',
    monthlyAmount: 995,
    annualAmount: 9900,
    tokens: 100000,
    messages: 1000,
    chatbots: 1,
    features: [
      '1 chatbot',
      '1.000 mensajes / mes',
      '100.000 tokens incluidos',
      'Gemini 2.0 Flash (IA avanzada)',
      'Entrenamiento con archivos y URLs',
      'Captura de leads',
      'Widget personalizable',
      'Integración en tu web'
    ],
    monthlyPriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    annualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || null
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: '39,95€/mes',
    annualPrice: '399€/año',
    monthlyAmount: 3995,
    annualAmount: 39900,
    tokens: 500000,
    messages: 10000,
    chatbots: 3,
    popular: true,
    features: [
      '3 chatbots',
      '10.000 mensajes / mes',
      '500.000 tokens incluidos',
      'Todos los modelos IA',
      'Function calling (API externa)',
      'Acceso API completo',
      'Entrenamiento ilimitado',
      'Sin marca de agua',
      'Soporte prioritario',
      'Agendar citas con Google Calendar'
    ],
    monthlyPriceId: process.env.STRIPE_PRO_PRICE_ID || null,
    annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || null
  },
  empresas: {
    id: 'empresas',
    name: 'Empresas',
    annualPrice: '850€/año',
    annualAmount: 85000,
    tokens: 999999999,
    messages: 999999999,
    chatbots: 999,
    annualOnly: true,
    features: [
      'Chatbots ilimitados',
      'Mensajes ilimitados',
      'Tokens ilimitados',
      'Usa tu propia API key',
      'Todos los modelos (GPT-4, Gemini, etc.)',
      'Function calling avanzado',
      'API empresarial',
      'Entrenamiento ilimitado',
      'Soporte dedicado',
      'Agendar citas con Google Calendar',
      'Revende chatbots a tus clientes'
    ],
    annualPriceId: process.env.STRIPE_EMPRESAS_PRICE_ID || null
  }
};

// Get pricing info (public)
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: Object.values(PLANS),
    stripeConfigured: !!stripe
  });
});

// Create Stripe checkout session (PUBLIC - no auth required)
// Users pay first, account is created on webhook
router.post('/checkout', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no está configurado. Contacta al administrador.' });
  }

  try {
    const { planId, billing, email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email es obligatorio' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email no válido' });
    }

    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Plan no válido' });
    }

    // Determine billing period and price ID
    const isAnnual = billing === 'annual';
    let priceId;

    if (plan.annualOnly) {
      priceId = plan.annualPriceId;
    } else {
      priceId = isAnnual ? plan.annualPriceId : plan.monthlyPriceId;
    }

    if (!priceId) {
      return res.status(400).json({ error: 'Precio de Stripe no configurado para este plan' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email.toLowerCase());

    let customerId = null;
    if (existingUser && existingUser.stripe_customer_id) {
      customerId = existingUser.stripe_customer_id;
    } else {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: email.toLowerCase(),
        name: name || '',
        metadata: { source: 'checkout' }
      });
      customerId = customer.id;

      // If user exists but has no Stripe customer, update it
      if (existingUser) {
        await db.updateUser(existingUser.id, { stripe_customer_id: customerId });
      }
    }

    // Create checkout session
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/?payment=success&plan=${planId}`,
      cancel_url: `${baseUrl}/?payment=cancelled`,
      metadata: {
        planId,
        billing: isAnnual ? 'annual' : 'monthly',
        customerName: name || '',
        customerEmail: email.toLowerCase()
      },
      subscription_data: {
        metadata: {
          planId,
          billing: isAnnual ? 'annual' : 'monthly'
        }
      }
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creando sesión de Stripe:', error);
    res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
});

// Get customer portal URL (for managing subscription)
router.post('/portal', authMiddleware, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no está configurado' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    if (!user || !user.stripe_customer_id) {
      return res.status(400).json({ error: 'No tienes una suscripción activa' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${baseUrl}/dashboard`
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Error creando portal de Stripe:', error);
    res.status(500).json({ error: 'Error al acceder al portal de pagos' });
  }
});

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.sendStatus(200);

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      console.warn('⚠ STRIPE_WEBHOOK_SECRET no configurado - webhook rechazado');
      return res.status(503).json({ error: 'Webhook no configurado' });
    }
  } catch (err) {
    console.error('Error verificando webhook:', err.message);
    return res.status(400).send('Webhook signature verification failed');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const planId = session.metadata?.planId;
        const billing = session.metadata?.billing || 'monthly';
        const customerEmail = session.metadata?.customerEmail || session.customer_details?.email;
        const customerName = session.metadata?.customerName || session.customer_details?.name || '';
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (!customerEmail || !planId) {
          console.error('⚠ Webhook: falta email o planId en metadata');
          break;
        }

        const plan = PLANS[planId];
        if (!plan) {
          console.error(`⚠ Webhook: plan desconocido "${planId}"`);
          break;
        }

        // Check if user already exists
        let user = await db.getUserByEmail(customerEmail.toLowerCase());

        if (user) {
          // User exists: upgrade plan
          await db.updateUser(user.id, {
            plan: planId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            is_active: 1
          });

          // Update chatbot limits
          const chatbots = await db.getChatbotsByUser(user.id);
          for (const bot of chatbots) {
            await db.updateChatbot(bot.id, {
              plan: planId,
              tokens_limit: plan.tokens
            });
          }

          // Send upgrade confirmation email
          await emailService.sendPlanUpgradeEmail(customerEmail, customerName || user.name, planId, billing);
        } else {
          // NEW USER: create account automatically
          const rawPassword = crypto.randomBytes(6).toString('base64url'); // ~8 chars, URL-safe
          const hashedPassword = await bcrypt.hash(rawPassword, 12);
          const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);

          await db.createUser(userId, customerEmail.toLowerCase(), hashedPassword, customerName, '');

          // Activate and set plan
          await db.updateUser(userId, {
            plan: planId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            is_active: 1
          });

          // Mark email as verified (they paid, so email is real)
          await db.verifyEmailDirect(userId);

          // Send welcome email with credentials
          await emailService.sendPaymentWelcomeEmail(
            customerEmail.toLowerCase(),
            customerName,
            rawPassword,
            planId,
            billing
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const email = customer.email;

        if (email) {
          const user = await db.getUserByEmail(email.toLowerCase());
          if (user) {
            // Deactivate account (no free plan)
            await db.updateUser(user.id, {
              plan: 'expired',
              stripe_subscription_id: null,
              is_active: 0
            });

            // Deactivate chatbots
            const chatbots = await db.getChatbotsByUser(user.id);
            for (const bot of chatbots) {
              await db.updateChatbot(bot.id, { plan: 'expired', tokens_limit: 0 });
            }

            await emailService.sendSubscriptionCancelledEmail(email, user.name);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email;
        if (customerEmail) {
          const user = await db.getUserByEmail(customerEmail.toLowerCase());
          await emailService.sendPaymentFailedEmail(customerEmail, user?.name || '');
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

// Get subscription status
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    let subscription = null;
    if (stripe && user.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      } catch (e) {
        // Subscription may no longer exist
      }
    }

    res.json({
      success: true,
      plan: user.plan || 'starter',
      stripeConfigured: !!stripe,
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      } : null
    });
  } catch (error) {
    console.error('Error obteniendo suscripción:', error);
    res.status(500).json({ error: 'Error obteniendo información de suscripción' });
  }
});

module.exports = router;
