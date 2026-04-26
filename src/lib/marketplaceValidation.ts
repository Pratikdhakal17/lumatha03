import { supabase } from '@/integrations/supabase/client';

/**
 * Professional marketplace seller validation service
 * Handles profile checks, verification status, and posting eligibility
 */

export interface MarketplaceValidation {
  isValid: boolean;
  reason: string;
  requiresSetup: boolean;
  requiresPhone: boolean;
  setupUrl?: string;
  canPost: boolean;
  isPhoneVerified: boolean;
  profileComplete: boolean;
  allowed?: boolean;
  message?: string;
}

/**
 * Comprehensive marketplace profile validation
 * Used before allowing users to create listings
 */
export const validateMarketplaceAccess = async (
  userId: string | undefined,
): Promise<MarketplaceValidation> => {
  // Not logged in
  if (!userId) {
    return {
      isValid: false,
      reason: 'Please create an account to access marketplace',
      requiresSetup: true,
      requiresPhone: false,
      setupUrl: '/auth',
      canPost: false,
      isPhoneVerified: false,
      profileComplete: false,
      allowed: false,
      message: 'Please create an account to access marketplace',
    };
  }

  try {
    // Fetch marketplace profile
    const { data: mpProfile, error } = await supabase
      .from('marketplace_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return {
        isValid: false,
        reason: 'Could not load marketplace profile',
        requiresSetup: false,
        requiresPhone: false,
        canPost: false,
        isPhoneVerified: false,
        profileComplete: false,
        allowed: false,
        message: 'Could not load marketplace profile',
      };
    }

    // No marketplace profile exists
    if (!mpProfile) {
      return {
        isValid: false,
        reason: 'You need to create a marketplace profile first',
        requiresSetup: true,
        requiresPhone: false,
        setupUrl: '/marketplace/edit-profile?setup=1',
        canPost: false,
        isPhoneVerified: false,
        profileComplete: false,
        allowed: false,
        message: 'You need to create a marketplace profile first',
      };
    }

    // Check if profile is complete (minimum requirements)
    const profileComplete = Boolean(
      mpProfile.username?.trim() &&
      mpProfile.phone?.trim() &&
      mpProfile.location?.trim()
    );

    if (!profileComplete) {
      return {
        isValid: false,
        reason: 'Complete your marketplace profile (name, phone, location)',
        requiresSetup: true,
        requiresPhone: true,
        setupUrl: '/marketplace/edit-profile?setup=1',
        canPost: false,
        isPhoneVerified: false,
        profileComplete: false,
        allowed: false,
        message: 'Complete your marketplace profile (name, phone, location)',
      };
    }

    // Profile is complete. Check phone verification
    const isPhoneVerified = Boolean(mpProfile.is_phone_verified);

    return {
      isValid: true,
      reason: isPhoneVerified
        ? 'Your profile is verified and ready!'
        : 'Profile complete. Verify phone for trusted badge.',
      requiresSetup: false,
      requiresPhone: !isPhoneVerified,
      canPost: true, // Can post even without phone verification, but will show as unverified
      isPhoneVerified,
      profileComplete: true,
      allowed: true,
      message: isPhoneVerified
        ? 'Your profile is verified and ready!'
        : 'Profile complete. Verify phone for trusted badge.',
    };
  } catch (err) {
    console.error('Marketplace validation error:', err);
    return {
      isValid: false,
      reason: 'Error validating marketplace access',
      requiresSetup: false,
      requiresPhone: false,
      canPost: false,
      isPhoneVerified: false,
      profileComplete: false,
      allowed: false,
      message: 'Error validating marketplace access',
    };
  }
};

/**
 * Get marketplace profile summary for display
 */
export const getMarketplaceProfileSummary = async (
  userId: string,
): Promise<{
  displayName: string;
  isVerified: boolean;
  listingsCount: number;
} | null> => {
  try {
    const [mpProfile, listingsResult] = await Promise.all([
      supabase
        .from('marketplace_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('marketplace_listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active'),
    ]);

    if (!mpProfile.data) return null;

    return {
      displayName: mpProfile.data.username || 'Seller',
      isVerified: Boolean(mpProfile.data.is_phone_verified),
      listingsCount: listingsResult.count || 0,
    };
  } catch (err) {
    console.error('Error getting marketplace summary:', err);
    return null;
  }
};

/**
 * Prefetch marketplace profile to reduce latency
 * Call this on app initialization if user is logged in
 */
export const prefetchMarketplaceProfile = async (
  userId: string,
): Promise<void> => {
  try {
    // This will be cached by Supabase client
    await supabase
      .from('marketplace_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
  } catch (err) {
    // Silently fail, just for prefetching
    console.error('Prefetch error:', err);
  }
};
