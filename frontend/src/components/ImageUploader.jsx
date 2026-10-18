import React, { useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X } from 'lucide-react';

export default function ImageUploader({ imageFile, previewUrl, onImageSelect, onImageRemove }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className={`option-box ${imageFile ? 'active' : ''}`}>
      <div className="option-box-header">
        <span className="option-title">
          <ImageIcon size={18} style={{ color: 'var(--primary-600)' }} />
          Option 1: Upload Crop Image
        </span>
        {imageFile && (
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-700)', fontWeight: 600 }}>
            {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
          </span>
        )}
      </div>

      {!previewUrl ? (
        <div
          className="image-upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          role="button"
          tabIndex={0}
        >
          <UploadCloud size={36} className="dropzone-icon" />
          <p className="dropzone-text">Click or drag & drop leaf or crop photo</p>
          <p className="dropzone-subtext">Supports JPG, PNG, WEBP (Max 10MB)</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
            id="crop-image-input"
          />
        </div>
      ) : (
        <div className="image-preview-wrapper">
          <img src={previewUrl} alt="Crop Sample Preview" className="image-preview" />
          <button
            type="button"
            className="clear-image-btn"
            onClick={onImageRemove}
            title="Remove image"
            aria-label="Remove image"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
