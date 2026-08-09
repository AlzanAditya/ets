import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { QrCode, Camera, Upload, Search, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (serialNumber: string) => void;
}

export function QrScannerModal({ isOpen, onClose, onScanSuccess }: QrScannerModalProps) {
  const [activeTab, setActiveTab] = React.useState<"camera" | "file" | "manual">("camera");
  const [manualSerial, setManualSerial] = React.useState("");
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = React.useState(false);

  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "public-qr-reader";

  // Extract serial number from raw QR text or URL
  const extractSerialNumber = (rawText: string): string => {
    const trimmed = rawText.trim();
    if (!trimmed) return "";

    // Check if full URL containing /p/:serial
    const urlMatch = trimmed.match(/\/p\/([A-Za-z0-9_-]+)/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }

    // Otherwise return clean string as serial number
    return trimmed;
  };

  const handleDetectedCode = React.useCallback(
    (decodedText: string) => {
      const serial = extractSerialNumber(decodedText);
      if (serial) {
        toast.success(`QR Code terdeteksi: ${serial}`);
        stopCameraScanner();
        onScanSuccess(serial);
        onClose();
      } else {
        toast.error("Kode QR tidak valid");
      }
    },
    [onScanSuccess, onClose]
  );

  // Stop camera scanner
  const stopCameraScanner = React.useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Failed to stop scanner:", err);
      } finally {
        scannerRef.current = null;
        setIsCameraActive(false);
      }
    }
  }, []);

  // Start camera scanner
  const startCameraScanner = React.useCallback(async () => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        await stopCameraScanner();
      }

      const html5Qrcode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5Qrcode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5Qrcode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        () => {
          // Ignore frame decode errors during active scanning
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera scanner error:", err);
      setCameraError(
        err?.message || "Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan."
      );
      setIsCameraActive(false);
    }
  }, [handleDetectedCode, stopCameraScanner]);

  // Effect to handle modal lifecycle and camera start/stop
  React.useEffect(() => {
    if (isOpen && activeTab === "camera") {
      // Delay slightly to ensure DOM element is mounted
      const timer = setTimeout(() => {
        startCameraScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCameraScanner();
      };
    } else {
      stopCameraScanner();
    }
  }, [isOpen, activeTab, startCameraScanner, stopCameraScanner]);

  // Handle file upload scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const html5Qrcode = new Html5Qrcode("file-qr-temp", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      const result = await html5Qrcode.scanFileV2(file, true);
      if (result && result.decodedText) {
        handleDetectedCode(result.decodedText);
      } else {
        toast.error("Kode QR tidak ditemukan pada gambar ini.");
      }
      html5Qrcode.clear();
    } catch (err: any) {
      console.error("File scan error:", err);
      toast.error("Gagal memindai gambar. Pastikan gambar memuat QR code yang jelas.");
    } finally {
      setIsProcessingFile(false);
      e.target.value = "";
    }
  };

  // Handle manual submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const serial = extractSerialNumber(manualSerial);
    if (!serial) {
      toast.error("Silakan masukkan Nomor Seri atau URL QR yang valid");
      return;
    }
    onScanSuccess(serial);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && (stopCameraScanner(), onClose())}>
      <DialogContent className="max-w-md w-[95vw] rounded-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-6 shadow-2xl overflow-hidden">
        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95, y: 8 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                <QrCode className="h-5 w-5 text-emerald-500" />
                <span>Pemindai QR Code Produk</span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-400">
              Arahkan kamera ke QR Code produk atau unggah gambar untuk verifikasi otomatis.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Selection */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl my-2">
            <button
              type="button"
              onClick={() => setActiveTab("camera")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "camera"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Kamera</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "file"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Unggah</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "manual"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Manual</span>
            </button>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "camera" && (
              <motion.div
                key="tab-camera"
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <div id={scannerContainerId} className="w-full h-full" />

                  {!isCameraActive && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-zinc-950/90 z-10">
                      <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-2" />
                      <p className="text-xs text-zinc-300 font-medium">Menyiapkan Kamera...</p>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/95 z-10 space-y-3">
                      <AlertCircle className="h-8 w-8 text-amber-500" />
                      <p className="text-xs text-zinc-300">{cameraError}</p>
                      <Button
                        size="sm"
                        onClick={startCameraScanner}
                        className="bg-zinc-800 hover:bg-zinc-700 text-xs gap-1.5 text-zinc-200 rounded-xl"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Coba Lagi
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-center text-zinc-400">
                  Posisikan QR Code di tengah area pemindaian.
                </p>
              </motion.div>
            )}

            {activeTab === "file" && (
              <motion.div
                key="tab-file"
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.25 }}
                className="py-4 space-y-4"
              >
                <div id="file-qr-temp" className="hidden" />
                <label className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-zinc-800 hover:border-emerald-500 bg-zinc-900/50 hover:bg-zinc-900/80 cursor-pointer transition-all p-6 text-center group">
                  {isProcessingFile ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-2" />
                      <span className="text-xs text-zinc-300 font-medium">Memindai berkas gambar...</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-zinc-800 rounded-2xl mb-3 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Upload className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold text-zinc-200">Klik untuk Unggah Foto QR</span>
                      <span className="text-xs text-zinc-400 mt-1">Format PNG, JPG, JPEG, WebP</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={isProcessingFile}
                    onChange={handleFileUpload}
                  />
                </label>
              </motion.div>
            )}

            {activeTab === "manual" && (
              <motion.form
                key="tab-manual"
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.25 }}
                onSubmit={handleManualSubmit}
                className="py-4 space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Nomor Seri / Link QR Produk
                  </label>
                  <Input
                    value={manualSerial}
                    onChange={(e) => setManualSerial(e.target.value)}
                    placeholder="Contoh: UPS-00001234"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 rounded-xl font-mono text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-xl shadow-md"
                >
                  Cari &amp; Buka Informasi Produk
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export default QrScannerModal;
