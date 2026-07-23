import * as React from "react";
import {
  UserIcon,
  MapPinIcon,
  FileTextIcon,
  PencilIcon,
  ArrowLeftIcon,
  UploadIcon,
  Trash2Icon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  MessageSquareIcon,
  Building2Icon,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClientInsert, ClientRow } from "@/types/database";

function getClientInitials(name: string): string {
  if (!name || !name.trim()) return "CL";
  const cleaned = name
    .trim()
    .replace(/^(PT\.?|CV\.?|UD\.?|PD\.?|TB\.?|FIRMA)\s+/i, "")
    .trim();
  if (!cleaned) return name.slice(0, 2).toUpperCase();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

interface ClientEditModeProps {
  editTarget: ClientRow | null;
  fields: ClientInsert;
  setField: <K extends keyof ClientInsert>(key: K, value: ClientInsert[K]) => void;
  avatarUrl: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAvatar: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ClientEditMode({
  editTarget,
  fields,
  setField,
  avatarUrl,
  fileInputRef,
  handleFileChange,
  handleRemoveAvatar,
  onSubmit,
  onCancel,
  isSubmitting,
}: ClientEditModeProps) {
  const emptyKontakCount = [
    fields.client_code,
    fields.customer_name,
    fields.customer_name_alias,
    fields.email,
    fields.phone_number,
    fields.whatsapp_number,
  ].filter((val) => !val || !String(val).trim()).length;

  const emptyLokasiCount = [
    fields.address,
    fields.city,
    fields.province,
    fields.postal_code,
  ].filter((val) => !val || !String(val).trim()).length;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 w-full space-y-6 pb-28">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserIcon className="size-5 text-primary" />
            {editTarget ? "Edit Detail Klien" : "Tambah Klien Baru"}
          </h2>
          {editTarget && (
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Kode Klien: <span className="font-semibold text-foreground">{editTarget.client_code}</span>
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5 rounded-xl">
          <ArrowLeftIcon className="size-3.5" />
          Batal
        </Button>
      </div>

      {/* 1. Client Avatar Editor Banner */}
      <div className="flex flex-col sm:flex-row items-center gap-5 bg-card border rounded-2xl p-5 shadow-2xs">
        <div className="relative size-[90px] rounded-full shrink-0 border-2 border-border/80 bg-muted/40 flex items-center justify-center group shadow-sm">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fields.customer_name || "Client Avatar"}
              className="size-[86px] rounded-full object-cover"
            />
          ) : (
            <div className="size-[86px] rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold tracking-wider select-none">
              {getClientInitials(fields.customer_name)}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform cursor-pointer border-2 border-background"
                title="Ubah foto profil"
              >
                <PencilIcon className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-xl">
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer gap-2"
              >
                <UploadIcon className="size-4" />
                <span>{avatarUrl ? "Ganti Foto Profil" : "Unggah Foto Profil"}</span>
              </DropdownMenuItem>
              {avatarUrl && (
                <DropdownMenuItem
                  onClick={handleRemoveAvatar}
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                  <span>Hapus Foto Profil</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-xl font-bold tracking-tight text-foreground truncate">
              {fields.customer_name || "Nama Pelanggan"}
            </h3>
            {fields.customer_name_alias && (
              <Badge variant="outline" className="text-xs">
                Alias: {fields.customer_name_alias}
              </Badge>
            )}
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {fields.client_code ? `Kode Klien: ${fields.client_code}` : "Klien Baru"}
          </p>
        </div>
      </div>

      {/* 2. Categorized Form Inputs using Accordions */}
      <Accordion
        type="multiple"
        defaultValue={["kontak", "lokasi", "lain-lain"]}
        className="w-full space-y-3"
      >
        {/* Section 1: Kontak & Identitas */}
        <AccordionItem
          value="kontak"
          className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
        >
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
            <div className="flex items-center justify-between w-full mr-2">
              <div className="flex items-center gap-2 text-foreground">
                <UserIcon className="size-4 text-primary" />
                <span>Kontak & Identitas Klien</span>
              </div>
              {emptyKontakCount > 0 && (
                <Badge
                  variant="secondary"
                  className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                >
                  {emptyKontakCount}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="client_code" className="flex items-center gap-1.5 text-xs font-semibold">
                  <Building2Icon className="size-3.5 text-primary" />
                  Kode Klien *
                </Label>
                <Input
                  id="client_code"
                  value={fields.client_code}
                  onChange={(e) => setField("client_code", e.target.value)}
                  placeholder="CLI-..."
                  disabled={!!editTarget}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer_name_alias" className="flex items-center gap-1.5 text-xs font-semibold">
                  <UserIcon className="size-3.5 text-primary" />
                  Nama Alias (Nickname)
                </Label>
                <Input
                  id="customer_name_alias"
                  value={fields.customer_name_alias ?? ""}
                  onChange={(e) => setField("customer_name_alias", e.target.value)}
                  placeholder="Alias / Nama Panggilan..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customer_name" className="flex items-center gap-1.5 text-xs font-semibold">
                <UserIcon className="size-3.5 text-primary" />
                Nama Pelanggan / Perusahaan *
              </Label>
              <Input
                id="customer_name"
                value={fields.customer_name}
                onChange={(e) => setField("customer_name", e.target.value)}
                placeholder="PT Wiraswasta Muda Indonesia"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-semibold">
                <MailIcon className="size-3.5 text-primary" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={fields.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="alamat@email.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone_number" className="flex items-center gap-1.5 text-xs font-semibold">
                  <PhoneIcon className="size-3.5 text-primary" />
                  No. Telepon
                </Label>
                <Input
                  id="phone_number"
                  value={fields.phone_number ?? ""}
                  onChange={(e) => setField("phone_number", e.target.value)}
                  placeholder="08..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="whatsapp_number" className="flex items-center gap-1.5 text-xs font-semibold">
                  <MessageSquareIcon className="size-3.5 text-emerald-500" />
                  No. WhatsApp
                </Label>
                <Input
                  id="whatsapp_number"
                  value={fields.whatsapp_number ?? ""}
                  onChange={(e) => setField("whatsapp_number", e.target.value)}
                  placeholder="08..."
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Lokasi & Alamat */}
        <AccordionItem
          value="lokasi"
          className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
        >
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
            <div className="flex items-center justify-between w-full mr-2">
              <div className="flex items-center gap-2 text-foreground">
                <MapPinIcon className="size-4 text-primary" />
                <span>Lokasi & Alamat Lengkap</span>
              </div>
              {emptyLokasiCount > 0 && (
                <Badge
                  variant="secondary"
                  className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                >
                  {emptyLokasiCount}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4 space-y-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address" className="flex items-center gap-1.5 text-xs font-semibold">
                <MapPinIcon className="size-3.5 text-primary" />
                Alamat Lengkap
              </Label>
              <Input
                id="address"
                value={fields.address ?? ""}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Jalan, No. Bangunan, RT/RW..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city" className="flex items-center gap-1.5 text-xs font-semibold">
                  <MapPinIcon className="size-3.5 text-primary" />
                  Kota
                </Label>
                <Input
                  id="city"
                  value={fields.city ?? ""}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="Jakarta"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="province" className="flex items-center gap-1.5 text-xs font-semibold">
                  <MapPinIcon className="size-3.5 text-primary" />
                  Provinsi
                </Label>
                <Input
                  id="province"
                  value={fields.province ?? ""}
                  onChange={(e) => setField("province", e.target.value)}
                  placeholder="DKI Jakarta"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="postal_code" className="flex items-center gap-1.5 text-xs font-semibold">
                  <MapPinIcon className="size-3.5 text-primary" />
                  Kode Pos
                </Label>
                <Input
                  id="postal_code"
                  value={fields.postal_code ?? ""}
                  onChange={(e) => setField("postal_code", e.target.value)}
                  placeholder="12345"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Catatan */}
        <AccordionItem
          value="lain-lain"
          className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
        >
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2 text-foreground">
              <FileTextIcon className="size-4 text-primary" />
              <span>Catatan Keterangan</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4 space-y-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes" className="flex items-center gap-1.5 text-xs font-semibold">
                <FileTextIcon className="size-3.5 text-primary" />
                Catatan
              </Label>
              <Input
                id="notes"
                value={fields.notes ?? ""}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Catatan tambahan mengenai klien..."
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ── Sticky Action Bar at Bottom of Viewport ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-t px-6 py-3.5 shadow-2xl flex items-center justify-end gap-3">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Mode Edit: <span className="font-semibold text-foreground">{fields.customer_name || "Klien"}</span>
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
