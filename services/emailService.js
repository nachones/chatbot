/**
 * Servicio de Email para MIABOT
 * Envío de correos de verificación y recuperación de contraseña
 */
const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.transporter = null;
    this.configured = false;
    this.from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@micopiloto.es';
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';
    this.initialize();
  }

  initialize() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.log('⚠ SMTP no configurado — emails deshabilitados');
      return;
    }

    const port = parseInt(process.env.SMTP_PORT) || 587;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true para 465, false para 587
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    // Verificar conexión
    this.transporter.verify()
      .then(() => {
        console.log('✓ SMTP conectado correctamente');
        this.configured = true;
      })
      .catch(err => {
        console.error('✗ Error SMTP:', err.message);
        this.configured = false;
      });
  }

  /**
   * Genera un token seguro para verificación/reset
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Envía un email genérico
   */
  async sendMail(to, subject, html) {
    if (!this.configured || !this.transporter) {
      console.warn('⚠ SMTP no disponible — email no enviado a', to);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html
      });
      return true;
    } catch (error) {
      console.error('Error enviando email a', to, ':', error.message);
      return false;
    }
  }

  /**
   * Email de verificación de cuenta
   */
  async sendVerificationEmail(email, token, name) {
    const verifyUrl = `${this.appUrl}/api/auth/verify-email?token=${token}`;
    const greeting = name ? `Hola ${name}` : 'Hola';

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f9fc; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C63FF; margin: 0; font-size: 28px;">🤖 MIABOT</h1>
          <p style="color: #888; margin-top: 5px;">Tu plataforma de chatbots con IA</p>
        </div>
        
        <h2 style="color: #333; margin-bottom: 10px;">${greeting},</h2>
        <p style="color: #555; line-height: 1.6;">
          Gracias por registrarte en MIABOT. Para activar tu cuenta, haz clic en el siguiente botón:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background: #6C63FF; color: white; padding: 14px 40px; border-radius: 8px; 
                    text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Verificar mi email
          </a>
        </div>
        
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
          <a href="${verifyUrl}" style="color: #6C63FF; word-break: break-all;">${verifyUrl}</a>
        </p>
        
        <p style="color: #888; font-size: 13px;">
          Este enlace expira en <strong>24 horas</strong>. Si no has solicitado esta cuenta, ignora este email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} MIABOT — app.micopiloto.es
        </p>
      </div>
    </div>`;

    return this.sendMail(email, 'Verifica tu cuenta en MIABOT', html);
  }

  /**
   * Email de recuperación de contraseña
   */
  async sendPasswordResetEmail(email, token, name) {
    const resetUrl = `${this.appUrl}/?reset-token=${token}`;
    const greeting = name ? `Hola ${name}` : 'Hola';

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f9fc; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C63FF; margin: 0; font-size: 28px;">🤖 MIABOT</h1>
          <p style="color: #888; margin-top: 5px;">Recuperación de contraseña</p>
        </div>
        
        <h2 style="color: #333; margin-bottom: 10px;">${greeting},</h2>
        <p style="color: #555; line-height: 1.6;">
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. 
          Haz clic en el siguiente botón para crear una nueva contraseña:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #FF6B6B; color: white; padding: 14px 40px; border-radius: 8px; 
                    text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Restablecer contraseña
          </a>
        </div>
        
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
          <a href="${resetUrl}" style="color: #6C63FF; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <p style="color: #888; font-size: 13px;">
          Este enlace expira en <strong>1 hora</strong>. Si no has solicitado este cambio, ignora este email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} MIABOT — app.micopiloto.es
        </p>
      </div>
    </div>`;

    return this.sendMail(email, 'Restablece tu contraseña en MIABOT', html);
  }

  /**
   * Email de bienvenida tras verificar
   */
  async sendWelcomeEmail(email, name) {
    const dashboardUrl = `${this.appUrl}/dashboard`;
    const greeting = name ? `¡Bienvenido/a ${name}!` : '¡Bienvenido/a!';

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f9fc; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C63FF; margin: 0; font-size: 28px;">🤖 MIABOT</h1>
        </div>
        
        <h2 style="color: #333; text-align: center;">${greeting}</h2>
        <p style="color: #555; line-height: 1.6; text-align: center;">
          Tu cuenta ha sido verificada correctamente. Ya puedes empezar a crear tus chatbots con IA.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" 
             style="background: #6C63FF; color: white; padding: 14px 40px; border-radius: 8px; 
                    text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Ir al Dashboard
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} MIABOT — app.micopiloto.es
        </p>
      </div>
    </div>`;

    return this.sendMail(email, '¡Bienvenido/a a MIABOT! 🎉', html);
  }

  /**
   * Email de bienvenida tras pago (con credenciales auto-generadas)
   */
  async sendPaymentWelcomeEmail(email, name, password, planId, billing) {
    const dashboardUrl = `${this.appUrl}/dashboard`;
    const greeting = name ? `¡Hola ${name}!` : '¡Hola!';
    const planNames = { starter: 'Starter', pro: 'Pro', empresas: 'Empresas' };
    const planName = planNames[planId] || planId;
    const billingText = billing === 'annual' ? 'anual' : 'mensual';

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f9fc; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C63FF; margin: 0; font-size: 28px;">🤖 MIABOT</h1>
          <p style="color: #888; margin-top: 5px;">Tu plataforma de chatbots con IA</p>
        </div>

        <h2 style="color: #333; text-align: center;">${greeting}</h2>
        <p style="color: #555; line-height: 1.6; text-align: center;">
          ¡Tu pago se ha procesado correctamente! Ya tienes acceso al plan <strong>${planName}</strong> (${billingText}).
        </p>

        <div style="background: #f0f0ff; border-radius: 10px; padding: 25px; margin: 25px 0; border-left: 4px solid #6C63FF;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">🔐 Tus credenciales de acceso</h3>
          <p style="color: #555; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="color: #555; margin: 5px 0;"><strong>Contraseña:</strong> <code style="background:#e8e8ff; padding:3px 8px; border-radius:4px; font-size:15px;">${password}</code></p>
          <p style="color: #FF6B6B; font-size: 13px; margin-top: 12px;">
            ⚠️ Te recomendamos cambiar tu contraseña una vez dentro del dashboard.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}"
             style="background: #6C63FF; color: white; padding: 14px 40px; border-radius: 8px;
                    text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Acceder a mi Dashboard
          </a>
        </div>

        <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-top: 20px;">
          <p style="color: #666; font-size: 14px; margin: 0;"><strong>Próximos pasos:</strong></p>
          <ol style="color: #666; font-size: 13px; padding-left: 20px; margin: 10px 0 0 0;">
            <li>Inicia sesión con tus credenciales</li>
            <li>Crea tu primer chatbot</li>
            <li>Entrénalo con tus documentos o URLs</li>
            <li>Instala el widget en tu web</li>
          </ol>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} MIABOT — app.micopiloto.es
        </p>
      </div>
    </div>`;

    return this.sendMail(email, `¡Bienvenido/a a MIABOT! Tu plan ${planName} está activo 🚀`, html);
  }

  /**
   * Email de upgrade de plan (usuario existente)
   */
  async sendPlanUpgradeEmail(email, name, planId, billing) {
    const dashboardUrl = `${this.appUrl}/dashboard`;
    const greeting = name ? `Hola ${name}` : 'Hola';
    const planNames = { starter: 'Starter', pro: 'Pro', empresas: 'Empresas' };
    const planName = planNames[planId] || planId;
    const billingText = billing === 'annual' ? 'anual' : 'mensual';

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f9fc; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C63FF; margin: 0; font-size: 28px;">🤖 MIABOT</h1>
        </div>

        <h2 style="color: #333; text-align: center;">${greeting}, ¡tu plan ha sido actualizado!</h2>
        <p style="color: #555; line-height: 1.6; text-align: center;">
          Ahora tienes acceso al plan <strong>${planName}</strong> (${billingText}). 
          Disfruta de todas las nuevas funcionalidades.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}"
             style="background: #6C63FF; color: white; padding: 14px 40px; border-radius: 8px;
                    text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Ir al Dashboard
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} MIABOT — app.micopiloto.es
        </p>
      </div>
    </div>`;

    return this.sendMail(email, `Plan actualizado a ${planName} ✨`, html);
  }

  /**
   * Email de pago fallido
   */
  async sendPaymentFailedEmail(email, name) {
    const greeting = name ? `Hola ${name}` : 'Hola';

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f9fc; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C63FF; margin: 0; font-size: 28px;">🤖 MIABOT</h1>
        </div>

        <h2 style="color: #333; text-align: center;">⚠️ Problema con tu pago</h2>
        <p style="color: #555; line-height: 1.6;">
          ${greeting}, no hemos podido procesar tu último pago. 
          Por favor, actualiza tu método de pago para evitar la interrupción de tu servicio.
        </p>

        <p style="color: #555; line-height: 1.6;">
          Si crees que es un error, contacta con nosotros en <a href="mailto:hola@micopiloto.es" style="color: #6C63FF;">hola@micopiloto.es</a>.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} MIABOT — app.micopiloto.es
        </p>
      </div>
    </div>`;

    return this.sendMail(email, '⚠️ Problema con tu pago en MIABOT', html);
  }

  /**
   * Email de suscripción cancelada
   */
  async sendSubscriptionCancelledEmail(email, name) {
    const greeting = name ? `Hola ${name}` : 'Hola';

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f9fc; padding: 40px 20px;">
      <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C63FF; margin: 0; font-size: 28px;">🤖 MIABOT</h1>
        </div>

        <h2 style="color: #333; text-align: center;">Tu suscripción ha sido cancelada</h2>
        <p style="color: #555; line-height: 1.6;">
          ${greeting}, tu suscripción en MIABOT ha sido cancelada. 
          Tus chatbots han sido desactivados.
        </p>
        <p style="color: #555; line-height: 1.6;">
          Si deseas reactivar tu cuenta, puedes contratar un nuevo plan en cualquier momento 
          desde <a href="${this.appUrl}" style="color: #6C63FF;">app.micopiloto.es</a>.
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 20px;">
          Tus datos se conservarán durante 30 días. Pasado ese tiempo, serán eliminados.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} MIABOT — app.micopiloto.es
        </p>
      </div>
    </div>`;

    return this.sendMail(email, 'Tu suscripción en MIABOT ha sido cancelada', html);
  }
}

module.exports = new EmailService();
