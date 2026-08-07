import React, { useMemo } from "react";
import type { StickerItem, StickerGeometry } from "@/types/sticker";
import { generateQRCodeSVG } from "../utils/qr-utils";

interface EtsStickerProps {
  item: StickerItem;
  geometry: StickerGeometry;
  className?: string;
}

export const EtsSticker: React.FC<EtsStickerProps> = ({
  item,
  geometry,
  className = "",
}) => {
  const qrUrl = `https://ets.zanxa.studio/p/${encodeURIComponent(item.serialNo || "")}`;
  
  const qrSvg = useMemo(() => {
    return generateQRCodeSVG(qrUrl);
  }, [qrUrl]);

  const style = {
    "--sticker-w": `${geometry.widthMm}mm`,
    "--sticker-h": `${geometry.heightMm}mm`,
  } as React.CSSProperties;

  return (
    <div className={`ets-sticker ${className}`} style={style}>
      <div className="ets-sticker-frame">
        <table className="ets-table">
          <colgroup>
            <col style={{ width: "9.58%" }} />
            <col style={{ width: "9.58%" }} />
            <col style={{ width: "9.58%" }} />
            <col style={{ width: "9.58%" }} />
            <col style={{ width: "9.58%" }} />
            <col style={{ width: "9.58%" }} />
            <col style={{ width: "6.67%" }} />
            <col style={{ width: "6.67%" }} />
            <col style={{ width: "6.67%" }} />
            <col style={{ width: "22.5%" }} />
          </colgroup>
          <tbody>
            {/* ROW 1: HEADER & QR ROWSPAN (ON RIGHT) */}
            <tr className="ets-row-header">
              <td colSpan={9} className="ets-cell-header">
                ELECTRICITY TREATMENT SYSTEM
              </td>
              <td rowSpan={6} className="ets-cell-qr">
                <div className="ets-qr-wrapper">
                  <div className="ets-qr-scan-text">SCAN</div>
                  <div
                    className="ets-qr-code"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                  <div className="ets-qr-list">
                    <div>✓ status garansi</div>
                    <div>✓ Spesifikasi</div>
                    <div>✓ Dokumentasi</div>
                    <div>✓ Laporan</div>
                  </div>
                </div>
              </td>
            </tr>

            {/* ROW 2: PRODUCT NAME & MODEL ROWSPAN */}
            <tr className="ets-cell-data">
              <td colSpan={6}>
                <div className="ets-flex-field">
                  <span className="ets-lbl">Product Name.</span>
                  <span className="ets-val">{item.productName}</span>
                </div>
              </td>
              <td colSpan={3} rowSpan={2} className="ets-cell-model">
                <div className="ets-model-wrapper">
                  <div className="ets-model-label">Model.</div>
                  <div className="ets-model-val">{item.model}</div>
                </div>
              </td>
            </tr>

            {/* ROW 3: SERIAL NO. */}
            <tr className="ets-cell-data">
              <td colSpan={6}>
                <div className="ets-flex-field">
                  <span className="ets-lbl">Serial No.</span>
                  <span className="ets-val ets-sn-val">{item.serialNo}</span>
                </div>
              </td>
            </tr>

            {/* ROW 4: CAPACITY & 1-PHASE ROWSPAN */}
            <tr className="ets-cell-data">
              <td colSpan={6}>
                <div className="ets-flex-field">
                  <span className="ets-lbl">Capacity :</span>
                  <span className="ets-val">{item.capacity}</span>
                </div>
              </td>
              <td colSpan={3} rowSpan={2} className="ets-cell-phase">
                <div className="ets-phase-val">1-Phase</div>
              </td>
            </tr>

            {/* ROW 5: PROD. NO */}
            <tr className="ets-cell-data">
              <td colSpan={6}>
                <div className="ets-flex-field">
                  <span className="ets-lbl">Prod. No :</span>
                  <span className="ets-val">{item.prodNo}</span>
                </div>
              </td>
            </tr>

            {/* ROW 6: VOLTAGE & FREQUENCY / MADE IN INDONESIA */}
            <tr>
              <td colSpan={4} className="ets-cell-vf">
                <div className="ets-vf-container">
                  <div className="ets-vf-row">
                    <span className="lbl">Voltage&nbsp;&nbsp;:</span>
                    <span className="val">{item.voltage}</span>
                  </div>
                  <div className="ets-vf-row">
                    <span className="lbl">Frequency :</span>
                    <span className="val">{item.frequency}</span>
                  </div>
                </div>
              </td>
              <td colSpan={5} className="ets-cell-origin">
                <div className="ets-origin-val">Made in INDONESIA</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
