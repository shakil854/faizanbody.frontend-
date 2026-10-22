import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export function LoginPage({ onLoginSuccess }) {
  const { login, verifyLoginOtp, resendLoginOtp } = useAuth();
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  // OTP Step States
  const [otpUserId, setOtpUserId] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // Timer countdown for OTP resend
  React.useEffect(() => {
    let timer = null;
    if (step === 'otp' && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  // Step 1: Submit Credentials
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your email or mobile number, and password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessNotice('');

    try {
      const res = await login(identifier.trim(), password);
      if (res?.requiresOtp) {
        setOtpUserId(res.userId);
        setMaskedEmail(res.email);
        setStep('otp');
        setOtp('');
        setResendTimer(60);
        setSuccessNotice(res.message || 'Verification code sent to your registered email.');
      } else if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Unable to sign in. Please verify your email/mobile and password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit OTP
  const handleOtpSubmit = async (e) => {
    e?.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the complete 6-digit OTP verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyLoginOtp(otpUserId, cleanOtp);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Invalid or expired OTP. Please check and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading) return;
    setResendLoading(true);
    setError('');
    try {
      const res = await resendLoginOtp(otpUserId);
      setSuccessNotice(res?.message || 'A fresh OTP has been sent to your registered email.');
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // Back to Credentials Step
  const handleBackToLogin = () => {
    setStep('credentials');
    setOtp('');
    setError('');
    setSuccessNotice('');
  };

  return (
    <div className="login-viewport">
      {/* Background Subtle Gradient Blobs */}
      <div className="login-bg-glow glow-top"></div>
      <div className="login-bg-glow glow-bottom"></div>

      <div className="login-card-container">
        {/* Main Luxury Auth Card */}
        <div className="login-card">
          {/* Card Top Brand Header */}
          <div className="login-brand-header">
            <div className="login-brand-icon-wrap">
              {step === 'otp' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 17h4V5H2v12h3" />
                  <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                  <circle cx="7.5" cy="17.5" r="2.5" />
                  <circle cx="17.5" cy="17.5" r="2.5" />
                </svg>
              )}
            </div>
            <div className="login-brand-titles">
              <span className="login-brand-badge">
                {step === 'otp' ? '2-Step Verification' : 'Official Portal'}
              </span>
              <h1 className="login-main-title">
                {step === 'otp' ? 'Security Verification' : 'Faizan Body Build'}
              </h1>
              <p className="login-main-subtitle">
                {step === 'otp'
                  ? `Enter the 6-digit code sent to ${maskedEmail || 'your email'}`
                  : 'Sign in with your Email or Mobile Number'}
              </p>
            </div>
          </div>

          {/* Success or Error Banner */}
          {error && (
            <div className="auth-error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="auth-info-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{successNotice}</span>
            </div>
          )}

          {/* Step 1: Sign In Credentials Form */}
          {step === 'credentials' && (
            <form onSubmit={handleLoginSubmit} className="login-form">
              {/* Email or Mobile Field */}
              <div className="auth-field-group">
                <label className="auth-field-label">Email or Mobile Number</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Enter email or mobile number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="auth-field-group">
                <div className="auth-field-header">
                  <label className="auth-field-label">Password</label>
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => setIsForgotOpen(true)}
                    tabIndex="-1"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex="-1"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Login Submit Button */}
              <button
                type="submit"
                className="btn btn-primary btn-login-submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-spinner-wrap">
                    <span className="spinner-border"></span>
                    Signing In...
                  </span>
                ) : (
                  <span className="btn-content-wrap">
                    Sign In
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Step 2: 2-Step OTP Verification Form */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="login-form">
              <div className="auth-field-group">
                <div className="auth-field-header">
                  <label className="auth-field-label">6-Digit Verification Code</label>
                  <button
                    type="button"
                    className="auth-resend-link"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || resendLoading}
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
                  </button>
                </div>
                <div className="auth-input-wrapper">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    className="auth-input auth-otp-input"
                    placeholder="------"
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(val);
                    }}
                    required
                    autoFocus
                  />
                </div>
                <span className="auth-input-hint text-center">
                  Check your inbox & spam folder for the email from Faizan Body.
                </span>
              </div>

              {/* Verify & Sign In Button */}
              <button
                type="submit"
                className="btn btn-primary btn-login-submit"
                disabled={loading || otp.length < 6}
              >
                {loading ? (
                  <span className="btn-spinner-wrap">
                    <span className="spinner-border"></span>
                    Verifying Code...
                  </span>
                ) : (
                  <span className="btn-content-wrap">
                    Verify & Enter System
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                )}
              </button>

              {/* Back to Change Account / Mobile */}
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={handleBackToLogin}
                style={{ marginTop: '0.25rem' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Sign In
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="login-footer-copy">
          &copy; {new Date().getFullYear()} Faizan Body Build &bull; High Performance Fleet Management
        </p>
      </div>

      {/* Forgot Password Modal with Email OTP */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        initialEmail={identifier && identifier.includes('@') ? identifier : ''}
        onClose={() => setIsForgotOpen(false)}
        onSuccess={(resetEmail) => {
          setIdentifier(resetEmail);
          setSuccessNotice('Password reset successfully! Please sign in with your new password.');
        }}
      />
    </div>
  );
}

export default LoginPage;
