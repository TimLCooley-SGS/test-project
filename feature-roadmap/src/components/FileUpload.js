import React, { useRef } from 'react';

function FileUpload({ label, value, onChange, accept = 'image/*' }) {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload">
      <label className="file-upload-label">{label}</label>
      <div className="file-upload-content">
        {value ? (
          <div className="file-preview">
            <img src={value} alt="Preview" className="file-preview-image" />
            <button
              type="button"
              onClick={handleClear}
              className="file-clear-btn"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="file-upload-area">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="file-input"
            />
            <p>Click or drag to upload</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUpload;
