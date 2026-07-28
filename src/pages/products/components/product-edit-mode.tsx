import * as React from "react";
import {
  PackageIcon,
  ZapIcon,
  ShieldCheckIcon,
  MapPinIcon,
  TagIcon,
  Building2Icon,
  CalendarIcon,
  CpuIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  ImageIcon,
  ArrowLeftIcon,
  CheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import type { ProductRow, ClientRow } from "@/types/database";

const STATUS_OPTIONS: ProductRow["status"][] = [
  "warranty",
  "maintenance",
];

const STATUS_LABELS: Record<string, string> = {
  warranty: "Bergaransi",
  garansi: "Bergaransi",
  maintenance: "Maintenance",
};

const NO_SELECTION_VALUE = "__NONE__";

interface ProductEditModeProps {
  editTarget: ProductRow | null;
  fields: any;
  setField: (key: any, value: any) => void;
  clients: ClientRow[];
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  drawerImages: Array<{ storagePath: string; previewUrl?: string; thumbUrl?: string }>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteImage: (index: number) => void;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ProductEditMode({
  editTarget,
  fields,
  setField,
  clients,
  onSubmit,
  onCancel,
  isSubmitting,
  drawerImages,
  handleFileSelect,
  handleDeleteImage,
  uploading,
  fileInputRef,
}: ProductEditModeProps) {
  // Field counters for Accordion indicators
  const emptyInfoCount = [
    fields.serial_number,
    fields.product_name,
    fields.model,
    fields.model_code,
  ].filter((v) => !v || !String(v).trim()).length;

  const emptySpecsCount = [
    fields.input_voltage,
    fields.output_voltage,
    fields.frequency,
    fields.socket_count,
    fields.power_capacity,
  ].filter((v) => v === null || v === undefined || !String(v).trim()).length;

  const emptyProteksiCount = [
    fields.soft_fuse,
    fields.hard_fuse,
    fields.ground_output,
  ].filter((v) => !v || !String(v).trim()).length;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 w-full space-y-6 pb-28">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PackageIcon className="size-5 text-primary" />
            {editTarget ? "Edit Detail Produk" : "Tambah Produk Baru"}
          </h2>
          {editTarget && (
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Serial Number: <span className="font-semibold text-foreground">{editTarget.serial_number}</span>
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5 rounded-xl">
          <ArrowLeftIcon className="size-3.5" />
          Batal
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Accordion */}
        <div className="lg:col-span-2 space-y-4">
          <Accordion
            type="multiple"
            defaultValue={["informasi-dasar", "spesifikasi", "proteksi", "lokasi-status", "catatan"]}
            className="w-full space-y-3"
          >
            {/* 1. Informasi Dasar */}
            <AccordionItem
              value="informasi-dasar"
              className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
            >
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center justify-between w-full mr-2">
                  <div className="flex items-center gap-2 text-foreground">
                    <PackageIcon className="size-4 text-primary" />
                    <span>Informasi Dasar Produk</span>
                  </div>
                  {emptyInfoCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                    >
                      {emptyInfoCount}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="serial_number" className="flex items-center gap-1.5 text-xs font-semibold">
                    <TagIcon className="size-3.5 text-primary" />
                    Nomor Seri (Serial Number) *
                  </Label>
                  <Input
                    id="serial_number"
                    value={fields.serial_number}
                    onChange={(e) => setField("serial_number", e.target.value)}
                    placeholder="SN-..."
                    disabled={!!editTarget}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product_code" className="flex items-center gap-1.5 text-xs font-semibold">
                    <TagIcon className="size-3.5 text-primary" />
                    Kode Produk
                  </Label>
                  <Input
                    id="product_code"
                    value={fields.product_code ?? ""}
                    onChange={(e) => setField("product_code", e.target.value)}
                    placeholder="PRD-..."
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product_name" className="flex items-center gap-1.5 text-xs font-semibold">
                    <PackageIcon className="size-3.5 text-primary" />
                    Nama Produk *
                  </Label>
                  <Input
                    id="product_name"
                    value={fields.product_name}
                    onChange={(e) => setField("product_name", e.target.value)}
                    placeholder="Nama lengkap produk..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="model" className="flex items-center gap-1.5 text-xs font-semibold">
                      <Building2Icon className="size-3.5 text-primary" />
                      Model
                    </Label>
                    <Input
                      id="model"
                      value={fields.model ?? ""}
                      onChange={(e) => setField("model", e.target.value)}
                      placeholder="Liebert GXT4, APC Smart-UPS..."
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="manufacture_year" className="flex items-center gap-1.5 text-xs font-semibold">
                      <CalendarIcon className="size-3.5 text-primary" />
                      Tahun Pembuatan
                    </Label>
                    <Input
                      id="manufacture_year"
                      type="number"
                      min="1990"
                      max="2099"
                      value={fields.manufacture_year ?? ""}
                      onChange={(e) =>
                        setField("manufacture_year", e.target.value ? Number(e.target.value) : null)
                      }
                      placeholder="2024"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="model_code" className="flex items-center gap-1.5 text-xs font-semibold">
                    <CpuIcon className="size-3.5 text-primary" />
                    Tipe / Model Kode
                  </Label>
                  <Input
                    id="model_code"
                    value={fields.model_code ?? ""}
                    onChange={(e) => setField("model_code", e.target.value)}
                    placeholder="GXT4-3000RT230"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Spesifikasi Elektrikal */}
            <AccordionItem
              value="spesifikasi"
              className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
            >
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center justify-between w-full mr-2">
                  <div className="flex items-center gap-2 text-foreground">
                    <ZapIcon className="size-4 text-amber-500" />
                    <span>Spesifikasi Elektrikal</span>
                  </div>
                  {emptySpecsCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                    >
                      {emptySpecsCount}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="input_voltage" className="flex items-center gap-1.5 text-xs font-semibold">
                      <ZapIcon className="size-3.5 text-amber-500" />
                      Input Voltage
                    </Label>
                    <Input
                      id="input_voltage"
                      value={fields.input_voltage ?? ""}
                      onChange={(e) => setField("input_voltage", e.target.value)}
                      placeholder="220V / 1Ph / 50Hz"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="output_voltage" className="flex items-center gap-1.5 text-xs font-semibold">
                      <ZapIcon className="size-3.5 text-amber-500" />
                      Output Voltage
                    </Label>
                    <Input
                      id="output_voltage"
                      value={fields.output_voltage ?? ""}
                      onChange={(e) => setField("output_voltage", e.target.value)}
                      placeholder="220V / 1Ph / 50Hz"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="frequency" className="flex items-center gap-1.5 text-xs font-semibold">
                      <ZapIcon className="size-3.5 text-amber-500" />
                      Frekuensi
                    </Label>
                    <Input
                      id="frequency"
                      value={fields.frequency ?? ""}
                      onChange={(e) => setField("frequency", e.target.value)}
                      placeholder="50 Hz"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="socket_count" className="flex items-center gap-1.5 text-xs font-semibold">
                      <ZapIcon className="size-3.5 text-amber-500" />
                      Jumlah Socket
                    </Label>
                    <Input
                      id="socket_count"
                      type="number"
                      min="0"
                      value={fields.socket_count ?? ""}
                      onChange={(e) =>
                        setField("socket_count", e.target.value ? Number(e.target.value) : null)
                      }
                      placeholder="6"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="power_capacity" className="flex items-center gap-1.5 text-xs font-semibold">
                    <ZapIcon className="size-3.5 text-amber-500" />
                    Range Daya
                  </Label>
                  <Input
                    id="power_capacity"
                    value={fields.power_capacity ?? ""}
                    onChange={(e) => setField("power_capacity", e.target.value)}
                    placeholder="1000VA - 3000VA"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Proteksi */}
            <AccordionItem
              value="proteksi"
              className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
            >
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center justify-between w-full mr-2">
                  <div className="flex items-center gap-2 text-foreground">
                    <ShieldCheckIcon className="size-4 text-emerald-500" />
                    <span>Proteksi & Grounding</span>
                  </div>
                  {emptyProteksiCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                    >
                      {emptyProteksiCount}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="soft_fuse" className="flex items-center gap-1.5 text-xs font-semibold">
                      <ShieldCheckIcon className="size-3.5 text-emerald-500" />
                      Soft Fuse Protection
                    </Label>
                    <Input
                      id="soft_fuse"
                      value={fields.soft_fuse ?? ""}
                      onChange={(e) => setField("soft_fuse", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="hard_fuse" className="flex items-center gap-1.5 text-xs font-semibold">
                      <ShieldCheckIcon className="size-3.5 text-emerald-500" />
                      Hard Fuse Protection
                    </Label>
                    <Input
                      id="hard_fuse"
                      value={fields.hard_fuse ?? ""}
                      onChange={(e) => setField("hard_fuse", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ground_output" className="flex items-center gap-1.5 text-xs font-semibold">
                    <ShieldCheckIcon className="size-3.5 text-emerald-500" />
                    Ground Output
                  </Label>
                  <Input
                    id="ground_output"
                    value={fields.ground_output ?? ""}
                    onChange={(e) => setField("ground_output", e.target.value)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 4. Lokasi & Status */}
            <AccordionItem
              value="lokasi-status"
              className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
            >
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center gap-2 text-foreground">
                  <MapPinIcon className="size-4 text-primary" />
                  <span>Lokasi & Status</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="status" className="flex items-center gap-1.5 text-xs font-semibold">
                      <TagIcon className="size-3.5 text-primary" />
                      Status Produk
                    </Label>
                    <Select
                      value={fields.status}
                      onValueChange={(v) => setField("status", v as ProductRow["status"])}
                    >
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="current_client_id" className="flex items-center gap-1.5 text-xs font-semibold">
                      <MapPinIcon className="size-3.5 text-primary" />
                      Klien Pemegang
                    </Label>
                    <Select
                      value={fields.current_client_id || NO_SELECTION_VALUE}
                      onValueChange={(v) =>
                        setField("current_client_id", v === NO_SELECTION_VALUE ? null : v)
                      }
                    >
                      <SelectTrigger id="current_client_id" className="w-full">
                        <SelectValue placeholder="Pilih klien" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value={NO_SELECTION_VALUE}>— Tidak ada —</SelectItem>
                          {clients.map((c) => (
                            <SelectItem key={c.client_id} value={c.client_id}>
                              {c.client_name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Right Column: Photo Gallery Card */}
        <div className="space-y-6">
          <div className="bg-card border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                Foto Produk ({drawerImages.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-7 gap-1.5 text-xs rounded-lg"
              >
                {uploading ? (
                  <Loader2Icon className="size-3 animate-spin" />
                ) : (
                  <PlusIcon className="size-3" />
                )}
                Tambah Foto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleFileSelect}
              />
            </div>

            {drawerImages.length === 0 ? (
              <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground/60 bg-muted/20">
                <ImageIcon className="size-8 opacity-40" />
                <span className="text-xs">Belum ada foto</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {drawerImages.map((img, index) => (
                  <div
                    key={img.storagePath || index}
                    className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
                  >
                    <img
                      src={img.previewUrl ?? img.thumbUrl ?? ""}
                      alt={`Foto ${index + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(index)}
                      className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                      aria-label="Hapus foto"
                    >
                      <Trash2Icon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Action Bar at Bottom of Viewport ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-t px-6 py-3.5 shadow-2xl flex items-center justify-end gap-3">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Mode Edit: <span className="font-semibold text-foreground">{fields.product_name || "Produk"}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-xl px-5 text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="rounded-xl px-6 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckIcon className="size-3.5" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
