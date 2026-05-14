"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.verifyEmailConnection = verifyEmailConnection;
const nodemailer_1 = __importDefault(require("nodemailer"));
/**
 * GEM Z — Email Service
 *
 * Centralized transactional email sender using Nodemailer.
 * Supports: Welcome emails, email verification OTPs, password reset links.
 *
 * Config is driven by SMTP_* environment variables.
 */
// ─── Transporter Setup ──────────────────────────────────────
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const FROM = process.env.SMTP_FROM || 'Gem Z <noreply@gemz.app>';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
// ─── Base HTML Template ─────────────────────────────────────
function buildEmailHtml(title, contentHtml) {
    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ff7b00,#ff4500);padding:32px;text-align:center;">
              <h1 style="margin:0;font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;font-style:italic;">
                GEM Z
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:2px;text-transform:uppercase;">
                KINETIC REVOLUTION
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 48px;">
              ${contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0a0a0a;padding:24px 48px;border-top:1px solid #222;text-align:center;">
              <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">
                © ${new Date().getFullYear()} Gem Z Fitness Ecosystem. All rights reserved.<br/>
                <a href="${CLIENT_URL}" style="color:#ff7b00;text-decoration:none;">gemz.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
// ─── Email Functions ─────────────────────────────────────────
/**
 * Send a welcome email after successful registration.
 */
async function sendWelcomeEmail(params) {
    const roleLabel = {
        trainee: 'متدرب',
        trainer: 'مدرب',
        gym_admin: 'مدير صالة',
        store_admin: 'مدير متجر',
    };
    const content = `
        <h2 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;">
            مرحباً بك يا ${params.fullName}! 🎉
        </h2>
        <p style="margin:0 0 24px;color:#aaa;font-size:16px;line-height:1.7;">
            تم تسجيلك بنجاح في منصة <strong style="color:#ff7b00;">Gem Z</strong> 
            كـ <strong style="color:#ff7b00;">${roleLabel[params.role] || params.role}</strong>.
            <br/>انضم لمجتمع الرياضة الأقوى في مصر وابدأ رحلتك اليوم.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
          <tr>
            <td style="background:#ff7b00;border-radius:50px;padding:16px 40px;text-align:center;">
              <a href="${CLIENT_URL}/login"
                 style="color:#fff;text-decoration:none;font-size:16px;font-weight:700;display:block;">
                ابدأ الآن →
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0;color:#555;font-size:13px;">
            إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة.
        </p>`;
    await transporter.sendMail({
        from: FROM,
        to: params.to,
        subject: `مرحباً بك في Gem Z يا ${params.fullName}! 🔥`,
        html: buildEmailHtml('مرحباً بك في Gem Z', content),
    });
}
/**
 * Send email verification OTP.
 */
async function sendVerificationEmail(params) {
    const verifyUrl = `${CLIENT_URL}/verify-email?token=${params.token}`;
    const content = `
        <h2 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;">
            تحقق من بريدك الإلكتروني 📧
        </h2>
        <p style="margin:0 0 24px;color:#aaa;font-size:16px;line-height:1.7;">
            مرحباً ${params.fullName}، انقر على الزر أدناه لتأكيد إيميلك.
            <br/>هذا الرابط صالح لمدة <strong style="color:#ff7b00;">24 ساعة</strong>.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
          <tr>
            <td style="background:#ff7b00;border-radius:50px;padding:16px 40px;text-align:center;">
              <a href="${verifyUrl}"
                 style="color:#fff;text-decoration:none;font-size:16px;font-weight:700;display:block;">
                تأكيد البريد الإلكتروني ✓
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 8px;color:#555;font-size:13px;">
            أو انسخ هذا الرابط في المتصفح:
        </p>
        <p style="margin:0;color:#ff7b00;font-size:12px;word-break:break-all;">
            ${verifyUrl}
        </p>`;
    await transporter.sendMail({
        from: FROM,
        to: params.to,
        subject: 'تأكيد البريد الإلكتروني — Gem Z 🔐',
        html: buildEmailHtml('تأكيد البريد الإلكتروني', content),
    });
}
/**
 * Send password reset link.
 */
async function sendPasswordResetEmail(params) {
    const resetUrl = `${CLIENT_URL}/reset-password?token=${params.token}`;
    const content = `
        <h2 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:700;">
            إعادة تعيين كلمة المرور 🔑
        </h2>
        <p style="margin:0 0 24px;color:#aaa;font-size:16px;line-height:1.7;">
            مرحباً ${params.fullName}، تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.
            <br/>انقر على الزر أدناه لإنشاء كلمة مرور جديدة. هذا الرابط صالح لمدة 
            <strong style="color:#ff7b00;">ساعة واحدة فقط</strong>.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
          <tr>
            <td style="background:#ff7b00;border-radius:50px;padding:16px 40px;text-align:center;">
              <a href="${resetUrl}"
                 style="color:#fff;text-decoration:none;font-size:16px;font-weight:700;display:block;">
                إعادة تعيين كلمة المرور →
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0;color:#555;font-size:13px;line-height:1.7;">
            إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة.
            حسابك آمن ولن يتغير شيء.
        </p>`;
    await transporter.sendMail({
        from: FROM,
        to: params.to,
        subject: 'إعادة تعيين كلمة مرور Gem Z 🔑',
        html: buildEmailHtml('إعادة تعيين كلمة المرور', content),
    });
}
/**
 * Verify that the SMTP connection is working.
 * Call this on server startup.
 */
async function verifyEmailConnection() {
    try {
        await transporter.verify();
        console.log('[Email] SMTP connection verified successfully.');
        return true;
    }
    catch (err) {
        console.warn('[Email] SMTP connection failed:', err.message);
        return false;
    }
}
