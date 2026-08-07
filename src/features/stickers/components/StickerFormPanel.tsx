import React from "react";
import type {
  StickerItem,
  StickerGeometry,
  A4LayoutSettings,
  A4Stats,
  StickerPreset,
} from "@/types/sticker";
import { Sliders, Maximize2, LayoutGrid, BarChart2 } from "lucide-react";

interface StickerFormPanelProps {
  item: StickerItem;
  onChangeItem: (newItem: StickerItem) => void;
  geometry: StickerGeometry;
  onChangeGeometry: (newGeo: StickerGeometry) => void;
  settings: A4LayoutSettings;
  onChangeSettings: (newSettings: A4LayoutSettings) => void;
  stats: A4Stats;
  presets: StickerPreset[];
}

export const StickerFormPanel: React.FC<StickerFormPanelProps> = ({
  item,
  onChangeItem,
  geometry,
  onChangeGeometry,
  settings,
  onChangeSettings,
  stats,
  presets,
}) => {
  const handleItemChange = (field: keyof StickerItem, val: string) => {
    let cleanVal = val;
    if (field === "serialNo") {
      cleanVal = val.replace(/\s+/g, "");
    }
    onChangeItem({ ...item, [field]: cleanVal });
  };

  const handleNumSettings = (field: keyof A4LayoutSettings, val: number) => {
    onChangeSettings({
      ...settings,
      [field]: isNaN(val) || val < 0 ? 0 : val,
    });
  };

  const handleGeometryChange = (field: keyof StickerGeometry, val: number) => {
    onChangeGeometry({
      ...geometry,
      [field]: isNaN(val) || val < 10 ? 10 : val,
    });
  };

  return (
    <aside className="w-full lg:w-80 shrink-0 space-y-4">
      {/* 1. Data Produk ETS */}
      <section className="bg-card border border-border/70 rounded-xl p-4 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold flex items-center gap-2 text-foreground pb-1 border-b border-border/50">
          <Sliders className="h-4 w-4 text-primary" />
          Data Produk ETS
        </h2>

        <div className="space-y-2.5 text-xs">
          <div>
            <label className="block text-muted-foreground font-medium mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={item.productName}
              onChange={(e) => handleItemChange("productName", e.target.value)}
              placeholder="contoh: ETS-5.000.AIZ"
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-muted-foreground font-medium">
                Serial No.
              </label>
              <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Anti-Spasi
              </span>
            </div>
            <input
              type="text"
              value={item.serialNo}
              onChange={(e) => handleItemChange("serialNo", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === " " || e.code === "Space") e.preventDefault();
              }}
              placeholder="contoh: XSI-II512-B-5000-1-0004"
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Capacity
              </label>
              <input
                type="text"
                value={item.capacity}
                onChange={(e) => handleItemChange("capacity", e.target.value)}
                placeholder="5000 VA / 5 KVA"
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Prod. No
              </label>
              <input
                type="text"
                value={item.prodNo}
                onChange={(e) => handleItemChange("prodNo", e.target.value)}
                placeholder="B312D-00004"
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Voltage
              </label>
              <input
                type="text"
                value={item.voltage}
                onChange={(e) => handleItemChange("voltage", e.target.value)}
                placeholder="AC 220V"
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Frequency
              </label>
              <input
                type="text"
                value={item.frequency}
                onChange={(e) => handleItemChange("frequency", e.target.value)}
                placeholder="50 Hz"
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1">
              Model
            </label>
            <input
              type="text"
              value={item.model}
              onChange={(e) => handleItemChange("model", e.target.value)}
              placeholder="AIZ"
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </section>

      {/* 2. Ukuran Stiker (mm) */}
      <section className="bg-card border border-border/70 rounded-xl p-4 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold flex items-center gap-2 text-foreground pb-1 border-b border-border/50">
          <Maximize2 className="h-4 w-4 text-primary" />
          Ukuran Stiker (mm)
        </h2>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Width (mm)
              </label>
              <input
                type="number"
                min={20}
                max={250}
                value={geometry.widthMm}
                onChange={(e) =>
                  handleGeometryChange("widthMm", parseFloat(e.target.value))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Height (mm)
              </label>
              <input
                type="number"
                min={20}
                max={200}
                value={geometry.heightMm}
                onChange={(e) =>
                  handleGeometryChange("heightMm", parseFloat(e.target.value))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1.5">
              Preset Ukuran Populer:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p) => {
                const isActive =
                  geometry.widthMm === p.width && geometry.heightMm === p.height;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() =>
                      onChangeGeometry({ widthMm: p.width, heightMm: p.height })
                    }
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Layout Kertas A4 */}
      <section className="bg-card border border-border/70 rounded-xl p-4 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold flex items-center gap-2 text-foreground pb-1 border-b border-border/50">
          <LayoutGrid className="h-4 w-4 text-primary" />
          Layout Kertas A4
        </h2>

        <div className="space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Margin A4 (mm)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={settings.marginMm}
                onChange={(e) =>
                  handleNumSettings("marginMm", parseFloat(e.target.value))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Jumlah Cetak (Pcs)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={settings.copies}
                onChange={(e) =>
                  handleNumSettings("copies", parseInt(e.target.value, 10))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Gap Horisontal (mm)
              </label>
              <input
                type="number"
                min={0}
                max={20}
                value={settings.hGapMm}
                onChange={(e) =>
                  handleNumSettings("hGapMm", parseFloat(e.target.value))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Gap Vertikal (mm)
              </label>
              <input
                type="number"
                min={0}
                max={20}
                value={settings.vGapMm}
                onChange={(e) =>
                  handleNumSettings("vGapMm", parseFloat(e.target.value))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1">
              Skala Kualitas PDF (Resolusi/DPI)
            </label>
            <select
              value={settings.pdfScale}
              onChange={(e) =>
                handleNumSettings("pdfScale", parseInt(e.target.value, 10))
              }
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value={1}>1x Scale (Draft / Cepat)</option>
              <option value={2}>2x Scale (Standard HD)</option>
              <option value={3}>3x Scale (Super Jernih - Default)</option>
              <option value={4}>4x Scale (Ultra HD / High-Res)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 4. Layout Capacity Summary */}
      <section className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-xl p-4 space-y-2 text-xs shadow-xs">
        <h3 className="font-bold flex items-center gap-1.5 text-primary text-xs uppercase tracking-wider mb-2">
          <BarChart2 className="h-4 w-4" />
          Kapasitas Layout A4
        </h3>

        <div className="flex justify-between items-center py-1 border-b border-border/40 text-muted-foreground">
          <span>Susunan Kolom:</span>
          <span className="font-bold text-foreground">{stats.cols} kolom</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-border/40 text-muted-foreground">
          <span>Susunan Baris:</span>
          <span className="font-bold text-foreground">{stats.rows} baris</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-border/40 text-muted-foreground">
          <span>Kapasitas 1 lembar A4:</span>
          <span className="font-extrabold text-primary">
            {stats.capacityPerPage} stiker/A4
          </span>
        </div>

        <div className="flex justify-between items-center pt-1 text-muted-foreground">
          <span>Kebutuhan Kertas:</span>
          <span className="font-extrabold text-emerald-500">
            {stats.totalPages} Halaman ({stats.totalCopies} pcs)
          </span>
        </div>
      </section>
    </aside>
  );
};
