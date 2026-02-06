import React from 'react';

// Popular Google Fonts list
const POPULAR_FONTS: string[] = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro',
  'Raleway',
  'Nunito',
  'Ubuntu',
  'Merriweather',
  'Playfair Display',
  'PT Sans',
  'Noto Sans',
  'Work Sans',
  'Quicksand',
  'Fira Sans',
  'Rubik',
  'Karla',
  'Josefin Sans',
];

interface FontPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function FontPicker({ label, value, onChange }: FontPickerProps): React.ReactElement {
  return (
    <div className="font-picker">
      <label className="font-picker-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-picker-select"
        style={{ fontFamily: value }}
      >
        {POPULAR_FONTS.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );
}

export default FontPicker;
