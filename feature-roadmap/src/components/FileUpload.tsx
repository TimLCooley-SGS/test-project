import React, { useRef } from 'react';

interface FileUploadProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  accept?: string;
}

function FileUpload({ label, value, onChange, accept = 'image/*' }: FileUploadProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = (): void => {
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
