/**
 * Servicio de Email para MIABOT
 * Envío de correos de verificación y recuperación de contraseña
 */
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.configured = false;
    this.lastError = null;
    this.smtpConfig = null;
    this.from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@micopiloto.es';
    this.appUrl = process.env.APP_URL || 'https://app.micopiloto.es';
    this.initialize();
  }

  initialize() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      this.lastError = 'Variables SMTP_HOST, SMTP_USER o SMTP_PASS no definidas en .env';
      logger.info('⚠ SMTP no configurado — emails deshabilitados');
      return;
    }

    const port = parseInt(process.env.SMTP_PORT) || 587;

    this.smtpConfig = {
      host,
      port,
      secure: port === 465,
      user,
      from: this.from
    };

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true para 465, false para 587
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false // Plesk local mail - cert puede no coincidir
      },
      connectionTimeout: 10000, // 10s timeout de conexión
      greetingTimeout: 10000,   // 10s timeout saludo SMTP
      socketTimeout: 15000      // 15s timeout de socket
    });

    // Verificar conexión
    this.transporter.verify()
      .then(() => {
        logger.info('✓ SMTP conectado correctamente');
        logger.info(`  Host: ${host}:${port} | User: ${user}`);
        this.configured = true;
        this.lastError = null;
      })
      .catch(err => {
        this.lastError = err.message;
        logger.error('✗ Error SMTP:', err.message);
        logger.error(`  Config: ${host}:${port} | User: ${user}`);
        this.configured = false;
      });
  }

  /**
   * Reinicializa la conexión SMTP (útil para cambios en caliente)
   */
  reinitialize() {
    if (this.transporter) {
      this.transporter.close();
    }
    this.transporter = null;
    this.configured = false;
    this.lastError = null;
    this.smtpConfig = null;
    this.from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@micopiloto.es';
    this.appUrl = process.env.APP_URL || 'https://app.micopiloto.es';
    this.initialize();
  }

  /**
   * Diagnóstico completo de SMTP - devuelve info detallada
   */
  async diagnose() {
    const result = {
      timestamp: new Date().toISOString(),
      configured: this.configured,
      lastError: this.lastError,
      config: this.smtpConfig ? {
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: this.smtpConfig.secure,
        user: this.smtpConfig.user,
        from: this.smtpConfig.from
      } : null,
      envVars: {
        SMTP_HOST: process.env.SMTP_HOST ? '✓ definido' : '✗ no definido',
        SMTP_PORT: process.env.SMTP_PORT || '(default 587)',
        SMTP_USER: process.env.SMTP_USER ? '✓ definido' : '✗ no definido',
        SMTP_PASS: process.env.SMTP_PASS ? '✓ definido (' + process.env.SMTP_PASS.length + ' chars)' : '✗ no definido',
        SMTP_FROM: process.env.SMTP_FROM || '(no definido, usando SMTP_USER)',
        APP_URL: process.env.APP_URL || '(default https://app.micopiloto.es)'
      },
      connectionTest: null,
      sendTest: null
    };

    // Test de conexión
    if (this.transporter) {
      try {
        await this.transporter.verify();
        result.connectionTest = { success: true, message: 'Conexión SMTP verificada correctamente' };
        this.configured = true;
        this.lastError = null;
      } catch (err) {
        result.connectionTest = {
          success: false,
          error: err.message,
          code: err.code || 'UNKNOWN',
          command: err.command || null
        };
        this.lastError = err.message;
      }
    } else {
      result.connectionTest = { success: false, error: 'Transporter no inicializado - faltan variables SMTP' };
    }

    return result;
  }

  /**
   * Envía un email de prueba para verificar que todo funciona end-to-end
   */
  async sendTestEmail(to) {
    if (!this.transporter) {
      return { success: false, error: 'SMTP no inicializado' };
    }

    try {
      // Primero verificar conexión
      await this.transporter.verify();
      this.configured = true;

      // Enviar email de prueba
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject: '✓ Test SMTP MIABOT - ' + new Date().toLocaleString('es-ES'),
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #6C63FF;">🤖 MIABOT - Test SMTP</h2>
            <p>Este es un email de prueba para confirmar que la configuración SMTP funciona correctamente.</p>
            <div style="background: #f0f8f0; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <strong style="color: #2E7D32;">✓ SMTP funciona correctamente</strong><br>
              <small style="color: #666;">Host: ${this.smtpConfig?.host}:${this.smtpConfig?.port}</small><br>
              <small style="color: #666;">Fecha: ${new Date().toLocaleString('es-ES')}</small>
            </div>
            <p style="color: #888; font-size: 12px;">Si recibes este email, la recuperación de contraseña y el registro funcionarán correctamente.</p>
          </div>
        `
      });

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        response: info.response
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        code: err.code || 'UNKNOWN',
        command: err.command || null
      };
    }
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
    if (!this.transporter) {
      logger.warn('⚠ SMTP no inicializado — email no enviado a', to);
      return false;
    }

    // Si no está configurado, intentar reconectar una vez
    if (!this.configured) {
      try {
        await this.transporter.verify();
        this.configured = true;
        this.lastError = null;
        logger.info('✓ SMTP reconectado automáticamente');
      } catch (err) {
        logger.warn('⚠ SMTP no disponible (reintento fallido) — email no enviado a', to);
        this.lastError = err.message;
        return false;
      }
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html
      });
      logger.info(`✓ Email enviado a ${to} (${info.messageId})`);
      return true;
    } catch (error) {
      logger.error('Error enviando email a', to, ':', error.message);
      // Marcar como no configurado para reintentar en el siguiente envío
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        this.configured = false;
        this.lastError = error.message;
      }
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
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">🔐 Acceso a tu cuenta</h3>
          <p style="color: #555; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="color: #555; margin: 5px 0;"><strong>Contraseña:</strong> La que estableciste durante el registro</p>
          <p style="color: #6C63FF; font-size: 13px; margin-top: 12px;">
            Si no recuerdas tu contraseña, puedes restablecerla desde la pantalla de inicio de sesión.
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
