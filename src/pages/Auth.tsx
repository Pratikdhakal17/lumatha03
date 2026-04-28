import { useState, useMemo, useRef, useEffect } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollWheelColumn } from '@/components/ScrollWheelColumn';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, UserPlus, Check, X, ArrowRight, ArrowLeft, Camera, User, MapPin, Loader2, AtSign } from 'lucide-react';
import { validateLoginForm, validateSignupForm, getValidationErrors } from '@/lib/authValidation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { detectLocation } from '@/lib/geolocation';
import logo from '@/assets/lumatha-logo.png';

// Generate years for date of birth (ages 13-100)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 88 }, (_, i) => currentYear - 13 - i);
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// Floating dots CSS
const floatingDotsStyle = `
@keyframes auth-float {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 0.12; }
  90% { opacity: 0.12; }
  100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
}
@keyframes auth-card-in {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes auth-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes auth-pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(124, 58, 237, 0.3), 0 0 40px rgba(124, 58, 237, 0.1); }
  50% { box-shadow: 0 0 30px rgba(124, 58, 237, 0.5), 0 0 60px rgba(124, 58, 237, 0.2); }
}
`;

const dots = Array.from({ length: 20 }, (_, i) => ({
  left: `${Math.random() * 100}%`,
  size: 2 + Math.random() * 3,
  delay: Math.random() * 8,
  duration: 10 + Math.random() * 12,
}));

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: confirm account, 3: code, 4: password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotUserData, setForgotUserData] = useState<any>(null);
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotCodeSent, setForgotCodeSent] = useState(false);
  const [codeSentEmail, setCodeSentEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [codeCountdown, setCodeCountdown] = useState(0);
  
  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [detectedCity, setDetectedCity] = useState('');
  const [detectedCountry, setDetectedCountry] = useState('');
  const [detectedTimezone, setDetectedTimezone] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showCitySearch, setShowCitySearch] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [selectedAvatarGradient, setSelectedAvatarGradient] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [signupUserId, setSignupUserId] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

  useEffect(() => {
    if (!username.trim() || username.length < 3) { setUsernameAvailable(null); return; }
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const { data } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase().trim()).maybeSingle();
      setUsernameAvailable(!data);
      setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    if (step === 3 && !locationDetected) handleDetectLocation();
  }, [step]);

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const loc = await detectLocation();
      setDetectedCity(loc.city); setDetectedCountry(loc.country); setDetectedTimezone(loc.timezone);
      setLocationDetected(true);
    } catch { toast.error('Could not detect location'); }
    finally { setDetectingLocation(false); }
  };

  const passwordChecks = useMemo(() => ({
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }), [password]);

  const isPasswordValid = passwordChecks.minLength && passwordChecks.hasNumber && passwordChecks.hasSpecial;

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePic(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const calculateAge = () => {
    if (!birthYear || !birthMonth || !birthDay) return null;
    const today = new Date();
    const birthDate = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getAgeGroup = () => {
    const age = calculateAge();
    if (!age) return '18-25';
    if (age < 18) return '13-17'; if (age <= 25) return '18-25'; if (age <= 35) return '26-35';
    if (age <= 45) return '36-45'; if (age <= 55) return '46-55'; return '56+';
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!firstName.trim()) { toast.error('Please enter your first name'); return; }
      if (!username.trim() || username.length < 3) { toast.error('Username must be at least 3 characters'); return; }
      if (usernameAvailable === false) { toast.error('Username is taken'); return; }
      if (!gender) { toast.error('Please select how you identify'); return; }
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => setStep(step - 1);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setFormErrors({});
    const result = validateLoginForm({ email, password });
    if (!result.success) { const errors = getValidationErrors(result); setFormErrors(errors); toast.error(Object.values(errors)[0]); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      toast.success('Welcome back to Lumatha!'); navigate('/');
    } catch (error: any) { toast.error(error.message || 'Authentication failed'); }
    finally { setLoading(false); }
  };

  // Forgot password handlers
  const handleForgotPasswordStep1 = async () => {
    if (!forgotEmail.trim()) { setForgotError('Please enter your email'); return; }
    setForgotLoading(true); setForgotError('');
    try {
      const { data, error } = await supabase.from('profiles').select('id, name, avatar_url').eq('email', forgotEmail.trim().toLowerCase()).maybeSingle();
      if (error || !data) { setForgotError('Email not found in our system'); setForgotLoading(false); return; }
      setForgotUserData(data);
      setForgotStep(2);
    } catch (error: any) { setForgotError(error.message || 'Error verifying email'); }
    finally { setForgotLoading(false); }
  };

  const handleForgotPasswordConfirm = (confirmed: boolean) => {
    if (!confirmed) { setShowForgotPassword(false); setForgotStep(1); setForgotEmail(''); setForgotUserData(null); return; }
    sendResetCode();
  };

  const sendResetCode = async () => {
    setForgotLoading(true); setForgotError(''); setForgotSuccess('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), { redirectTo: `${window.location.origin}/auth?reset=true` });
      if (error) throw error;
      setCodeSentEmail(forgotEmail);
      setForgotCodeSent(true);
      setForgotStep(3);
      setCodeCountdown(120);
      toast.success('Reset code sent to your email');
    } catch (error: any) { setForgotError(error.message || 'Failed to send reset code'); }
    finally { setForgotLoading(false); }
  };

  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setTimeout(() => setCodeCountdown(codeCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeCountdown]);

  const handleVerifyCode = async () => {
    if (!forgotCode.trim()) { setForgotError('Please enter the code from your email'); return; }
    setForgotStep(4);
    setForgotSuccess('Code verified! Now create your new password.');
  };

  const handleResetPassword = async () => {
    if (!forgotPassword || !forgotConfirmPassword) { setForgotError('Please enter both passwords'); return; }
    if (forgotPassword !== forgotConfirmPassword) { setForgotError('Passwords do not match'); return; }
    if (forgotPassword.length < 8) { setForgotError('Password must be at least 8 characters'); return; }
    
    setForgotLoading(true); setForgotError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: forgotPassword });
      if (error) throw error;
      setForgotSuccess('Password reset successfully! Redirecting to login...');
      toast.success('Password updated successfully');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotStep(1);
        setForgotEmail('');
        setForgotCode('');
        setForgotPassword('');
        setForgotConfirmPassword('');
        setForgotUserData(null);
        setForgotCodeSent(false);
        setIsLogin(true);
      }, 2000);
    } catch (error: any) { setForgotError(error.message || 'Failed to reset password'); }
    finally { setForgotLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setFormErrors({});
    const country = detectedCountry || 'Unknown';
    const ageGroup = getAgeGroup();
    const result = validateSignupForm({ username: displayName, email, password, country, ageGroup, deviceType: 'mobile' });
    if (!result.success) { const errors = getValidationErrors(result); setFormErrors(errors); toast.error(Object.values(errors)[0]); return; }
    setLoading(true);
    try {
      const sanitizedName = displayName.replace(/[<>'"`;]/g, '').slice(0, 50);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { name: sanitizedName, country, age_group: ageGroup,
            birth_date: birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}` : null }
        }
      });
      if (error) throw error;
      if (data.user) {
        let avatarUrl = null;
        if (profilePicFile) {
          const fileExt = profilePicFile.name.split('.').pop();
          const fileName = `${data.user.id}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, profilePicFile, { upsert: true });
          if (!uploadError) { const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName); avatarUrl = urlData.publicUrl; }
        }
        await supabase.from('profiles').upsert({
          id: data.user.id, name: sanitizedName, first_name: firstName.trim(), last_name: lastName.trim(),
          username: username.toLowerCase().trim(), country, detected_city: detectedCity, timezone: detectedTimezone,
          location: detectedCity ? `${detectedCity}, ${country}` : country,
          age_group: ageGroup,
          avatar_url: avatarUrl,
          gender: gender || null
        } as any);
      }
      toast.success('Account created!');
      setSignupUserId(data.user?.id || '');
      setShowWelcome(true);
    } catch (error: any) {
      if (error.message?.includes('already registered')) toast.error('This email is already registered. Please login instead.');
      else toast.error(error.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  // --- Input style constants for navy dark background ---
  const inputClass = "h-[52px] rounded-xl text-[15px] text-white placeholder:text-slate-400 border focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200" +
    " bg-[#1e293b]/60 border-white/10 focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]";
  const labelClass = "text-[13px] font-medium tracking-wide" + " text-slate-300";

  const renderSignupStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5 animate-fade-in">
            {/* First Name */}
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className={labelClass}>First Name</Label>
              <Input id="firstName" placeholder="Your first name" value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass} autoFocus />
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className={labelClass}>Last Name (optional)</Label>
              <Input id="lastName" placeholder="Your last name" value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass} />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className={labelClass}>Username</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] select-none" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>@</span>
                <Input id="username" placeholder="yourname" value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  className={inputClass + " pl-9"} />
                {username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername ? <Loader2 className="w-4 h-4 animate-spin text-[#94A3B8]" />
                      : usernameAvailable ? <Check className="w-4 h-4 text-[#10B981]" />
                      : usernameAvailable === false ? <X className="w-4 h-4 text-red-400" /> : null}
                  </div>
                )}
              </div>
              {username.length >= 3 && usernameAvailable === false && (
                <p className="text-xs text-red-400 mt-1">Username taken</p>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className={labelClass}>I identify as</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'male', label: '👨 Male' },
                  { value: 'female', label: '👩 Female' },
                  { value: 'undisclosed', label: '🤝 Other' },
                ].map((g) => (
                  <button key={g.value} type="button"
                    onClick={() => setGender(g.value)}
                    className="h-11 rounded-xl text-[13px] font-medium transition-all duration-200 border"
                    style={{
                      background: gender === g.value ? 'linear-gradient(135deg, #7C3AED, #3B82F6)' : '#1e293b',
                      borderColor: gender === g.value ? 'transparent' : '#374151',
                      color: gender === g.value ? '#fff' : '#94A3B8',
                      transform: gender === g.value ? 'scale(1.03)' : 'scale(1)',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 2: {
        const age = calculateAge();
        const isUnder13 = age !== null && age < 13;

        const dayItems = DAYS.map(d => ({ value: String(d), display: String(d) }));
        const monthItems = MONTHS.map((m, i) => ({ value: String(i + 1), display: m }));
        const yearItems = YEARS.map(y => ({ value: String(y), display: String(y) }));

        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="text-[22px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>When were you born?</h2>
              <p className="text-[13px] mt-1" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>We use this to personalize your experience</p>
            </div>

            <div className="flex gap-1 overflow-hidden" style={{
              background: '#1e293b',
              borderRadius: 16,
              padding: 8,
            }}>
              <ScrollWheelColumn items={dayItems} value={birthDay} onChange={setBirthDay} />
              <div className="w-px" style={{ background: '#374151' }} />
              <ScrollWheelColumn items={monthItems} value={birthMonth} onChange={setBirthMonth} />
              <div className="w-px" style={{ background: '#374151' }} />
              <ScrollWheelColumn items={yearItems} value={birthYear} onChange={setBirthYear} />
            </div>

            {isUnder13 && (
              <p className="text-center text-sm text-red-400 font-medium">You must be 13+ to use Lumatha</p>
            )}
          </div>
        );
      }
      case 3:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="text-[22px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Where are you based?</h2>
              <p className="text-[13px] mt-1" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>For local content and nearby people</p>
            </div>

            <div className="flex flex-col items-center gap-4 py-4">
              {/* Pulsing map pin */}
              <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(124, 58, 237, 0.1)',
                  animation: 'auth-pulse-glow 2s ease-in-out infinite',
                }}>
                <span className="text-[60px] leading-none select-none">📍</span>
              </div>

              {detectingLocation ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7C3AED' }} />
                  <p className="text-[13px]" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Detecting your location...</p>
                </div>
              ) : locationDetected ? (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[22px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{detectedCity || 'Unknown City'}</p>
                  <p className="text-[14px]" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>{detectedCountry || 'Unknown Country'}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[16px] font-medium text-white">Location not detected</p>
                  <p className="text-[13px]" style={{ color: '#94A3B8' }}>Search your city below</p>
                </div>
              )}

              {/* City search input */}
              {showCitySearch && (
                <div className="w-full space-y-2 animate-fade-in">
                  <Input
                    placeholder="Search your city..."
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    className={inputClass}
                    autoFocus
                  />
                  {manualCity.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetectedCity(manualCity.trim());
                        setLocationDetected(true);
                        setShowCitySearch(false);
                      }}
                      className="w-full h-11 rounded-xl text-white text-[14px] font-medium transition-all duration-200"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', fontFamily: "'Inter', sans-serif" }}>
                      Set as "{manualCity.trim()}"
                    </button>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {!showCitySearch && (
                <div className="flex gap-3 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => setShowCitySearch(true)}
                    className="flex-1 h-[48px] rounded-xl text-white text-[15px] transition-all duration-200 hover:border-[#7C3AED]"
                    style={{ background: 'transparent', border: '1px solid #374151', fontFamily: "'Inter', sans-serif" }}>
                    Change Location
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNextStep()}
                    disabled={!locationDetected && !detectedCity}
                    className="flex-1 h-[48px] rounded-xl text-white text-[15px] font-bold transition-all duration-200 hover:opacity-[0.88] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', fontFamily: "'Inter', sans-serif" }}>
                    Confirm Location
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      case 4: {
        const initials = `${firstName.charAt(0)}${lastName.charAt(0) || ''}`.toUpperCase() || '?';
        const avatarGradients = [
          { id: 'purple-blue', gradient: 'linear-gradient(135deg, #7C3AED, #3B82F6)' },
          { id: 'teal-green', gradient: 'linear-gradient(135deg, #0F766E, #065F46)' },
          { id: 'amber-orange', gradient: 'linear-gradient(135deg, #B45309, #92400E)' },
          { id: 'pink-rose', gradient: 'linear-gradient(135deg, #BE185D, #9D174D)' },
        ];

        return (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center mb-2">
              <h2 className="text-[22px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Add your photo</h2>
              <p className="text-[13px] mt-1" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Help others recognize you</p>
            </div>

            <div className="flex flex-col items-center gap-3">
              {/* Upload circle */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-[120px] h-[120px] rounded-full flex items-center justify-center cursor-pointer group transition-all duration-200 hover:border-[#7C3AED]"
                style={{
                  background: profilePic ? 'transparent' : selectedAvatarGradient || '#1e293b',
                  border: profilePic || selectedAvatarGradient ? 'none' : '2px dashed #374151',
                  overflow: 'hidden',
                }}
              >
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover rounded-full" />
                ) : selectedAvatarGradient ? (
                  <span className="text-white font-bold text-[28px] select-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{initials}</span>
                ) : (
                  <Camera className="w-8 h-8" style={{ color: '#94A3B8' }} />
                )}
                {/* Camera overlay for changing */}
                {(profilePic || selectedAvatarGradient) && (
                  <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#7C3AED' }}>
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { handleProfilePicChange(e); setSelectedAvatarGradient(null); }} className="hidden" />

              {/* OR divider */}
              <p className="text-[13px]" style={{ color: '#4B5563', fontFamily: "'Inter', sans-serif" }}>OR</p>

              {/* Generate avatar button */}
              {!showAvatarOptions ? (
                <button
                  type="button"
                  onClick={() => setShowAvatarOptions(true)}
                  className="px-6 py-3 rounded-xl text-[15px] transition-all duration-200 hover:bg-[#7C3AED]/10"
                  style={{ border: '1px solid #7C3AED', color: '#7C3AED', fontFamily: "'Inter', sans-serif" }}>
                  ✨ Generate Avatar
                </button>
              ) : (
                <div className="grid grid-cols-4 gap-3 animate-fade-in">
                  {avatarGradients.map((ag) => (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => { setSelectedAvatarGradient(ag.gradient); setProfilePic(null); setProfilePicFile(null); }}
                      className="w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-200"
                      style={{
                        background: ag.gradient,
                        boxShadow: selectedAvatarGradient === ag.gradient ? '0 0 0 3px #7C3AED, 0 0 0 5px rgba(124,58,237,0.3)' : 'none',
                        transform: selectedAvatarGradient === ag.gradient ? 'scale(1.05)' : 'scale(1)',
                      }}>
                      <span className="text-white font-bold text-[24px] select-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{initials}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Skip link */}
              <button
                type="button"
                onClick={() => handleNextStep()}
                className="text-[13px] mt-1 transition-colors hover:text-white"
                style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                Skip for now
              </button>
            </div>
          </div>
        );
      }
      case 5: {
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const strengthScore = [passwordChecks.minLength, passwordChecks.hasNumber, passwordChecks.hasSpecial, hasUppercase && hasLowercase, password.length >= 12].filter(Boolean).length;
        const strengthConfig = strengthScore <= 1
          ? { width: '25%', color: '#EF4444', label: 'Too short' }
          : strengthScore === 2
          ? { width: '50%', color: '#F97316', label: 'Weak' }
          : strengthScore <= 3
          ? { width: '75%', color: '#EAB308', label: 'Good' }
          : { width: '100%', color: '#10B981', label: 'Strong ✓' };
        const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
        const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
        const step5Valid = isPasswordValid && passwordsMatch && email.trim().length > 0;

        return (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="text-[22px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Almost there!</h2>
              <p className="text-[13px] mt-1" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Set your email and password</p>
            </div>
            <div className="space-y-3">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className={labelClass}>Email</Label>
                <Input id="email" type="email" placeholder="you@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" required />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className={labelClass}>Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" value={password}
                    onChange={(e) => setPassword(e.target.value)} className={inputClass + " pr-12"} autoComplete="new-password" required />
                  <button type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: '#94A3B8' }}
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                        <div className="h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: strengthConfig.width, background: strengthConfig.color }} />
                      </div>
                      <span className="text-[12px] ml-3 min-w-[60px] text-right" style={{ color: strengthConfig.color, fontFamily: "'Inter', sans-serif" }}>
                        {strengthConfig.label}
                      </span>
                    </div>

                    {/* Requirements */}
                    <div className="space-y-1">
                      {[
                        { check: passwordChecks.minLength, label: 'At least 8 characters' },
                        { check: passwordChecks.hasNumber, label: 'Contains a number' },
                        { check: passwordChecks.hasSpecial, label: 'Contains a special character' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 transition-all duration-200">
                          {item.check
                            ? <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10B981' }} />
                            : <X className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#4B5563' }} />}
                          <span className="text-[12px] transition-colors duration-200"
                            style={{ color: item.check ? '#10B981' : '#4B5563', fontFamily: "'Inter', sans-serif" }}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className={labelClass}>Confirm Password</Label>
                <div className="relative">
                  <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Confirm your password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass + " pr-12"} autoComplete="new-password" required />
                  {passwordsMatch && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#10B981' }} />}
                  {passwordsMismatch && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />}
                </div>
                {passwordsMismatch && (
                  <p className="text-[12px] text-red-400 mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>Passwords don't match</p>
                )}
              </div>
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  if (showWelcome) {
    return <WelcomeScreen userId={signupUserId} firstName={firstName} city={detectedCity} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden relative bg-[#0B0D1F]">
      {/* Injected keyframes */}
      <style>{floatingDotsStyle}</style>

      {/* Navy gradient orbs for dark background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(30,58,95,0.3) 0%, transparent 70%)' }} />
      </div>

      {/* Navy Card */}
      <div className={`w-full relative z-10 ${isLogin ? 'max-w-[420px]' : 'max-w-[440px]'}`}
        style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 40,
          boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 40px rgba(59,130,246,0.1)',
          animation: 'auth-card-in 0.5s 0.3s cubic-bezier(0.4,0,0.2,1) both',
        }}>

        {isLogin ? (
          <>
            {/* Logo with Ring */}
            <div className="mb-6 flex justify-center">
              <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-blue-400/30 blur-xl" />
                {/* White ring border */}
                <div className="absolute -inset-2 rounded-full border-2 border-white/40 bg-white/5 backdrop-blur-sm" />
                {/* Logo container */}
                <div className="relative rounded-full overflow-hidden bg-[#0B1120] shadow-2xl">
                  <img
                    src={logo}
                    alt="Lumatha"
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>
            </div>
            {/* Login heading */}
            <div className="text-center mb-6">
              <h2 className="text-[26px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Welcome Back</h2>
              <p className="text-[14px] mt-1" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Sign in to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className={labelClass}>Email</Label>
                <Input id="login-email" type="email" placeholder="you@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password" className={labelClass}>Password</Label>
                <div className="relative">
                  <Input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="Your password" value={password}
                    onChange={(e) => setPassword(e.target.value)} className={inputClass + " pr-12"} autoComplete="current-password" required />
                  <button type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                    style={{ color: '#94A3B8' }}
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Forgot password link - appears below password */}
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setForgotStep(1); setForgotError(''); setForgotSuccess(''); }}
                  className="text-[12px] text-blue-400 hover:text-blue-300 transition-colors mt-1.5"
                  style={{ fontFamily: "'Inter', sans-serif" }}>
                  Forgot password?
                </button>
              </div>

              {/* Sign In button */}
              <button type="submit" disabled={loading}
                className="w-full h-[52px] rounded-xl text-white font-bold text-[16px] flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-[0.88] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                  fontFamily: "'Inter', sans-serif",
                  animation: 'auth-fade-in 0.5s 0.5s cubic-bezier(0.4,0,0.2,1) both',
                }}>
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Signing in...</>
                  : <>Sign In <ArrowRight className="w-5 h-5" /></>}
              </button>

            </form>
          </>
        ) : (
          <>
            {/* Logo with Ring */}
            <div className="mb-6 flex justify-center">
              <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-blue-400/30 blur-xl" />
                {/* White ring border */}
                <div className="absolute -inset-2 rounded-full border-2 border-white/40 bg-white/5 backdrop-blur-sm" />
                {/* Logo container */}
                <div className="relative rounded-full overflow-hidden bg-[#0B1120] shadow-2xl">
                  <img
                    src={logo}
                    alt="Lumatha"
                    className="w-16 h-16 object-contain"
                  />
                </div>
              </div>
            </div>
            {/* Progress bar + heading */}
            <div className="mb-6">
              <div className="flex gap-1.5 mb-5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className="h-1 flex-1 rounded transition-all duration-500"
                    style={{
                      background: s < step ? '#10B981' : s === step ? 'linear-gradient(90deg, #7C3AED, #3B82F6)' : '#1e293b',
                    }} />
                ))}
              </div>
              <div className="text-center">
                <h2 className="text-[24px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create Account</h2>
                <p className="text-[13px] mt-1" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Step {step} of 5</p>
              </div>
            </div>

            <form onSubmit={step === 5 ? handleSignup : (e) => { e.preventDefault(); handleNextStep(); }}>
              {renderSignupStep()}
              <div className="flex gap-3 mt-6">
                {step > 1 && (
                  <button type="button" onClick={handlePrevStep}
                    className="flex-1 h-[52px] rounded-xl flex items-center justify-center gap-2 text-white text-[15px] transition-all duration-200"
                    style={{ border: '1px solid #374151', background: 'transparent' }}>
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}
                <button type="submit" disabled={loading || (step === 5 && (!isPasswordValid || !email.trim() || password !== confirmPassword || !confirmPassword)) || (step === 1 && (usernameAvailable === false || !firstName.trim() || !username.trim() || username.length < 3 || !gender)) || (step === 2 && (!birthDay || !birthMonth || !birthYear || (calculateAge() !== null && calculateAge()! < 13)))}
                  className={`h-[52px] rounded-xl text-white font-bold text-[16px] flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-[0.88] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 ${step > 1 ? 'flex-1' : 'w-full'}`}
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', fontFamily: "'Inter', sans-serif" }}>
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Creating...</>
                    : step === 5 ? <><UserPlus className="w-5 h-5" />Create Account</>
                    : <>Next <ArrowRight className="w-5 h-5" /></>}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Bottom toggle */}
        <div className="mt-6 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
          <button type="button" onClick={() => { setIsLogin(!isLogin); setStep(1); setFormErrors({}); }}
            className="text-[14px] transition-colors group text-slate-400 hover:text-slate-300">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span 
              className="font-semibold transition-all text-blue-400 hover:text-blue-300"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[420px] relative z-10"
            style={{
              background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: 40,
              boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 40px rgba(59,130,246,0.1)',
              animation: 'auth-card-in 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}>
            
            {/* Close button */}
            <button
              onClick={() => { setShowForgotPassword(false); setForgotStep(1); setForgotEmail(''); setForgotUserData(null); }}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>

            {/* Step 1: Email */}
            {forgotStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center mb-6">
                  <h3 className="text-[24px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Forgot Password?</h3>
                  <p className="text-[13px] mt-1" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Enter your email to reset</p>
                </div>
                
                <div className="space-y-1.5">
                  <Label className={labelClass}>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); setForgotError(''); }}
                    className={inputClass}
                    autoComplete="email"
                  />
                </div>

                {forgotError && <p className="text-[12px] text-red-400" style={{ fontFamily: "'Inter', sans-serif" }}>{forgotError}</p>}

                <button
                  type="button"
                  onClick={handleForgotPasswordStep1}
                  disabled={forgotLoading || !forgotEmail.trim()}
                  className="w-full h-[48px] rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-[0.88] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', fontFamily: "'Inter', sans-serif" }}>
                  {forgotLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}

            {/* Step 2: Confirm Account */}
            {forgotStep === 2 && forgotUserData && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center mb-6">
                  <h3 className="text-[20px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Is this your account?</h3>
                  <p className="text-[12px] mt-1" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Confirm to proceed with password reset</p>
                </div>

                <div className="flex flex-col items-center gap-3 py-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={forgotUserData.avatar_url || undefined} />
                    <AvatarFallback style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', color: 'white', fontSize: 24, fontWeight: 700 }}>
                      {forgotUserData.name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="text-[16px] font-bold text-white">{forgotUserData.name}</p>
                    <p className="text-[12px]" style={{ color: '#94A3B8' }}>{forgotEmail}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleForgotPasswordConfirm(false)}
                    className="flex-1 h-[48px] rounded-xl border text-white font-bold text-[14px] transition-all"
                    style={{ borderColor: '#374151', background: 'transparent', fontFamily: "'Inter', sans-serif" }}>
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => handleForgotPasswordConfirm(true)}
                    disabled={forgotLoading}
                    className="flex-1 h-[48px] rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-[0.88] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', fontFamily: "'Inter', sans-serif" }}>
                    {forgotLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <>Yes, it\'s me</>}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Verify Code */}
            {forgotStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center mb-6">
                  <h3 className="text-[20px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Enter Code</h3>
                  <p className="text-[12px] mt-1" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Check your email for the reset code</p>
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>Reset Code</Label>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={forgotCode}
                    onChange={(e) => { setForgotCode(e.target.value); setForgotError(''); }}
                    maxLength={6}
                    className={inputClass}
                  />
                </div>

                {forgotError && <p className="text-[12px] text-red-400" style={{ fontFamily: "'Inter', sans-serif" }}>{forgotError}</p>}

                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={forgotLoading || !forgotCode.trim()}
                  className="w-full h-[48px] rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-[0.88] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', fontFamily: "'Inter', sans-serif" }}>
                  {forgotLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</> : <>Verify <Check className="w-4 h-4" /></>}
                </button>

                {codeCountdown > 0 && (
                  <p className="text-center text-[12px]" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Resend in {codeCountdown}s</p>
                )}
                {codeCountdown === 0 && (
                  <button
                    type="button"
                    onClick={sendResetCode}
                    className="w-full text-[12px] text-blue-400 hover:text-blue-300 transition-colors"
                    style={{ fontFamily: "'Inter', sans-serif" }}>
                    Didn't receive the code? Resend
                  </button>
                )}
              </div>
            )}

            {/* Step 4: New Password */}
            {forgotStep === 4 && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center mb-6">
                  <h3 className="text-[20px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create New Password</h3>
                  <p className="text-[12px] mt-1" style={{ color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Make it strong and secure</p>
                </div>

                {forgotSuccess && <p className="text-[12px] text-green-400" style={{ fontFamily: "'Inter', sans-serif" }}>{forgotSuccess}</p>}

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className={labelClass}>New Password</Label>
                    <div className="relative">
                      <Input
                        type={forgotShowPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={forgotPassword}
                        onChange={(e) => { setForgotPassword(e.target.value); setForgotError(''); }}
                        className={inputClass + " pr-12"}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                        style={{ color: '#94A3B8' }}
                        onClick={() => setForgotShowPassword(!forgotShowPassword)}>
                        {forgotShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className={labelClass}>Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={forgotShowPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={forgotConfirmPassword}
                        onChange={(e) => { setForgotConfirmPassword(e.target.value); setForgotError(''); }}
                        className={inputClass + " pr-12"}
                        autoComplete="new-password"
                      />
                      {forgotPassword === forgotConfirmPassword && forgotConfirmPassword.length > 0 && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#10B981' }} />
                      )}
                    </div>
                  </div>
                </div>

                {forgotError && <p className="text-[12px] text-red-400" style={{ fontFamily: "'Inter', sans-serif" }}>{forgotError}</p>}

                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={forgotLoading || !forgotPassword || !forgotConfirmPassword || forgotPassword !== forgotConfirmPassword}
                  className="w-full h-[48px] rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-[0.88] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', fontFamily: "'Inter', sans-serif" }}>
                  {forgotLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : <>Reset Password <Check className="w-4 h-4" /></>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
