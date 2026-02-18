const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');
const { authMiddleware } = require('./auth');

const db = new DatabaseService();

// Initialize Stripe only if key is configured
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✓ Stripe configurado');
} else {
  console.log('⚠ Stripe no configurado (STRIPE_SECRET_KEY no encontrada)');
}

// Get pricing info (public)
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        price: '9,95€/mes',
        priceAmount: 995, // cents
        interval: 'month',
        tokens: 100000,
        messages: 1000,
        chatbots: 3,
        features: ['100.000 tokens/mes', '1.000 mensajes', '3 chatbots', 'Gemini 2.0 Flash', 'Widget personalizable', 'Entrenamiento con archivos'],
        stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '25€/mes',
        priceAmount: 2500,
        interval: 'month',
        tokens: 500000,
        messages: 5000,
        chatbots: 10,
        features: ['500.000 tokens/mes', '5.000 mensajes', '10 chatbots', 'Todos los modelos IA', 'Function calling', 'API completo', 'Sin marca de agua'],
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null
      },
      {
        id: 'custom',
        name: 'Custom',
        price: '150€/año',
        priceAmount: 15000,
        interval: 'year',
        tokens: 999999999,
        messages: 999999999,
        chatbots: 999,
        features: ['Tokens ilimitados', 'Mensajes ilimitados', 'Chatbots ilimitados', 'Usa tu propia API key', 'Todos los modelos', 'Soporte dedicado'],
        stripePriceId: process.env.STRIPE_CUSTOM_PRICE_ID || null
      }
    ],
    stripeConfigured: !!stripe
  });
});

// Create Stripe checkout session
router.post('/checkout', authMiddleware, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe no está configurado. Contacta al administrador.' });
  }

  try {
    const { planId } = req.body;
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Map plan to Stripe price ID
    const priceMap = {
      starter: process.env.STRIPE_STARTER_PRICE_ID,
      pro: process.env.STRIPE_PRO_PRICE_ID,
      custom: process.env.STRIPE_CUSTOM_PRICE_ID
    };

    const priceId = priceMap[planId];
    if (!priceId) {
      return res.status(400).json({ error: 'Plan no válido o precio de Stripe no configurado' });
    }

    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id }
      });
      customerId = customer.id;
      await db.updateUser(user.id, { stripe_customer_id: customerId });
    }

    // Create checkout session
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?payment=success&plan=${planId}`,
      cancel_url: `${baseUrl}/dashboard?payment=cancelled`,
      metadata: { userId: user.id, planId }
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
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const subscriptionId = session.subscription;

        if (userId && planId) {
          await db.updateUser(userId, {
            plan: planId,
            stripe_subscription_id: subscriptionId
          });
          
          // Update all user's chatbots to new plan
          const chatbots = await db.getChatbotsByUser(userId);
          const tokenLimits = { starter: 100000, pro: 500000, custom: 999999999 };
          for (const bot of chatbots) {
            await db.updateChatbot(bot.id, {
              plan: planId,
              tokens_limit: tokenLimits[planId] || 100000
            });
          }
          console.log(`✓ Plan actualizado para usuario ${userId}: ${planId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        // Downgrade to starter when subscription cancelled
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.userId;
        if (userId) {
          await db.updateUser(userId, { plan: 'starter', stripe_subscription_id: null });
          const chatbots = await db.getChatbotsByUser(userId);
          for (const bot of chatbots) {
            await db.updateChatbot(bot.id, { plan: 'starter', tokens_limit: 100000 });
          }
          console.log(`⚠ Suscripción cancelada para usuario ${userId}, downgrade a starter`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`⚠ Pago fallido para customer ${invoice.customer}`);
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
