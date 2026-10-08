import React, { useState, useEffect, useRef } from 'react';
import { workerService, getAadharFullUrl } from '../../services/workerService';
import { capturePhotoFromCamera, pickPhotosFromGallery, compressImageFile } from '../../utils/nativeCamera';
import { AadharPreviewModal } from './AadharPreviewModal';

export function WorkerFormModal({ isOpen, onClose, onSave, initialData }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [aadharCard, setAadharCard] = useState('');
  const [aadharFile, setAadharFile] = useState(null);
  const [aadharPreview, setAadharPreview] = useState('');
  const [comingDate, setComingDate] = useState('');
  const [goingDate, setGoingDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setMobile(initialData.mobile || '');
      setAadharCard(initialData.aadhar_card || '');
      setAadharPreview(initialData.aadhar_card ? getAadharFullUrl(initialData.aadhar_card) : '');
      setAadharFile(null);
      setComingDate(initialData.coming_date ? initialData.coming_date.split('T')[0] : '');
      setGoingDate(initialData.going_date ? initialData.going_date.split('T')[0] : '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setName('');
      setMobile('');
      setAadharCard('');
      setAadharPreview('');
      setAadharFile(null);
      setComingDate(today);
      setGoingDate('');
    }
    setError('');
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Process selected or captured image file
  const handleProcessImage = async (file) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1280, 0.75);
      setAadharFile(compressed);
      const localPreviewUrl = URL.createObjectURL(compressed);
      setAadharPreview(localPreviewUrl);
      setError('');
    } catch (err) {
      console.warn('Image processing warning:', err);
      setAadharFile(file);
      setAadharPreview(URL.createObjectURL(file));
    }
  };

  // Direct Live Camera Trigger
  const handleCameraTrigger = async () => {
    try {
      const files = await capturePhotoFromCamera();
      if (files && files.length > 0) {
        await handleProcessImage(files[0]);
      }
    } catch {
      cameraInputRef.current?.click();
    }
  };

  // Gallery Picker Trigger
  const handleGalleryTrigger = async () => {
    try {
      const files = await pickPhotosFromGallery();
      if (files && files.length > 0) {
        await handleProcessImage(files[0]);
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  // Hidden Input change handlers
  const onFileInputChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleProcessImage(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveAadhar = () => {
    setAadharFile(null);
    setAadharCard('');
    setAadharPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Worker name is required (कार्यकर्ता का नाम आवश्यक है)');
      return;
    }
    if (!comingDate) {
      setError('Coming date is required (आने की तारीख आवश्यक है)');
      return;
    }

    const finalGoingDate = goingDate ? goingDate.trim() : null;
    if (finalGoingDate && finalGoingDate < comingDate) {
      setError('Going date cannot be earlier than Coming date');
      return;
    }

    try {
      setIsSubmitting(true);

      let finalAadharUrl = aadharCard;

      // If user uploaded/clicked a new photo, send to backend
      if (aadharFile) {
        try {
          const uploadRes = await workerService.uploadAadharPhoto(
            aadharFile,
            initialData?.id || 'temp'
          );
          if (uploadRes && uploadRes.url) {
            finalAadharUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn('Aadhar upload fallback:', uploadErr);
          // If server upload failed, we can fallback to base64 data-url or proceed
          const msg = uploadErr.response?.data?.message || uploadErr.message;
          setError(`Aadhar photo upload warning: ${msg}`);
          setIsSubmitting(false);
          return;
        }
      }

      await onSave({
        name: name.trim(),
        mobile: mobile.trim(),
        aadhar_card: finalAadharUrl || null,
        coming_date: comingDate,
        going_date: finalGoingDate,
      });

      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save worker';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="android-bottom-sheet luxury-bottom-sheet"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Drag handle for mobile */}
          <div className="sheet-handle-bar">
            <div className="sheet-handle"></div>
          </div>

          {/* Modal Header */}
          <div className="sheet-header">
            <div className="sheet-title-group">
              <div className="sheet-icon-squircle">
                {initialData ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="sheet-title">
                  {initialData ? 'Edit Worker Profile' : 'Enroll New Worker'}
                </h3>
                <p className="sheet-subtitle">
                  {initialData ? 'Update contact, aadhar card, and dates' : 'Enter worker details, contact, and upload Aadhar'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="sheet-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Form Error Notice */}
          {error && (
            <div className="form-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Hidden HTML5 File & Camera Inputs for Web / Mobile Fallback */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileInputChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={onFileInputChange}
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
          />

          {/* Worker Form */}
          <form onSubmit={handleSubmit} className="sheet-form">
            {/* Field 1: Worker Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="workerName">
                Worker Full Name (नाम) <span className="required-star">*</span>
              </label>
              <div className="input-with-icon">
                <span className="field-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="workerName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mohammad Faizan / Rashid Khan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Field 2: Mobile Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="workerMobile">
                Mobile Number (मोबाइल नं.)
              </label>
              <div className="input-with-icon">
                <span className="field-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <input
                  id="workerMobile"
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength={15}
                />
              </div>
            </div>

            {/* Field 3: Aadhar Card (Photo Upload / Camera Click) */}
            <div className="form-group aadhar-form-group">
              <div className="aadhar-header-row">
                <label className="form-label">
                  Aadhar Card Photo (आधार कार्ड फोटो)
                </label>
                {aadharPreview && (
                  <span className="badge-attached-success">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Photo Attached
                  </span>
                )}
              </div>

              {aadharPreview ? (
                /* Attached Photo Preview Card */
                <div className="aadhar-preview-card">
                  <div
                    className="aadhar-preview-thumbnail-box"
                    onClick={() => setIsPreviewModalOpen(true)}
                    title="Click to view full photo"
                  >
                    <img
                      src={aadharPreview}
                      alt="Aadhar Preview"
                      className="aadhar-preview-thumb-img"
                    />
                    <div className="aadhar-zoom-overlay">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                    </div>
                  </div>
                  <div className="aadhar-preview-info">
                    <span className="aadhar-preview-name">Aadhar Card Attached</span>
                    <span className="aadhar-preview-sub">Ready for verification</span>
                    <div className="aadhar-preview-btn-row">
                      <button
                        type="button"
                        className="btn-text-action btn-retake-action"
                        onClick={handleCameraTrigger}
                        title="Click new photo with camera"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        Retake
                      </button>
                      <button
                        type="button"
                        className="btn-text-action btn-upload-again-action"
                        onClick={handleGalleryTrigger}
                        title="Select different photo from gallery"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        Upload
                      </button>
                      <button
                        type="button"
                        className="btn-text-action btn-remove-action"
                        onClick={handleRemoveAadhar}
                        title="Remove attached Aadhar card"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Two Prominent Action Buttons: Camera Click & Gallery Upload */
                <div className="aadhar-upload-actions-grid">
                  <button
                    type="button"
                    className="aadhar-action-btn aadhar-camera-btn"
                    onClick={handleCameraTrigger}
                  >
                    <div className="aadhar-action-icon-circle camera-circle">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                    <div className="aadhar-action-text">
                      <span className="action-title">Click Photo</span>
                      <span className="action-subtitle">Live Camera</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="aadhar-action-btn aadhar-gallery-btn"
                    onClick={handleGalleryTrigger}
                  >
                    <div className="aadhar-action-icon-circle gallery-circle">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <div className="aadhar-action-text">
                      <span className="action-title">Upload Photo</span>
                      <span className="action-subtitle">From Files / Gallery</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Field 4: Coming Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="comingDate">
                Coming Date (Joining) <span className="required-star">*</span>
              </label>
              <div className="input-with-icon">
                <span className="field-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <input
                  id="comingDate"
                  type="date"
                  className="form-input date-input"
                  value={comingDate}
                  onChange={(e) => setComingDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Field 5: Going Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="goingDate">
                Going Date (Relieved / Optional)
              </label>
              <div className="input-with-icon">
                <span className="field-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <input
                  id="goingDate"
                  type="date"
                  className="form-input date-input"
                  value={goingDate}
                  min={comingDate || undefined}
                  onChange={(e) => setGoingDate(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sheet-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-save"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="spinner-dots">
                    {aadharFile ? 'Uploading Photo...' : 'Saving...'}
                  </span>
                ) : initialData ? (
                  'Update Profile'
                ) : (
                  'Save Worker'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Aadhar Full-size preview modal */}
      <AadharPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        workerName={name || 'Worker'}
        aadharUrl={aadharPreview}
      />
    </>
  );
}

export default WorkerFormModal;
