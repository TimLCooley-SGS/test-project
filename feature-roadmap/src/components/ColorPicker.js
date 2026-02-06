import React from 'react';

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="color-picker">
      <label className="color-picker-label">{label}</label>
      <div className="color-picker-input">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export default ColorPicker;
