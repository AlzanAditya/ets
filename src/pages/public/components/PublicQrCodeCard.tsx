import * as React from "react";
import { QrCode, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PublicQrCodeCardProps {
  serialNumber: string;
  productName: string;
}

export function PublicQrCodeCard({ serialNumber, productName }: PublicQrCodeCardProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Full public URL for scanning
  const publicUrl = `https://ets.zanxa.studio/p/${serialNumber}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    publicUrl
  )}`;

  const handleDownload = async () => {
    setIsDownloading(true);
    const toastId = toast.loading("Mempersiapkan berkas QR Code...");
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QRCode_ETS_${serialNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Berhasil mengunduh QR Code", { id: toastId });
    } catch (err: any) {
      console.error("QR download error:", err);
      toast.error("Gagal mengunduh QR Code", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-xl space-y-4 text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
            Kode QR Resmi Aset Produk
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
          <ShieldCheck className="h-3 w-3" />
          Terverifikasi System
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 pt-1">
        {/* QR Code Graphic Frame */}
        <div className="relative p-3 bg-white rounded-2xl shadow-inner border-2 border-zinc-700 shrink-0">
          <img
            src={qrImageUrl}
            alt={`QR Code ${serialNumber}`}
            className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
          />
        </div>

        {/* Info & Actions */}
        <div className="space-y-3 flex-1 text-center sm:text-left">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Serial Number (SN)
            </span>
            <h4 className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
              {serialNumber}
            </h4>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
              {productName}
            </p>
          </div>

          <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 rounded-xl shadow-md"
            >
              <Download className="h-4 w-4" />
              <span>{isDownloading ? "Mengunduh..." : "Unduh Kode QR"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(publicUrl, "_blank")}
              className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs gap-1.5 rounded-xl"
            >
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
              <span>Buka Link Publik</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
