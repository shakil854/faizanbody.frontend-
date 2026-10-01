import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';

export function ForgotPasswordModal({ isOpen, onClose, initialEmail = '', onSuccess }) {
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter OTP & New Password, 3: Success
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setStep(1);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setResendTimer(0);
    }
  }, [isOpen, initialEmail]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  if (!isOpen) return null;

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.forgotPassword(email.trim());
      setStep(2);
      setResendTimer(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please check your email address.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setError('');

    if (!otp.trim() || otp.trim().length < 6) {
      setError('Please enter the valid 6-digit OTP code sent to your email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword({
        identifier: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="auth-modal-header">
          <div className="auth-modal-icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="auth-modal-header-titles">
            <h3 className="auth-modal-title">
              {step === 1 && 'Reset Password'}
              {step === 2 && 'Enter Email OTP'}
              {step === 3 && 'Password Reset!'}
            </h3>
            <p className="auth-modal-sub">
              {step === 1 && 'OTP will be sent strictly to your registered email address'}
              {step === 2 && `Enter the 6-digit code received in ${email}`}
              {step === 3 && 'Your credentials have been securely updated'}
            </p>
          </div>
          <button type="button" className="auth-modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Email Only */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="auth-modal-body">
            <div className="auth-field-group">
              <label className="auth-field-label">Registered Email Address</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-auth-submit"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Send OTP to Email'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="auth-modal-body">
            <div className="auth-field-group">
              <div className="auth-field-header">
                <label className="auth-field-label">6-Digit Email OTP</label>
                <button
                  type="button"
                  className="auth-resend-link"
                  onClick={handleSendOtp}
                  disabled={loading || resendTimer > 0}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <circle cx="12" cy="16" r="1" />
                  </svg>
                </span>
                <input
                  type="text"
                  maxLength="6"
                  className="auth-input auth-otp-input"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-field-label">New Password</label>
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
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
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

            <div className="auth-field-group">
              <label className="auth-field-label">Confirm New Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="auth-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-auth-submit"
                disabled={loading}
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div className="auth-modal-body auth-success-screen">
            <div className="auth-success-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h4 className="auth-success-title">Password Changed Successfully!</h4>
            <p className="auth-success-desc">
              Your password has been securely updated. You can now log in using your new credentials.
            </p>
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => {
                onClose();
                if (onSuccess) onSuccess(email);
              }}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordModal;
