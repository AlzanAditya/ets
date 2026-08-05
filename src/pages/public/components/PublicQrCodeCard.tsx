import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PublicQrCodeCardProps {
  serialNumber: string;
  productName: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function PublicQrCodeCard({
  serialNumber,
  productName,
  isExpanded: externalIsExpanded,
  onToggleExpand,
}: PublicQrCodeCardProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [internalIsExpanded, setInternalIsExpanded] = React.useState(true);

  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalIsExpanded((prev) => !prev);
    }
  };

  // Full public URL for scanning
  const publicUrl = `${window.location.origin}/p/${serialNumber}`;
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

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("URL berhasil disalin ke clipboard!");
    } catch (err) {
      console.error("Failed to copy URL:", err);
      toast.error("Gagal menyalin URL");
    }
  };

  return (
    <motion.div
      id="kode-qr"
      initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-xl space-y-3 text-zinc-100 scroll-mt-16"
    >
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between text-left focus:outline-none group cursor-pointer select-none py-1 pl-1"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 group-hover:text-emerald-400 transition-colors">
          KODE QR
        </h3>
        <div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(6px)", height: 0 }}
            animate={{ opacity: 1, filter: "blur(0px)", height: "auto" }}
            exit={{ opacity: 0, filter: "blur(6px)", height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-row items-center gap-4 pt-1 text-left">
              {/* QR Code Graphic Frame (60% smaller size) */}
              <div className="relative p-2 bg-white rounded-xl shadow-inner border border-zinc-700 shrink-0">
                <img
                  src={qrImageUrl}
                  alt={`QR Code ${serialNumber}`}
                  className="w-22 h-22 sm:w-24 sm:h-24 object-contain"
                />
              </div>

              {/* Info & Actions */}
              <div className="space-y-2 flex-1 min-w-0 text-left">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block">
                    Serial Number (SN)
                  </span>
                  <h4 className="text-base sm:text-lg font-mono font-bold text-emerald-400 mt-0.5 truncate">
                    {serialNumber}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                    {productName}
                  </p>
                </div>

                <div className="pt-0.5 flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 hover:text-white text-[11px] h-7 px-2.5 gap-1 rounded-lg"
                  >
                    <Copy className="h-3 w-3 text-zinc-400" />
                    <span>URL</span>
                  </Button>

                  <Button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] h-7 px-2.5 gap-1 rounded-lg shadow-sm"
                  >
                    <Download className="h-3 w-3" />
                    <span>{isDownloading ? "..." : "Unduh QR"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

