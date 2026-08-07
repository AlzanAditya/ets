import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Package,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { productsService, type ProductWithRelations } from "@/services/products.service";
import type { StickerItem } from "@/types/sticker";

interface ProductSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProducts: (items: StickerItem[]) => void;
}

export const ProductSelectDialog: React.FC<ProductSelectDialogProps> = ({
  open,
  onOpenChange,
  onSelectProducts,
}) => {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch products when dialog opens
  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productsService.getProducts({ limit: 100 });
      setProducts(data);
    } catch (err) {
      console.error("Gagal memuat daftar produk:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.product_name?.toLowerCase().includes(term) ||
        p.serial_number?.toLowerCase().includes(term) ||
        p.product_code?.toLowerCase().includes(term) ||
        p.model?.toLowerCase().includes(term) ||
        (p as any).capacity?.toLowerCase().includes(term) ||
        (p as any).power_rating?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.product_id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleApply = () => {
    const selectedList = products.filter((p) => selectedIds.has(p.product_id));
    if (selectedList.length === 0) return;

    const stickerItems: StickerItem[] = selectedList.map((p) => {
      return {
        id: p.product_id,
        productName: p.product_name || "ETS Product",
        serialNo: p.serial_number || "SN-UNKNOWN",
        capacity: (p as any).capacity || (p as any).power_rating || "5000 VA / 5 KVA",
        prodNo: (p as any).prod_no || p.product_code || "B312D-00004",
        voltage: (p as any).voltage || "AC 220V",
        frequency: (p as any).frequency || "50 Hz",
        model: p.model || "AIZ",
      };
    });

    onSelectProducts(stickerItems);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <Package className="h-4 w-4" />
            Integrasi Admin Products
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Pilih Produk untuk Cetak Stiker
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Pilih satu atau lebih produk dari database produk untuk dimasukkan ke dalam antrean cetak stiker A4.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 bg-background">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, serial number, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              disabled={filteredProducts.length === 0}
              className="h-8 text-xs font-medium"
            >
              {selectedIds.size === filteredProducts.length && filteredProducts.length > 0
                ? "Batal Pilih Semua"
                : `Pilih Semua (${filteredProducts.length})`}
            </Button>
            <Badge variant="secondary" className="h-8 px-3 font-semibold text-xs">
              {selectedIds.size} Produk Dipilih
            </Badge>
          </div>
        </div>

        {/* Products Table List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[250px] max-h-[420px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs">Memuat daftar produk dari database...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Tidak ada produk yang ditemukan</p>
              <p className="text-xs text-muted-foreground">
                Coba ubah kata kunci pencarian atau pastikan produk sudah terdaftar di Admin Products.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredProducts.map((prod) => {
                const isSelected = selectedIds.has(prod.product_id);
                return (
                  <div
                    key={prod.product_id}
                    onClick={() => toggleSelectOne(prod.product_id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary/80 bg-primary/10 shadow-xs"
                        : "border-border/60 bg-card hover:border-primary/40 hover:bg-accent/40"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectOne(prod.product_id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          {prod.product_name}
                        </span>
                        <Badge
                          variant={prod.status === "warranty" ? "default" : "outline"}
                          className="text-[10px] px-1.5 py-0 capitalize shrink-0"
                        >
                          {prod.status || "active"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground font-mono">
                        <span className="text-primary font-semibold">
                          SN: {prod.serial_number}
                        </span>
                        {prod.model && (
                          <span className="text-muted-foreground">| Model: {prod.model}</span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground flex items-center justify-between">
                        <span>{(prod as any).capacity || (prod as any).power_rating || "5000 VA / 5 KVA"}</span>
                        {prod.client?.client_name && (
                          <span className="truncate max-w-[140px]">
                            Klien: {prod.client.client_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Stiker akan otomatis diperbarui dengan data produk yang Anda pilih.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={selectedIds.size === 0}
              className="text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Gunakan {selectedIds.size} Produk
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
