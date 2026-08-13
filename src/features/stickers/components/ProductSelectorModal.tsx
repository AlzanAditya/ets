import React, { useState, useMemo } from 'react';
import { useProducts } from '@/hooks/use-products';
import { ProductWithRelations } from '@/services/products.service';
import { StickerData } from '../types';
import { Search, Check, X, Package, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProducts: (stickers: StickerData[]) => void;
  selectedSerialNos: string[];
}

export function mapProductToStickerData(product: ProductWithRelations): StickerData {
  return {
    id: product.product_id,
    productName: product.product_name || 'ETS-5.000.AIZ',
    serialNo: (product.serial_number || '').replace(/\s+/g, ''),
    capacity: product.power_capacity || '5000 VA / 5 KVA',
    prodNo: product.product_code || 'B312D-00004',
    voltage: product.input_voltage || product.output_voltage || 'AC 220V',
    frequency: product.frequency || '50 Hz',
    model: product.model || product.model_code || 'AIZ',
    clientName: product.client?.client_name || undefined,
  };
}

export const ProductSelectorModal: React.FC<ProductSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectProducts,
  selectedSerialNos,
}) => {
  const { data: products, loading, error } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sync internal selectedIds when modal opens or selectedSerialNos change
  React.useEffect(() => {
    if (isOpen && products.length > 0) {
      const initialSelected = products
        .filter((p) => selectedSerialNos.includes(p.serial_number.replace(/\s+/g, '')))
        .map((p) => p.product_id);
      setSelectedIds(initialSelected);
    }
  }, [isOpen, products, selectedSerialNos]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.product_name.toLowerCase().includes(term) ||
        p.serial_number.toLowerCase().includes(term) ||
        (p.product_code && p.product_code.toLowerCase().includes(term)) ||
        (p.model && p.model.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.product_id));
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleApply = () => {
    const selectedProductsList = products.filter((p) =>
      selectedIds.includes(p.product_id)
    );
    const stickerDataList = selectedProductsList.map(mapProductToStickerData);
    onSelectProducts(stickerDataList);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Package className="size-5 text-primary" />
            Pilih Produk dari Admin Products
          </DialogTitle>
          <DialogDescription>
            Pilih satu atau beberapa produk untuk langsung dimasukkan ke Sticker Generator.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Selection Controls */}
        <div className="flex flex-col sm:flex-row gap-2 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama produk, serial number, atau model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="whitespace-nowrap"
          >
            <Layers className="size-4 mr-1.5" />
            {selectedIds.length === filteredProducts.length && filteredProducts.length > 0
              ? 'Batal Pilih Semua'
              : 'Pilih Semua Filtered'}
          </Button>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto min-h-[250px] border rounded-md divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Memuat data produk dari database...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">
              Gagal memuat produk: {error}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Tidak ada produk yang cocok dengan pencarian.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = selectedIds.includes(product.product_id);
              return (
                <div
                  key={product.product_id}
                  onClick={() => toggleProduct(product.product_id)}
                  className={`flex items-center gap-3 p-3 text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-l-4 border-l-primary'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleProduct(product.product_id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {product.product_name}
                      </span>
                      {product.model && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-secondary text-secondary-foreground uppercase">
                          {product.model}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
                      <span>SN: <strong className="font-mono text-foreground">{product.serial_number}</strong></span>
                      {product.product_code && (
                        <span>Code: {product.product_code}</span>
                      )}
                      {product.power_capacity && (
                        <span>Cap: {product.power_capacity}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex items-center justify-between pt-3">
          <div className="text-xs text-muted-foreground">
            Terpilih: <strong className="text-foreground">{selectedIds.length}</strong> produk
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={handleApply}
              className="gap-1.5"
            >
              <Check className="size-4" />
              Gunakan Produk ({selectedIds.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
