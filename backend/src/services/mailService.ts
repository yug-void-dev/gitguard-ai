/**
 * @file src/services/mailService.ts
 * @description Service for configuring mail transporter and sending password reset emails.
 */

import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../lib/logger';

let transporter: nodemailer.Transporter | null = null;

export interface EmailMetadata {
  ip?: string;
  userAgent?: string;
  timestamp?: string;
}

/**
 * Parses user-agent header into a clean, human-readable format.
 */
function parseUserAgent(ua?: string): string {
  if (!ua) return 'Unknown Client';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('like Mac OS X')) os = 'iOS';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Postman')) browser = 'Postman Runtime';

  if (os !== 'Unknown OS' && browser !== 'Unknown Browser') {
    return `${browser} on ${os}`;
  }
  return ua.length > 50 ? ua.substring(0, 50) + '...' : ua;
}

/**
 * Initializes and retrieves the SMTP transporter.
 * If SMTP configuration is missing, falls back to a dynamically generated Ethereal test account.
 */
async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  const isDev = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

  if (env.SMTP_HOST && env.SMTP_PORT) {
    logger.info(
      { host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER },
      'Initializing configured SMTP mail transporter'
    );
    const auth = env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined;

    // Optimize specifically for Gmail if the host contains 'gmail'
    if (env.SMTP_HOST.toLowerCase().includes('gmail') && auth) {
      logger.info('Gmail service detected, optimizing transporter for Gmail service');
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth,
      });
    } else {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465, // Use SSL/TLS for port 465
        auth,
      });
    }
  } else if (isDev) {
    logger.info('SMTP settings missing in development. Creating a temporary Ethereal test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      logger.info({ user: testAccount.user }, 'Ethereal test mail account created successfully');

      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to create Ethereal test account. Falling back to mock email logging.');
      // Create a mock transporter that logs emails to console if Ethereal creation fails
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  } else {
    // Production without SMTP: fallback to console logging to prevent crashes but log warnings
    logger.warn('SMTP settings are missing in non-development environment! Emails will not be sent.');
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return transporter;
}

/**
 * Generates the HTML template with the specified OTP code and optional audit metadata.
 */
function getOtpEmailHtml(otp: string, metadata?: EmailMetadata): string {
  const formattedIp = metadata?.ip || 'N/A';
  const formattedDevice = parseUserAgent(metadata?.userAgent);
  const formattedTime = metadata?.timestamp || new Date().toUTCString();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - GitGuard AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060714; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f1f5f9;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #060714; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #0a0b1e; border: 1px solid #1e1b4b; border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header (Brand) -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #6366f1, #22d3ee); padding: 8px; border-radius: 8px; display: inline-block;">
                    <!-- Shield Icon -->
                    <span style="font-size: 20px; font-weight: bold; color: #ffffff;">🛡️</span>
                  </td>
                  <td style="padding-left: 10px; font-family: 'Inter', sans-serif; font-weight: 800; font-size: 20px; letter-spacing: -0.5px; color: #ffffff;">
                    GitGuard AI
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Divider line -->
          <tr>
            <td style="height: 1px; background: linear-gradient(to right, transparent, #6366f1, #22d3ee, transparent); padding: 0; margin: 0;"></td>
          </tr>
          <!-- Body Text -->
          <tr>
            <td style="padding-top: 30px; text-align: center;">
              <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">Password Reset Request</h2>
              <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 30px; margin-top: 0;">
                You are receiving this email because you requested a password reset for your GitGuard AI account. Use the verification code below to complete the process.
              </p>
            </td>
          </tr>
          <!-- OTP Code Container -->
          <tr>
            <td align="center">
              <div style="display: inline-block; background-color: #0f102d; border: 1px solid #1e1b4b; border-radius: 12px; padding: 20px 40px; text-align: center;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #22d3ee; letter-spacing: 8px; display: block; margin-bottom: 4px; padding-left: 8px;">${otp}</span>
                <span style="font-size: 11px; text-transform: uppercase; color: #6366f1; font-weight: 600; letter-spacing: 2px;">Verification Code</span>
              </div>
            </td>
          </tr>
          <!-- Expiry Notice -->
          <tr>
            <td align="center" style="padding-top: 30px;">
              <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0; max-width: 320px;">
                This code will expire in <strong style="color: #a78bfa;">10 minutes</strong>. If you did not request this, please secure your account credentials immediately.
              </p>
            </td>
          </tr>
          
          <!-- Dynamic Security Audit Details -->
          <tr>
            <td style="padding-top: 30px;">
              <div style="background-color: #0d0e25; border: 1px dashed #1e1b4b; border-radius: 8px; padding: 16px; text-align: left;">
                <span style="display: block; font-size: 11px; text-transform: uppercase; color: #a78bfa; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px;">🛡️ Security Audit Log</span>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="font-size: 11px; color: #64748b; padding: 3px 0; font-family: 'Inter', sans-serif;"><strong>Request Time:</strong></td>
                    <td align="right" style="font-size: 11px; color: #94a3b8; padding: 3px 0; font-family: 'Inter', sans-serif;">${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="font-size: 11px; color: #64748b; padding: 3px 0; font-family: 'Inter', sans-serif;"><strong>IP Address:</strong></td>
                    <td align="right" style="font-size: 11px; color: #94a3b8; padding: 3px 0; font-family: 'Courier New', Courier, monospace;"><code>${formattedIp}</code></td>
                  </tr>
                  <tr>
                    <td style="font-size: 11px; color: #64748b; padding: 3px 0; font-family: 'Inter', sans-serif;"><strong>Device/Client:</strong></td>
                    <td align="right" style="font-size: 11px; color: #94a3b8; padding: 3px 0; font-family: 'Inter', sans-serif;">${formattedDevice}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Support Footer -->
          <tr>
            <td style="padding-top: 40px; text-align: center;">
              <div style="height: 1px; background-color: #11132e; margin-bottom: 20px;"></div>
              <p style="font-size: 11px; color: #475569; margin: 0;">
                GitGuard AI Sentinel Platform • Automated Code Review Security
              </p>
              <p style="font-size: 11px; color: #475569; margin: 5px 0 0 0;">
                Need help? Contact support or reply to this email.
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

/**
 * Sends a password reset OTP email to the user.
 */
export async function sendOtpEmail(
  toEmail: string,
  username: string,
  otp: string,
  metadata?: EmailMetadata
): Promise<string | null> {
  try {
    const client = await getTransporter();
    const mailOptions = {
      from: env.SMTP_FROM,
      to: toEmail,
      subject: '🔑 GitGuard AI – Reset Your Password',
      text: `Hello ${username},\n\nYour verification code to reset your GitGuard AI password is:\n\nOTP: ${otp}\n\nThis code will expire in 10 minutes. Do NOT share it with anyone.\n\nBest regards,\nGitGuard AI Team`,
      html: getOtpEmailHtml(otp, metadata),
    };

    const info = await client.sendMail(mailOptions);
    logger.info({ messageId: info.messageId, to: toEmail }, 'Password reset OTP email sent successfully');

    // Retrieve and return Ethereal test message preview URL if available
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info({ previewUrl }, 'Ethereal Test Email URL');
      return previewUrl;
    }
  } catch (error) {
    logger.error({ error, to: toEmail }, 'Error sending password reset OTP email');
    throw new Error('Failed to send verification email. Please try again later.');
  }
  return null;
}

