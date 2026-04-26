import { supabase } from '@/integrations/supabase/client';

/**
 * Professional phone OTP verification service using Supabase Auth
 * Handles real SMS OTP delivery and verification
 */

interface SendOtpResponse {
  success: boolean;
  message: string;
  sessionId?: string;
}

interface VerifyOtpResponse {
  success: boolean;
  message: string;
  verified: boolean;
}

/**
 * Send OTP to phone number via SMS (Supabase Auth)
 * User will receive SMS with 6-digit code
 */
export const sendPhoneOtp = async (phone: string): Promise<SendOtpResponse> => {
  try {
    const normalizedPhone = phone.trim().replace(/[^\d+]/g, '');
    
    if (!normalizedPhone || normalizedPhone.length < 7) {
      return { success: false, message: 'Invalid phone number format' };
    }

    // Supabase Auth will send SMS to this phone
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    });

    if (error) {
      console.error('OTP send error:', error);
      return { success: false, message: error.message || 'Failed to send OTP' };
    }

    return {
      success: true,
      message: 'OTP sent to your phone. Check SMS for 6-digit code.',
    };
  } catch (err) {
    console.error('Phone OTP service error:', err);
    return { success: false, message: 'Error sending OTP' };
  }
};

/**
 * Verify OTP code from user input
 * Returns verified session if successful
 */
export const verifyPhoneOtp = async (
  phone: string,
  code: string,
): Promise<VerifyOtpResponse> => {
  try {
    const normalizedPhone = phone.trim().replace(/[^\d+]/g, '');
    const sanitizedCode = code.trim().replace(/\D/g, '').slice(0, 6);

    if (!sanitizedCode || sanitizedCode.length !== 6) {
      return { success: false, message: 'Invalid OTP format (must be 6 digits)', verified: false };
    }

    // Verify the OTP token
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: sanitizedCode,
      type: 'sms',
    });

    if (error) {
      console.error('OTP verification error:', error);
      return { success: false, message: error.message || 'Invalid OTP code', verified: false };
    }

    if (data?.session) {
      return {
        success: true,
        message: 'Phone verification successful!',
        verified: true,
      };
    }

    return { success: false, message: 'Verification failed', verified: false };
  } catch (err) {
    console.error('Phone OTP verification error:', err);
    return { success: false, message: 'Error verifying OTP', verified: false };
  }
};

/**
 * Mark phone as verified in marketplace_profiles
 * Called after successful OTP verification
 */
export const markPhoneVerified = async (
  userId: string,
  phone: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('marketplace_profiles')
      .update({
        is_phone_verified: true,
      })
      .eq('user_id', userId)
      .eq('phone', phone);

    if (error) {
      return { success: false, message: 'Failed to save verification status' };
    }

    return { success: true, message: 'Phone verified successfully' };
  } catch (err) {
    console.error('Error marking phone verified:', err);
    return { success: false, message: 'Error saving verification' };
  }
};

/**
 * Get last verified phone for a user
 */
export const getVerifiedPhone = async (
  userId: string,
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('marketplace_profiles')
      .select('phone')
      .eq('user_id', userId)
      .eq('is_phone_verified', true)
      .maybeSingle();

    if (error || !data) return null;
    return data.phone || null;
  } catch (err) {
    console.error('Error getting verified phone:', err);
    return null;
  }
};
