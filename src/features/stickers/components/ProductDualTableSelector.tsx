import React, { useState, useMemo } from 'react';
import { ProductWithRelations } from '@/services/products.service';
import { StickerData, StickerConfig } from '../types';
import { mapProductToStickerData } from './ProductSelectorModal';
import { StickerSettingsModal } from './StickerSettingsModal';
import { useClients } from '@/hooks/use-clients';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Trash2,
  Layers,
  X,
  Wrench,
  Zap,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ClientProductStatusBadge({ status }: { status?: string }) {
  const s = status?.toLowerCase() || '';
  if (s === 'maintenance') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Wrench className="h-3 w-3" />
        <span>Maintenance</span>
      </span>
    );
  }
  if (s === 'instalasi' || s === 'installation') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
        <Zap className="h-3 w-3" />
        <span>Instalasi</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <ShieldCheck className="h-3 w-3" />
      <span>Bergaransi</span>
    </span>
  );
}

export interface ProductDualTableSelectorProps {
  allProducts: ProductWithRelations[];
  loadingProducts?: boolean;
  selectedProducts: StickerData[];
  onSelectProducts: (products: StickerData[]) => void;
  activeProductIndex: number;
  setActiveProductIndex: (index: number) => void;
  config: StickerConfig;
  onUpdateConfig: <K extends keyof StickerConfig>(key: K, value: StickerConfig[K]) => void;
  onReset?: () => void;
  // Shared filter states for sticky mobile header
  selectedClient?: string;
  setSelectedClient?: (client: string) => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  isSettingsOpen?: boolean;
  setIsSettingsOpen?: (open: boolean) => void;
  hideTopControlsOnMobile?: boolean;
}

