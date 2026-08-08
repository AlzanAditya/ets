import React, { useMemo } from 'react';
import { StickerData } from '../types';
import { generateQRCodeSVG } from '../utils/qr-generator';

interface EtsStickerProps {
  data: StickerData;
  widthMm: number;
  heightMm: number;
  className?: string;
}

export const EtsSticker: React.FC<EtsStickerProps> = ({
  data,
  widthMm,
  heightMm,
  className = '',
}) => {
  const serialNoClean = useMemo(() => {
    return (data.serialNo || '').replace(/\s+/g, '');
  }, [data.serialNo]);

  const qrUrl = `https://ets.zanxa.studio/p/${encodeURIComponent(serialNoClean)}`;

  const qrSvg = useMemo(() => {
    return generateQRCodeSVG(qrUrl);
  }, [qrUrl]);

  const qrDataUrl = useMemo(() => {
    if (!qrSvg) return '';
    return `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`;
  }, [qrSvg]);

  return (
    <svg
      viewBox="0 0 1000 500"
      className={`ets-sticker ${className}`}
      style={
        {
          width: `${widthMm}mm`,
          height: `${heightMm}mm`,
          display: 'block',
          boxSizing: 'border-box',
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        } as React.CSSProperties
      }
    >
      {/* Outer Black Canvas with Rounded Corners */}
      <rect x="0" y="0" width="1000" height="500" rx="30" ry="30" fill="#000000" />

      {/* LEFT MAIN SECTION FRAME */}
      {/* 1. Header Box */}
      <path
        d="M 37 15 H 766 V 100 H 15 V 37 A 22 22 0 0 1 37 15 Z"
        fill="#000000"
        stroke="#ffffff"
        strokeWidth="5"
      />

      <text
        x="390.5"
        y="57.5"
        fill="#ffffff"
        fontSize="32"
        fontWeight="900"
        letterSpacing="0.6"
        textAnchor="middle"
        dominantBaseline="central"
      >
        ELECTRICITY TREATMENT SYSTEM
      </text>

      {/* 2. Middle Block (4 Data Rows) */}
      {/* Row 1: Product Name */}
      <rect
        x="15"
        y="100"
        width="501"
        height="70.5"
        fill="#000000"
        stroke="#ffffff"
        strokeWidth="5"
      />
      <text
        x="30"
        y="135.25"
        fill="#ffffff"
        fontSize="30"
        fontWeight="500"
        textAnchor="start"
        dominantBaseline="central"
      >
        Product Name.
      </text>
      <text
        x="500"
        y="135.25"
        fill="#ffffff"
        fontSize="33"
        fontWeight="600"
        textAnchor="end"
        dominantBaseline="central"
      >
        {data.productName}
      </text>

      {/* Row 2: Serial No */}
      <rect
        x="15"
        y="170.5"
        width="501"
        height="70.5"
        fill="#000000"
        stroke="#ffffff"
        strokeWidth="5"
      />
      <text
        x="30"
        y="205.75"
        fill="#ffffff"
        fontSize="30"
        fontWeight="500"
        textAnchor="start"
        dominantBaseline="central"
      >
        Serial No.
      </text>
      <text
        x="500"
        y="205.75"
        fill="#ffffff"
        fontSize="28"
        fontWeight="600"
        textAnchor="end"
        dominantBaseline="central"
      >
        {serialNoClean}
      </text>

      {/* Row 3: Capacity */}
      <rect
        x="15"
        y="241"
        width="501"
        height="70.5"
        fill="#000000"
        stroke="#ffffff"
        strokeWidth="5"
      />
      <text
        x="30"
        y="276.25"
        fill="#ffffff"
        fontSize="30"
        fontWeight="500"
        textAnchor="start"
        dominantBaseline="central"
      >
        Capacity :
      </text>
      <text
        x="500"
        y="276.25"
        fill="#ffffff"
        fontSize="33"
        fontWeight="600"
        textAnchor="end"
        dominantBaseline="central"
      >
        {data.capacity}
      </text>

      {/* Row 4: Prod. No */}
      <rect
        x="15"
        y="311.5"
        width="501"
        height="70.5"
        fill="#000000"
        stroke="#ffffff"
        strokeWidth="5"
      />
      <text
        x="30"
        y="346.75"
        fill="#ffffff"
        fontSize="30"
        fontWeight="500"
        textAnchor="start"
        dominantBaseline="central"
      >
        Prod. No :
      </text>
      <text
        x="500"
        y="346.75"
        fill="#ffffff"
        fontSize="33"
        fontWeight="600"
        textAnchor="end"
        dominantBaseline="central"
      >
        {data.prodNo}
      </text>

      {/* 3. Middle Block (Right Side: Model & Phase) */}
      {/* Model Block */}
      <rect
        x="516"
        y="100"
        width="250"
        height="141"
        fill="#000000"
        stroke="#ffffff"
        strokeWidth="5"
      />
      <text
        x="530"
        y="125"
        fill="#ffffff"
        fontSize="26"
        fontWeight="500"
        textAnchor="start"
        dominantBaseline="central"
      >
        Model.
      </text>
      <text
        x="641"
        y="185"
        fill="#ffffff"
        fontSize="48"
        fontWeight="800"
        letterSpacing="1"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {data.model}
      </text>

      {/* Phase Block */}
      <rect
        x="516"
        y="241"
        width="250"
        height="141"
        fill="#000000"
        stroke="#ffffff"
        strokeWidth="5"
      />
      <text
        x="641"
        y="311.5"
        fill="#ffffff"
        fontSize="38"
        fontWeight="700"
        letterSpacing="0.8"
        textAnchor="middle"
        dominantBaseline="central"
      >
        1-Phase
      </text>

      {/* 4. Bottom Row */}
      {/* Voltage & Frequency Block */}
      <path
        d="M 15 382 H 348 V 485 H 37 A 22 22 0 0 1 15 463 V 382 Z"
        fill="#000000"
        stroke="#ffffff"
        strokeWidth="5"
      />

      <text
        x="30"
        y="413"
        fill="#ffffff"
        fontSize="27"
        fontWeight="500"
        textAnchor="start"
        dominantBaseline="central"
      >
        Voltage &nbsp;&nbsp;:
      </text>
      <text
        x="190"
        y="413"
        fill="#ffffff"
        fontSize="28"
        fontWeight="600"
        textAnchor="start"
        dominantBaseline="central"
      >
        {data.voltage}
      </text>

      <text
        x="30"
        y="453"
        fill="#ffffff"
        fontSize="27"
        fontWeight="500"
        textAnchor="start"
        dominantBaseline="central"
      >
        Frequency :
      </text>
      <text
        x="190"
        y="453"
        fill="#ffffff"
        fontSize="28"
        fontWeight="600"
        textAnchor="start"
        dominantBaseline="central"
      >
        {data.frequency}
      </text>

      {/* Made in INDONESIA Block */}
      <rect
        x="348"
        y="382"
        width="418"
        height="103"
        fill="#000000"
        stroke="#ffffff"
        strokeWidth="5"
      />
      <text
        x="557"
        y="433.5"
        fill="#ffffff"
        fontSize="32"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
      >
        Made in INDONESIA
      </text>

      {/* 5. RIGHT SECTION: INVERTED QR CELL */}
      <path
        d="M 766 15 H 963 A 22 22 0 0 1 985 37 V 463 A 22 22 0 0 1 963 485 H 766 V 15 Z"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="5"
      />

      {/* SCAN Text */}
      <text
        x="875.5"
        y="62"
        fill="#000000"
        fontSize="47"
        fontWeight="900"
        letterSpacing="2"
        textAnchor="middle"
        dominantBaseline="central"
      >
        SCAN
      </text>

      {/* QR Code Image */}
      {qrDataUrl && (
        <image
          href={qrDataUrl}
          x="779.5"
          y="96"
          width="192"
          height="192"
        />
      )}

      {/* Bullet Checklist */}
      <text
        x="785"
        y="312"
        fill="#000000"
        fontSize="21"
        fontWeight="600"
        textAnchor="start"
        dominantBaseline="central"
      >
        ✓ status garansi
      </text>
      <text
        x="785"
        y="342"
        fill="#000000"
        fontSize="21"
        fontWeight="600"
        textAnchor="start"
        dominantBaseline="central"
      >
        ✓ Spesifikasi
      </text>
      <text
        x="785"
        y="372"
        fill="#000000"
        fontSize="21"
        fontWeight="600"
        textAnchor="start"
        dominantBaseline="central"
      >
        ✓ Dokumentasi
      </text>
      <text
        x="785"
        y="402"
        fill="#000000"
        fontSize="21"
        fontWeight="600"
        textAnchor="start"
        dominantBaseline="central"
      >
        ✓ Laporan
      </text>
    </svg>
  );
};
