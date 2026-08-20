import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  QrCode,
  Search,
  ShieldCheck,
  Zap,
  Camera,
  FileText,
  UserRound,
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
import { ThemeToggle } from "@/components/theme-toggle";
import { formatSerialNumber } from "@/lib/utils";
import { productsService, type ProductWithRelations } from "@/services/products.service";
import { publicCache } from "@/lib/public-cache";
import { toast } from "sonner";
import { CLIENT_IDENTITY } from "@/config/client-identity";

const QrScannerModal = React.lazy(() => import("./components/QrScannerModal"));

export default function PublicLanding() {
  const navigate = useNavigate();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [searchSerial, setSearchSerial] = React.useState("");
  const [sampleProducts, setSampleProducts] = React.useState<ProductWithRelations[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(true);

  // Reset scroll position on mount
  React.useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // Load sample real products from database with cache
  React.useEffect(() => {
    let isMounted = true;
    async function loadSamples() {
      const cacheKey = "landing_sample_products";
      const cachedSamples = publicCache.get<ProductWithRelations[]>(cacheKey);

      if (cachedSamples && cachedSamples.length > 0) {
        if (isMounted) {
          setSampleProducts(cachedSamples);
          setLoadingProducts(false);
        }
      } else {
        if (isMounted) setLoadingProducts(true);
      }

      try {
        const data = await productsService.getProducts();
        if (isMounted) {
          // Take first 3 products with serial numbers
          const valid = (data || []).filter((p) => p.serial_number);
          const sliced = valid.slice(0, 3);
          setSampleProducts(sliced);
          publicCache.set(cacheKey, sliced);

          // Pre-cache individual products by serial number for instant navigation
          sliced.forEach((p) => {
            if (p.serial_number) {
              publicCache.set(`public_product_${p.serial_number}`, p);
            }
          });
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
    const cleaned = formatSerialNumber(searchSerial);
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* Public Header */}
      <PublicHeader
        rightAction={
          <div className="flex items-center gap-1 sm:gap-1.5">
            <ThemeToggle />
            <Link
              to="/login"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-slate-200/70 dark:hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-border"
              title="Login"
              aria-label="Login"
            >
              <UserRound className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </div>
        }
      />

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
          className="relative rounded-3xl border border-border bg-gradient-to-b from-card via-card/90 to-background dark:from-zinc-900/90 dark:via-zinc-950 dark:to-zinc-950 p-6 sm:p-12 overflow-hidden text-center shadow-xl dark:shadow-2xl"
        >
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl mx-auto space-y-6 relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Verifikasi resmi {CLIENT_IDENTITY.shortName}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              <span className="block sm:inline">Scan Sekali.</span>{" "}
              <span>Akses Semua Informasi.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Cek spesifikasi, garansi, dokumentasi instalasi, dan riwayat maintenance produk Anda secara langsung.
            </p>

            {/* Primary Action Controls */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
              <Button
                onClick={() => setIsScannerOpen(true)}
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-emerald-600 text-white font-bold text-sm px-6 py-6 rounded-2xl shadow-lg shadow-primary/20 gap-2"
              >
                <QrCode className="h-5 w-5" />
                <span>Scan QR Code</span>
              </Button>

              <form
                onSubmit={handleSearchSubmit}
                className="w-full sm:w-auto flex-1 flex items-center gap-2 bg-card border border-border p-1.5 rounded-2xl focus-within:border-primary transition-colors shadow-xs"
              >
                <Input
                  value={searchSerial}
                  onChange={(e) => setSearchSerial(formatSerialNumber(e.target.value))}
                  placeholder="Ketik Serial Number..."
                  className="bg-transparent border-none text-foreground placeholder:text-muted-foreground font-mono text-xs sm:text-sm focus-visible:ring-0 shadow-none px-3"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold px-4 py-2 rounded-xl shrink-0"
                >
                  <Search className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Cari</span>
                </Button>
              </form>
            </div>
          </div>

          {/* Benefits Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-10 sm:pt-12 border-t border-border mt-10 text-left">
            <div className="p-3.5 rounded-2xl border border-border bg-card/80 dark:bg-zinc-900/60 space-y-1.5 shadow-xs">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-foreground">Spesifikasi Teknis</h3>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Voltase, kapasitas daya, frekuensi, &amp; detail komponen.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-border bg-card/80 dark:bg-zinc-900/60 space-y-1.5 shadow-xs">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-foreground">Status Garansi</h3>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Masa berlaku garansi &amp; status pengawasan aktif.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-border bg-card/80 dark:bg-zinc-900/60 space-y-1.5 shadow-xs">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit">
                <Camera className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-foreground">Dokumentasi</h3>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Foto dokumentasi unit, instalasi, &amp; kondisi fisik perangkat.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-border bg-card/80 dark:bg-zinc-900/60 space-y-1.5 shadow-xs">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl w-fit">
                <FileText className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-foreground">Laporan Produk</h3>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Laporan maintenance, inspeksi berkala, &amp; riwayat servis.
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
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span>Contoh Produk Terverifikasi</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pilih salah satu sampel produk untuk melihat tampilan verifikasi publik
              </p>
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Memuat contoh produk...</span>
            </div>
          ) : sampleProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-muted/30">
              <p className="text-xs text-muted-foreground">Belum ada data produk tersedia di database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sampleProducts.map((prod, pIdx) => {
                const clientName = prod.client?.client_name || `Client ${CLIENT_IDENTITY.shortName}`;
                const isMaintenance = prod.status === "maintenance";

                return (
                  <motion.div
                    key={prod.product_id}
                    initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.4 + pIdx * 0.16 }}
                    onClick={() => navigate(`/p/${prod.serial_number}`)}
                    className="group rounded-2xl border border-border bg-card dark:bg-zinc-900/80 hover:bg-slate-50 dark:hover:bg-zinc-900 p-5 space-y-4 cursor-pointer transition-all hover:border-primary/50 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Serial Number
                        </span>
                        <h3 className="font-mono font-bold text-base text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                          {prod.serial_number}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isMaintenance
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {isMaintenance ? "Maintenance" : "Bergaransi"}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-foreground line-clamp-1">
                        {prod.product_name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground/80" />
                        <span className="line-clamp-1">{clientName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border text-[11px]">
                      {prod.model && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-foreground font-medium">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {prod.model}
                        </span>
                      )}
                      {prod.power_capacity && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-foreground font-medium">
                          <BatteryCharging className="h-3 w-3 text-muted-foreground" />
                          {prod.power_capacity}
                        </span>
                      )}
                      <div className="ml-auto text-primary group-hover:translate-x-1 transition-transform">
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
      <footer className="border-t border-border py-6 bg-background dark:bg-zinc-950 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center">
          <p>&copy; {new Date().getFullYear()} {CLIENT_IDENTITY.fullName} ({CLIENT_IDENTITY.shortName}). All rights reserved.</p>
        </div>
      </footer>

      {/* Scanner Modal */}
      <React.Suspense fallback={null}>
        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      </React.Suspense>
    </div>
  );
}
