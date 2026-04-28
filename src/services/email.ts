import { Resend } from 'resend';

/**
 * Email service for sending transactional emails via Resend
 * Public key is safe to use on client and server
 * For server-side operations, use the secret key from environment
 */

const resendKey = import.meta.env.VITE_RESEND_API_KEY || '';

export const sendPasswordResetEmail = async (
  email: string,
  userName: string,
  resetLink: string
) => {
  try {
    if (!resendKey) {
      console.warn('Resend API key not configured. Email not sent.');
      return { success: false, error: 'Email service not configured' };
    }

    const resend = new Resend(resendKey);

    const result = await resend.emails.send({
      from: 'noreply@lumatha.com',
      to: email,
      subject: 'Reset Your Lumatha Password',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%); color: white; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; color: #fff; font-size: 28px;">Password Reset</h1>
          </div>

          <div style="margin-bottom: 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Hi ${userName},</p>
            <p style="margin: 0 0 20px 0; color: #94a3b8; line-height: 1.6;">
              We received a request to reset the password for your Lumatha account. 
              Click the button below to create a new password.
            </p>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #3B82F6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>

          <div style="margin: 40px 0; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 13px;">
              Or copy and paste this link in your browser:
            </p>
            <p style="margin: 0; word-break: break-all; color: #3B82F6; font-size: 12px;">
              ${resetLink}
            </p>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
            <p style="margin: 10px 0 0 0; color: #64748b; font-size: 11px;">
              Lumatha Inc. | All rights reserved
            </p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      console.error('Resend email error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { 
      success: true, 
      messageId: result.data?.id,
      message: 'Password reset email sent successfully' 
    };
  } catch (error: any) {
    console.error('Email service error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
};

export const sendVerificationEmail = async (
  email: string,
  verificationLink: string
) => {
  try {
    if (!resendKey) {
      console.warn('Resend API key not configured. Email not sent.');
      return { success: false, error: 'Email service not configured' };
    }

    const resend = new Resend(resendKey);

    const result = await resend.emails.send({
      from: 'noreply@lumatha.com',
      to: email,
      subject: 'Verify Your Lumatha Account',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%); color: white; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; color: #fff; font-size: 28px;">Verify Your Email</h1>
          </div>

          <div style="margin-bottom: 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Welcome to Lumatha!</p>
            <p style="margin: 0 0 20px 0; color: #94a3b8; line-height: 1.6;">
              Please verify your email address to complete your account setup.
            </p>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${verificationLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #3B82F6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Verify Email
            </a>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
              This link expires in 24 hours. If you didn't create this account, please ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      console.error('Resend email error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { 
      success: true, 
      messageId: result.data?.id,
      message: 'Verification email sent successfully' 
    };
  } catch (error: any) {
    console.error('Email service error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
};

export const sendWelcomeEmail = async (email: string, userName: string) => {
  try {
    if (!resendKey) {
      console.warn('Resend API key not configured. Email not sent.');
      return { success: false, error: 'Email service not configured' };
    }

    const resend = new Resend(resendKey);

    const result = await resend.emails.send({
      from: 'noreply@lumatha.com',
      to: email,
      subject: 'Welcome to Lumatha!',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%); color: white; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; color: #fff; font-size: 28px;">Welcome to Lumatha!</h1>
            <p style="margin: 10px 0 0 0; color: #7C3AED; font-size: 14px;">A Universe Without Pressure</p>
          </div>

          <div style="margin-bottom: 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Hi ${userName},</p>
            <p style="margin: 0 0 20px 0; color: #94a3b8; line-height: 1.6;">
              Your account is ready! Start exploring, sharing stories, and connecting with people in your community.
            </p>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <a href="https://lumatha.com" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #3B82F6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Go to Lumatha
            </a>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
              Need help? Visit our support center or reply to this email.
            </p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      console.error('Resend email error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { 
      success: true, 
      messageId: result.data?.id,
      message: 'Welcome email sent successfully' 
    };
  } catch (error: any) {
    console.error('Email service error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
};
