const nodemailer = require("nodemailer");

// Default transporter using environment variables
let defaultTransporter = null;

const initializeDefaultTransporter = async () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("⚠️  Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env variables.");
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });

  // Verify connection
  try {
    await transporter.verify();
    console.log("✅ Email service connected successfully");
    return { transporter, from: smtpFrom };
  } catch (error) {
    console.error("❌ Email service connection failed:", error.message);
    return null;
  }
};

const sendEmailVerification = async ({ email, name, verificationToken }) => {
  if (!defaultTransporter) {
    console.warn("Email service not initialized");
    return { success: false, reason: "email-service-not-configured" };
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const verificationUrl = `${clientUrl}/auth/verify-email?token=${verificationToken}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #030711;">Verify your InnoDeploy email</h2>
      <p>Hi ${name},</p>
      <p>Thank you for creating an account! Please verify your email address by clicking the button below:</p>
      
      <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #06b6d4; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold;">
        Verify Email
      </a>
      
      <p>Or copy this link: <a href="${verificationUrl}">${verificationUrl}</a></p>
      
      <p>This link will expire in 24 hours.</p>
      
      <p>If you didn't create this account, you can ignore this email.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
      <p style="color: #666; font-size: 12px;">InnoDeploy © 2026. All rights reserved.</p>
    </div>
  `;

  const textContent = `
Verify your InnoDeploy email

Hi ${name},

Thank you for creating an account! Please verify your email address by visiting this link:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create this account, you can ignore this email.

InnoDeploy © 2026. All rights reserved.
  `.trim();

  try {
    await defaultTransporter.transporter.sendMail({
      from: defaultTransporter.from,
      to: email,
      subject: "Verify your InnoDeploy email",
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send verification email:", error.message);
    return { success: false, reason: error.message };
  }
};

const sendPasswordResetEmail = async ({ email, name, resetToken }) => {
  if (!defaultTransporter) {
    console.warn("Email service not initialized");
    return { success: false, reason: "email-service-not-configured" };
  }

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const resetUrl = `${clientUrl}/forgot-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #030711;">Reset your InnoDeploy password</h2>
      <p>Hi ${name},</p>
      <p>You requested to reset your password. Click the button below to set a new password:</p>
      
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #06b6d4; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold;">
        Reset Password
      </a>
      
      <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
      
      <p>This link will expire in 1 hour.</p>
      
      <p>If you didn't request this, you can ignore this email.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
      <p style="color: #666; font-size: 12px;">InnoDeploy © 2026. All rights reserved.</p>
    </div>
  `;

  const textContent = `
Reset your InnoDeploy password

Hi ${name},

You requested to reset your password. Visit this link to set a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can ignore this email.

InnoDeploy © 2026. All rights reserved.
  `.trim();

  try {
    await defaultTransporter.transporter.sendMail({
      from: defaultTransporter.from,
      to: email,
      subject: "Reset your InnoDeploy password",
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send password reset email:", error.message);
    return { success: false, reason: error.message };
  }
};

module.exports = {
  initializeDefaultTransporter,
  sendEmailVerification,
  sendPasswordResetEmail,
};
