import * as React from "react";
import { 
  ImageIcon, 
  Loader2Icon, 
  ImageOffIcon, 
  LayersIcon, 
  CalendarIcon, 
  FileTextIcon, 
  FolderIcon,
  XIcon,
  Maximize2Icon
} from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { getSignedUrls } from "@/lib/image-service";
import { MetricCards } from "@/components/metric-cards";
import { PageContent } from "@/components/page-content";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MetricCardItem } from "@/types/metrics";
import { cn } from "@/lib/utils";

// ─── SafeImage Component (Task 6) ──────────────────────────────────────────────
interface SafeImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
}

function SafeImage({ src, alt, className }: SafeImageProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!src) {
      setLoading(false);
      setError(true);
    } else {
      // Reset state if src changes
      setLoading(true);
      setError(false);
    }
  }, [src]);

  if (!src || error) {
    return (
      <div className="flex flex-col items-center justify-center bg-muted text-muted-foreground w-full h-full rounded-lg p-4 border border-dashed border-muted-foreground/20 min-h-[140px] select-none">
        <ImageOffIcon className="size-6 text-muted-foreground/30 mb-2" />
        <span className="text-[10px] text-muted-foreground/50 font-medium">Gambar Tidak Tersedia</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg bg-muted border min-h-[140px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Skeleton className="absolute inset-0 w-full h-full rounded-lg" />
          <Loader2Icon className="size-5 text-muted-foreground/30 animate-spin z-10" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-all duration-500 ease-out hover:scale-105",
          loading ? "opacity-0 scale-95" : "opacity-100 scale-100",
          className
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

// ─── Main Page Component (Task 5) ──────────────────────────────────────────────
export default function ImagesPage() {
  // Fetch active products (excludes retired by default)
  const { data: activeProducts, loading: activeLoading } = useProducts({ limit: 150 });
  
  // Fetch retired products
  const { data: retiredProducts, loading: retiredLoading } = useProducts({ status: "retired", limit: 150 });

  const [urls, setUrls] = React.useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<string>("active");
  
  // Lightbox Modal state
  const [selectedImage, setSelectedImage] = React.useState<{
    url: string;
    productName: string;
    serialNumber: string;
    fileName: string | null;
    fileSize: number | null;
    width: number | null;
    height: number | null;
    uploadedAt: string;
  } | null>(null);

  // Filter products that actually contain images
  const activeWithImages = React.useMemo(() => {
    return activeProducts.filter((p) => p.images && p.images.length > 0);
  }, [activeProducts]);

  const retiredWithImages = React.useMemo(() => {
    return retiredProducts.filter((p) => p.images && p.images.length > 0);
  }, [retiredProducts]);

  // Bulk resolve signed URLs
  React.useEffect(() => {
    const allPaths = [
      ...activeWithImages.flatMap((p) => p.images?.map((img) => img.thumbnail_path ?? img.storage_path) ?? []),
      ...retiredWithImages.flatMap((p) => p.images?.map((img) => img.thumbnail_path ?? img.storage_path) ?? []),
      // Add full resolution paths in case we open lightbox
      ...activeWithImages.flatMap((p) => p.images?.map((img) => img.storage_path) ?? []),
      ...retiredWithImages.flatMap((p) => p.images?.map((img) => img.storage_path) ?? []),
    ];

    const uniquePaths = Array.from(new Set(allPaths)).filter(Boolean);

    if (uniquePaths.length === 0) {
      if (!activeLoading && !retiredLoading) {
        setLoadingUrls(false);
      }
      return;
    }

    setLoadingUrls(true);
    getSignedUrls(uniquePaths)
      .then((res) => {
        setUrls((prev) => ({ ...prev, ...res }));
      })
      .catch((err) => {
        console.error("Failed to resolve signed URLs:", err);
      })
      .finally(() => {
        setLoadingUrls(false);
      });
  }, [activeWithImages, retiredWithImages, activeLoading, retiredLoading]);

  // Statistics calculation
  const totalActiveImages = React.useMemo(() => {
    return activeWithImages.reduce((sum, p) => sum + (p.images?.length ?? 0), 0);
  }, [activeWithImages]);

  const totalRetiredImages = React.useMemo(() => {
    return retiredWithImages.reduce((sum, p) => sum + (p.images?.length ?? 0), 0);
  }, [retiredWithImages]);

  const totalImages = totalActiveImages + totalRetiredImages;

  const metrics: MetricCardItem[] = [
    {
      label: "Total Gambar",
      value: totalImages.toString(),
      delta: "+0%",
      trend: "up",
      summary: "Semua aset visual",
      description: "Jumlah total berkas gambar terdaftar",
      icon: ImageIcon,
      status: "info",
    },
    {
      label: "Gambar Produk Aktif",
      value: totalActiveImages.toString(),
      delta: "+0%",
      trend: "up",
      summary: "Produk operasional",
      description: "Gambar pada produk berstatus aktif/gudang/klien",
      icon: ImageIcon,
      status: "success",
    },
    {
      label: "Gambar Produk Pensiun",
      value: totalRetiredImages.toString(),
      delta: "+0%",
      trend: "up",
      summary: "Aset kearsipan",
      description: "Gambar pada produk berstatus pensiun (retired)",
      icon: ImageIcon,
      status: "danger",
    },
  ];

  const isLoading = activeLoading || retiredLoading || loadingUrls;

  // Format file size helper
  const formatBytes = (bytes: number | null) => {
    if (bytes === null || bytes === undefined) return "—";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <PageContent
      description="Manajemen koleksi aset visual dan media produk perusahaan terstruktur dengan rapi."
      eyebrow="Media"
      title="Galeri Gambar Produk"
    >
      <MetricCards items={metrics} />

      <div className="px-4 lg:px-6 mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between border-b pb-2 mb-6">
            <TabsList className="bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="active" className="text-xs sm:text-sm px-4 py-2 flex items-center gap-1.5">
                <LayersIcon className="size-3.5 text-emerald-500" />
                <span>Produk Aktif</span>
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none">
                  {activeWithImages.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="retired" className="text-xs sm:text-sm px-4 py-2 flex items-center gap-1.5">
                <XIcon className="size-3.5 text-destructive" />
                <span>Produk Pensiun (Retired)</span>
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-destructive/10 text-destructive border-none">
                  {retiredWithImages.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <span className="text-xs text-muted-foreground hidden sm:inline">
              Menampilkan {activeTab === "active" ? activeWithImages.length : retiredWithImages.length} item produk ber-gambar
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2Icon className="size-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse">Memuat galeri & memverifikasi tautan media...</p>
            </div>
          ) : (
            <>
              {/* Tab Produk Aktif */}
              <TabsContent value="active" className="space-y-8 outline-none">
                {activeWithImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-card/40 text-center p-6">
                    <ImageIcon className="size-12 text-muted-foreground/30 mb-3 animate-pulse" />
                    <h3 className="text-sm font-semibold text-foreground">Tidak Ada Gambar Produk Aktif</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      Belum ada gambar yang diunggah untuk produk aktif operasional. Silakan unggah gambar melalui halaman Produk.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {activeWithImages.map((product) => (
                      <Card key={product.product_id} className="border bg-card/35 backdrop-blur-xs shadow-xs hover:shadow-md transition-all">
                        <CardHeader className="pb-3 border-b border-muted/40 bg-muted/20 px-4 py-3 flex flex-row items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-[10px] font-bold text-primary tracking-wider uppercase">
                              {product.nomor_seri}
                            </span>
                            <CardTitle className="text-sm font-semibold leading-none text-foreground mt-0.5">
                              {product.nama_produk}
                            </CardTitle>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5 capitalize bg-background font-medium">
                            {product.category || "General"}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-3 gap-2">
                            {product.images?.map((img) => {
                              const thumbUrl = urls[img.thumbnail_path ?? img.storage_path];
                              const fullUrl = urls[img.storage_path];
                              return (
                                <div 
                                  key={img.id} 
                                  className="group relative aspect-square cursor-zoom-in rounded-lg overflow-hidden border border-muted/50 bg-muted/30"
                                  onClick={() => setSelectedImage({
                                    url: fullUrl || thumbUrl,
                                    productName: product.nama_produk,
                                    serialNumber: product.nomor_seri,
                                    fileName: img.file_name,
                                    fileSize: img.file_size,
                                    width: img.width,
                                    height: img.height,
                                    uploadedAt: img.created_at,
                                  })}
                                >
                                  <SafeImage src={thumbUrl} alt={img.file_name || product.nama_produk} />
                                  
                                  {/* Hover overlay details */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2 text-[9px] text-white">
                                    <span className="font-mono truncate">{img.file_name || "image.webp"}</span>
                                    <div className="flex items-center justify-between">
                                      <span>{formatBytes(img.file_size)}</span>
                                      <Maximize2Icon className="size-3 text-white/80" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab Produk Pensiun (Retired) */}
              <TabsContent value="retired" className="space-y-8 outline-none">
                {retiredWithImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-card/40 text-center p-6">
                    <ImageIcon className="size-12 text-muted-foreground/30 mb-3 animate-pulse" />
                    <h3 className="text-sm font-semibold text-foreground">Tidak Ada Gambar Produk Pensiun</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      Belum ada aset gambar tersimpan untuk produk-produk berstatus pensiun (retired).
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {retiredWithImages.map((product) => (
                      <Card key={product.product_id} className="border border-destructive/10 bg-destructive/[0.01] backdrop-blur-xs shadow-xs hover:shadow-md transition-all">
                        <CardHeader className="pb-3 border-b border-destructive/10 bg-destructive/[0.03] px-4 py-3 flex flex-row items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-[10px] font-bold text-destructive tracking-wider uppercase">
                              {product.nomor_seri}
                            </span>
                            <CardTitle className="text-sm font-semibold leading-none text-foreground mt-0.5">
                              {product.nama_produk}
                            </CardTitle>
                          </div>
                          <Badge variant="destructive" className="text-[10px] h-5 uppercase font-medium bg-destructive/10 text-destructive border-none">
                            RETIRED
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-3 gap-2">
                            {product.images?.map((img) => {
                              const thumbUrl = urls[img.thumbnail_path ?? img.storage_path];
                              const fullUrl = urls[img.storage_path];
                              return (
                                <div 
                                  key={img.id} 
                                  className="group relative aspect-square cursor-zoom-in rounded-lg overflow-hidden border border-muted/50 bg-muted/30"
                                  onClick={() => setSelectedImage({
                                    url: fullUrl || thumbUrl,
                                    productName: product.nama_produk,
                                    serialNumber: product.nomor_seri,
                                    fileName: img.file_name,
                                    fileSize: img.file_size,
                                    width: img.width,
                                    height: img.height,
                                    uploadedAt: img.created_at,
                                  })}
                                >
                                  <SafeImage src={thumbUrl} alt={img.file_name || product.nama_produk} />
                                  
                                  {/* Hover overlay details */}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2 text-[9px] text-white">
                                    <span className="font-mono truncate">{img.file_name || "image.webp"}</span>
                                    <div className="flex items-center justify-between">
                                      <span>{formatBytes(img.file_size)}</span>
                                      <Maximize2Icon className="size-3 text-white/80" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* ─── Premium Lightbox Modal ─────────────────────────────────────────────────── */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-card border rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              type="button" 
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 z-10 bg-background/50 hover:bg-background/80 text-foreground p-1.5 rounded-full hover:scale-105 transition-all duration-150"
              title="Tutup Pratinjau"
            >
              <XIcon className="size-4" />
            </button>

            {/* Image Area */}
            <div className="flex-1 bg-black flex items-center justify-center p-2 min-h-[300px] md:min-h-[450px]">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.productName} 
                className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Meta Details Area */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l bg-card p-5 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                    {selectedImage.serialNumber}
                  </span>
                  <h3 className="text-base font-bold text-foreground leading-tight">
                    {selectedImage.productName}
                  </h3>
                </div>

                <hr className="border-muted/50" />

                <div className="space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <FolderIcon className="size-3.5" /> Detail Berkas
                  </span>
                  
                  <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <FileTextIcon className="size-3 text-muted-foreground/50" />
                      Nama Berkas
                    </div>
                    <div className="font-mono text-foreground font-medium truncate text-right" title={selectedImage.fileName || "—"}>
                      {selectedImage.fileName || "—"}
                    </div>

                    <div className="text-muted-foreground flex items-center gap-1">
                      <LayersIcon className="size-3 text-muted-foreground/50" />
                      Ukuran Berkas
                    </div>
                    <div className="text-foreground font-medium text-right">
                      {formatBytes(selectedImage.fileSize)}
                    </div>

                    <div className="text-muted-foreground flex items-center gap-1">
                      <Maximize2Icon className="size-3 text-muted-foreground/50" />
                      Resolusi
                    </div>
                    <div className="text-foreground font-medium text-right">
                      {selectedImage.width && selectedImage.height 
                        ? `${selectedImage.width} × ${selectedImage.height} px` 
                        : "—"}
                    </div>

                    <div className="text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="size-3 text-muted-foreground/50" />
                      Diunggah Pada
                    </div>
                    <div className="text-foreground font-medium text-right">
                      {selectedImage.uploadedAt 
                        ? new Date(selectedImage.uploadedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 md:pt-0">
                <button 
                  type="button" 
                  onClick={() => setSelectedImage(null)}
                  className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs py-2.5 rounded-xl hover:shadow-lg transition-all duration-150 cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContent>
  );
}
