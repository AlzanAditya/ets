import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  QrCode,
  Search,
  ShieldCheck,
  Zap,
  Wrench,
  FileCheck2,
  Activity,
  ArrowRight,
  Package,
  Building2,
  Tag,
  BatteryCharging,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicHeader } from "./components/PublicHeader";
import { QrScannerModal } from "./components/QrScannerModal";
import { productsService, type ProductWithRelations } from "@/services/products.service";
import { toast } from "sonner";

export default function PublicLanding() {
  const navigate = useNavigate();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [searchSerial, setSearchSerial] = React.useState("");
  const [sampleProducts, setSampleProducts] = React.useState<ProductWithRelations[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(true);

  // Load sample real products from database
  React.useEffect(() => {
    let isMounted = true;
    async function loadSamples() {
      try {
        setLoadingProducts(true);
        const data = await productsService.getProducts();
        if (isMounted) {
          // Take first 3-6 products with serial numbers
          const valid = (data || []).filter((p) => p.serial_number);
          setSampleProducts(valid.slice(0, 3));
        }
      } catch (err) {
        console.warn("Could not load public sample products:", err);
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    }
    loadSamples();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = searchSerial.trim();
    if (!cleaned) {
      toast.error("Masukkan nomor seri produk");
      return;
    }
    navigate(`/p/${encodeURIComponent(cleaned)}`);
  };

  const handleScanSuccess = (serialNumber: string) => {
    if (serialNumber) {
      navigate(`/p/${encodeURIComponent(serialNumber)}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Public Header */}
      <PublicHeader />

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-16"
      >
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="relative rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 p-6 sm:p-12 overflow-hidden text-center shadow-2xl"
        >
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl mx-auto space-y-6 relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Verifikasi resmi ETS</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Scan QR. Akses Semua Informasi Produk.
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Cek spesifikasi, garansi, dokumentasi instalasi, dan riwayat maintenance produk Anda secara langsung.
            </p>

            {/* Primary Action Controls */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
              <Button
                onClick={() => setIsScannerOpen(true)}
                size="lg"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-6 rounded-2xl shadow-lg shadow-emerald-600/20 gap-2"
              >
                <QrCode className="h-5 w-5" />
                <span>Scan QR Code</span>
              </Button>

              <form
                onSubmit={handleSearchSubmit}
                className="w-full sm:w-auto flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl focus-within:border-emerald-500 transition-colors"
              >
                <Input
                  value={searchSerial}
                  onChange={(e) => setSearchSerial(e.target.value)}
                  placeholder="Ketik Serial Number..."
                  className="bg-transparent border-none text-zinc-100 placeholder:text-zinc-500 font-mono text-xs sm:text-sm focus-visible:ring-0 shadow-none px-3"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-4 py-2 rounded-xl shrink-0"
                >
                  <Search className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Cari</span>
                </Button>
              </form>
            </div>
          </div>

          {/* Benefits Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-10 sm:pt-12 border-t border-zinc-800/80 mt-10 text-left">
            <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-200">Spesifikasi Teknis</h3>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Voltase, kapasitas daya, frekuensi, &amp; detail komponen.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-200">Status Garansi</h3>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Masa berlaku garansi &amp; status pengawasan aktif.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-200">Dokumentasi Instalasi</h3>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Foto &amp; laporan pengerjaan pemasangan awal resmi.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1.5">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl w-fit">
                <Wrench className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-200">Dokumentasi Maintenance</h3>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Riwayat pemeliharaan berkala &amp; servis perangkat.
              </p>
            </div>

            <div className="col-span-2 md:col-span-1 p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1.5">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl w-fit">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-200">Riwayat Event</h3>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Log histori aktivitas &amp; timeline terverifikasi.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Featured Sample Products Section */}
        <motion.section
          initial={{ opacity: 0, filter: "blur(10px)", y: 12 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                <span>Contoh Produk Terverifikasi</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pilih salah satu sampel produk untuk melihat tampilan verifikasi publik
              </p>
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
              <span>Memuat contoh produk...</span>
            </div>
          ) : sampleProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center bg-zinc-900/30">
              <p className="text-xs text-zinc-400">Belum ada data produk tersedia di database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sampleProducts.map((prod, pIdx) => {
                const clientName = prod.client?.client_name || "Client ETS";
                const isMaintenance = prod.status === "maintenance";

                return (
                  <motion.div
                    key={prod.product_id}
                    initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.4 + pIdx * 0.16 }}
                    onClick={() => navigate(`/p/${prod.serial_number}`)}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900 p-5 space-y-4 cursor-pointer transition-all hover:border-emerald-500/50 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          Serial Number
                        </span>
                        <h3 className="font-mono font-bold text-base text-emerald-400 group-hover:text-emerald-300 transition-colors">
                          {prod.serial_number}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isMaintenance
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {isMaintenance ? "Maintenance" : "Bergaransi"}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-zinc-100 line-clamp-1">
                        {prod.product_name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                        <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="line-clamp-1">{clientName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
                      {prod.model && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium">
                          <Tag className="h-3 w-3 text-zinc-400" />
                          {prod.model}
                        </span>
                      )}
                      {prod.power_capacity && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium">
                          <BatteryCharging className="h-3 w-3 text-zinc-400" />
                          {prod.power_capacity}
                        </span>
                      )}
                      <div className="ml-auto text-emerald-400 group-hover:translate-x-1 transition-transform">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 bg-zinc-950 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center">
          <p>&copy; {new Date().getFullYear()} Electrical Tracking System (ETS). All rights reserved.</p>
        </div>
      </footer>

      {/* Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
