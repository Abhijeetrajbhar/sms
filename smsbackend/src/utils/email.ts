import nodemailer from 'nodemailer';
import config from '../config/env';
import logger from './logger';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_PORT === 465,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASSWORD,
  },
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] || character);
}

export function buildAccountActivationUrl(token: string): string {
  return `${config.CLIENT_URL.replace(/\/$/, '')}/activate-account?token=${encodeURIComponent(token)}`;
}

export async function sendAccountInvitationEmail(email: string, token: string, firstName: string): Promise<boolean> {
  const activationUrl = buildAccountActivationUrl(token);
  const safeFirstName = escapeHtml(firstName);

  try {
    await transporter.sendMail({
      from: config.EMAIL_FROM,
      to: email,
      subject: 'Activate your CampusOryx account',
      text: [
        `Hello ${firstName},`,
        'Your school has invited you to CampusOryx.',
        `Open this link within 48 hours to create your password: ${activationUrl}`,
        'If you were not expecting this invitation, contact your school administrator.',
      ].join('\n\n'),
      html: `
        <p>Hello ${safeFirstName},</p>
        <p>Your school has invited you to CampusOryx.</p>
        <p><a href="${activationUrl}">Activate your account</a></p>
        <p>This link expires in 48 hours. If you were not expecting it, contact your school administrator.</p>
      `,
    });
    return true;
  } catch (error) {
    logger.error('Account invitation email failed:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${config.CLIENT_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await transporter.sendMail({
      from: config.EMAIL_FROM,
      to: email,
      subject: 'Reset your CampusOryx password',
      text: [
        'A password reset was requested for your CampusOryx account.',
        `Open this link within 1 hour to set a new password: ${resetUrl}`,
        'If you did not request this, you can ignore this email.',
      ].join('\n\n'),
      html: `
        <p>A password reset was requested for your CampusOryx account.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
      `,
    });
    return true;
  } catch (error) {
    logger.error('Password reset email failed:', error);
    return false;
  }
}