export const ProductDualTableSelector: React.FC<ProductDualTableSelectorProps> = ({
  allProducts,
  loadingProducts = false,
  selectedProducts,
  onSelectProducts,
  activeProductIndex,
  setActiveProductIndex,
  config,
  onUpdateConfig,
  onReset,
  selectedClient: externalSelectedClient,
  setSelectedClient: externalSetSelectedClient,
  searchTerm: externalSearchTerm,
  setSearchTerm: externalSetSearchTerm,
  isSettingsOpen: externalIsSettingsOpen,
  setIsSettingsOpen: externalSetIsSettingsOpen,
  hideTopControlsOnMobile = false,
}) => {
  const { data: clients } = useClients();
  const [internalSelectedClient, setInternalSelectedClient] = useState<string>('ALL');
  const [internalSearchTerm, setInternalSearchTerm] = useState<string>('');
  const [internalIsSettingsOpen, setInternalIsSettingsOpen] = useState<boolean>(false);

  const selectedClient = externalSelectedClient !== undefined ? externalSelectedClient : internalSelectedClient;
  const setSelectedClient = externalSetSelectedClient || setInternalSelectedClient;
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = externalSetSearchTerm || setInternalSearchTerm;
  const isSettingsOpen = externalIsSettingsOpen !== undefined ? externalIsSettingsOpen : internalIsSettingsOpen;
  const setIsSettingsOpen = externalSetIsSettingsOpen || setInternalIsSettingsOpen;

  // Set of IDs or Serial Numbers currently selected in Table 2
  const selectedKeysSet = useMemo(() => {
    const keys = new Set<string>();
    selectedProducts.forEach((p) => {
      if (p.id) keys.add(p.id);
      if (p.serialNo) keys.add(p.serialNo.replace(/\s+/g, ''));
    });
    return keys;
  }, [selectedProducts]);

  // List of unique clients derived from allProducts and database clients
  const clientOptions = useMemo(() => {
    const clientMap = new Map<string, string>();

    clients.forEach((c) => {
      if (c.client_id && c.client_name) {
        clientMap.set(c.client_id, c.client_name);
      }
    });

    allProducts.forEach((p) => {
      if (p.client?.client_id && p.client?.client_name) {
        clientMap.set(p.client.client_id, p.client.client_name);
      } else if (p.client?.client_name) {
        clientMap.set(p.client.client_name, p.client.client_name);
      }
    });

    return Array.from(clientMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [clients, allProducts]);

  // Table 1: Filtered available products (NOT yet in Table 2)
  const availableProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const pId = p.product_id;
      const cleanSn = (p.serial_number || '').replace(/\s+/g, '');

      if (selectedKeysSet.has(pId) || selectedKeysSet.has(cleanSn)) {
        return false;
      }

      if (selectedClient !== 'ALL') {
        if (selectedClient === 'NO_CLIENT') {
          if (p.client || p.current_client_id) return false;
        } else {
          const matchId =
            p.current_client_id === selectedClient ||
            p.client?.client_id === selectedClient;
          const matchName = p.client?.client_name === selectedClient;
          if (!matchId && !matchName) return false;
        }
      }

      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        const snMatch = (p.serial_number || '').toLowerCase().includes(term);
        const nameMatch = (p.product_name || '').toLowerCase().includes(term);
        const codeMatch = (p.product_code || '').toLowerCase().includes(term);
        if (!snMatch && !nameMatch && !codeMatch) return false;
      }

      return true;
    });
  }, [allProducts, selectedKeysSet, selectedClient, searchTerm]);

  // Handler: Move 1 product from Table 1 -> Table 2
  const handleAddProduct = (product: ProductWithRelations) => {
    const sticker = mapProductToStickerData(product);
    const updated = [...selectedProducts, sticker];
    onSelectProducts(updated);
  };

  // Handler: Move all currently filtered products from Table 1 -> Table 2
  const handleAddAllFiltered = () => {
    if (availableProducts.length === 0) return;
    const newStickers = availableProducts.map(mapProductToStickerData);
    const updated = [...selectedProducts, ...newStickers];
    onSelectProducts(updated);
    toast.success(`${newStickers.length} produk dipindahkan ke daftar stiker.`);
  };

  // Handler: Remove 1 product from Table 2 -> Table 1
  const handleRemoveProduct = (index: number) => {
    const updated = selectedProducts.filter((_, i) => i !== index);
    onSelectProducts(updated);
    if (activeProductIndex >= updated.length) {
      setActiveProductIndex(Math.max(0, updated.length - 1));
    }
  };

  // Handler: Clear all products from Table 2 -> Table 1
  const handleClearAllSelected = () => {
    if (selectedProducts.length === 0) return;
    onSelectProducts([]);
    setActiveProductIndex(0);
    toast.info('Daftar stiker terpilih dikosongkan.');
  };

  const isClientFiltered = selectedClient !== 'ALL';
  const isSearchActive = searchTerm.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* ── TOP CONTROL ROW: Filter Perusahaan (Kiri) | Search + Setting (Kanan) ── */}
      <div
        className={cn(
          'flex items-center justify-between gap-2 w-full',
          hideTopControlsOnMobile && 'hidden lg:flex'
        )}
      >
        {/* Kiri: Dropdown Filter Perusahaan (Lebar dinamis sesuai opsi terpilih saat ini) */}
        <div className="shrink-0 min-w-0">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger
              size="sm"
              className={cn(
                'w-auto h-8 pl-2.5 pr-2 py-1 text-xs font-medium bg-background rounded-lg gap-2 text-foreground focus:ring-1 focus:ring-primary focus:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary cursor-pointer transition-all',
                isClientFiltered
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-input'
              )}
            >
              <SelectValue placeholder="Pilih Perusahaan" />
            </SelectTrigger>
            <SelectContent align="start" className="max-h-60">
              <SelectItem value="ALL" className="text-xs font-medium cursor-pointer">
                Semua Perusahaan ({allProducts.length})
              </SelectItem>
              <SelectItem value="NO_CLIENT" className="text-xs font-medium cursor-pointer">
                Tanpa Perusahaan / Klien
              </SelectItem>
              {clientOptions.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs font-medium cursor-pointer">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kanan: Search Serial No + Setting Button */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Search Input */}
          <div
            className={cn(
              'relative transition-all duration-200',
              searchTerm ? 'w-32 sm:w-40' : 'w-24 focus-within:w-32 sm:focus-within:w-40'
            )}
          >
            <Search
              className={cn(
                'absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 transition-colors',
                isSearchActive ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <input
              type="text"
              placeholder="Cari"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                'w-full bg-background rounded-lg pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono',
                isSearchActive
                  ? 'border border-primary ring-1 ring-primary'
                  : 'border border-input'
              )}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Tombol Setting (Ukuran Sticker & Layout A4) */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center bg-muted/80 border border-input hover:bg-muted text-muted-foreground hover:text-foreground p-2 rounded-lg transition-all cursor-pointer shrink-0 shadow-xs"
            title="Pengaturan Stiker (Ukuran & Layout A4)"
          >
            <Settings className="size-3.5 text-foreground" />
          </button>
        </div>
      </div>

      {/* ── TABLE 1: AVAILABLE PRODUCTS ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1 py-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Pilih item untuk dicetak stiker
            </span>
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
              {availableProducts.length}
            </span>
          </div>

          {availableProducts.length > 0 && (
            <button
              type="button"
              onClick={handleAddAllFiltered}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Layers className="size-3" />
              Pilih Semua Filtered
            </button>
          )}
        </div>

        {/* Reverted standard table text size: text-xs, comfortable padding */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 overflow-hidden shadow-lg max-h-52 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="border-zinc-800 bg-zinc-900/90 hover:bg-zinc-900/90">
                <TableHead className="w-10 text-center text-xs font-bold text-zinc-400">No.</TableHead>
                <TableHead className="text-xs font-bold text-zinc-400">Serial Nomor</TableHead>
                <TableHead className="text-xs font-bold text-zinc-400">Nama Produk</TableHead>
                <TableHead className="text-xs font-bold text-zinc-400">Status</TableHead>
                <TableHead className="w-10 text-center text-xs font-bold text-zinc-400"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingProducts ? (
                <TableRow className="border-zinc-800/60">
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-zinc-400">
                    Memuat data produk...
                  </TableCell>
                </TableRow>
              ) : availableProducts.length === 0 ? (
                <TableRow className="border-zinc-800/60">
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-zinc-400">
                    {allProducts.length === 0
                      ? 'Belum ada produk di database.'
                      : 'Tidak ada produk tersedia yang cocok dengan filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                availableProducts.map((product, idx) => {
                  return (
                    <TableRow
                      key={product.product_id}
                      onClick={() => handleAddProduct(product)}
                      className="hover:bg-zinc-900/80 cursor-pointer transition-colors border-zinc-800/60 group"
                    >
                      <TableCell className="text-center text-zinc-400 font-mono text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-200 text-xs font-semibold">
                        {product.serial_number}
                      </TableCell>
                      <TableCell className="text-zinc-200 text-xs">
                        {product.product_name}
                      </TableCell>
                      <TableCell>
                        <ClientProductStatusBadge status={product.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddProduct(product);
                          }}
                          className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-all cursor-pointer inline-flex items-center justify-center"
                          title="Pindahkan ke Tabel 2"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── TABLE 2: SELECTED PRODUCTS FOR STICKER ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1 py-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Akan dibuat stiker
            </span>
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {selectedProducts.length}
            </span>
          </div>

          {selectedProducts.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllSelected}
              className="text-[11px] font-semibold text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="size-3" />
              Kosongkan
            </button>
          )}
        </div>

        {/* Reverted standard table text size: text-xs, comfortable padding */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 overflow-hidden shadow-lg max-h-64 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="border-zinc-800 bg-zinc-900/90 hover:bg-zinc-900/90">
                <TableHead className="w-10 text-center text-xs font-bold text-zinc-400">No.</TableHead>
                <TableHead className="text-xs font-bold text-zinc-400">Serial Nomor</TableHead>
                <TableHead className="text-xs font-bold text-zinc-400">Nama Produk</TableHead>
                <TableHead className="text-xs font-bold text-zinc-400">Status</TableHead>
                <TableHead className="w-10 text-center text-xs font-bold text-zinc-400"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedProducts.length === 0 ? (
                <TableRow className="border-zinc-800/60">
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-zinc-400">
                    Klik produk di Tabel 1 untuk memasukkannya ke sini.
                  </TableCell>
                </TableRow>
              ) : (
                selectedProducts.map((p, idx) => {
                  const isActive = idx === activeProductIndex;
                  return (
                    <TableRow
                      key={p.id || `${p.serialNo}-${idx}`}
                      onClick={() => setActiveProductIndex(idx)}
                      className={cn(
                        'hover:bg-zinc-900/80 cursor-pointer transition-colors border-zinc-800/60 group',
                        isActive && 'bg-zinc-800/90 hover:bg-zinc-800'
                      )}
                    >
                      <TableCell className="text-center text-zinc-400 font-mono text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-200 text-xs font-semibold">
                        <span>{p.serialNo}</span>
                      </TableCell>
                      <TableCell className="text-zinc-200 text-xs">
                        {p.productName}
                      </TableCell>
                      <TableCell>
                        <ClientProductStatusBadge status="bergaransi" />
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveProduct(idx);
                          }}
                          className="p-1 rounded-md text-zinc-400 hover:bg-rose-500/15 hover:text-rose-400 transition-all cursor-pointer inline-flex items-center justify-center"
                          title="Kembalikan ke Tabel 1"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Settings Modal Dialog */}
      <StickerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onUpdateConfig={onUpdateConfig}
        onReset={onReset}
      />
    </div>
  );
};
