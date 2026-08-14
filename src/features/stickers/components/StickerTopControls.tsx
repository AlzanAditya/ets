import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StickerSettingsModal } from './StickerSettingsModal';
import { StickerConfig } from '../types';

interface ClientOption {
  id: string;
  name: string;
}

interface StickerTopControlsProps {
  clients: Array<{ client_id: string; client_name: string }>;
  clientOptions: ClientOption[];
  selectedClient: string;
  onSelectClient: (clientId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  config: StickerConfig;
  onUpdateConfig: <K extends keyof StickerConfig>(key: K, value: StickerConfig[K]) => void;
  onReset?: () => void;
  className?: string;
}

export const StickerTopControls: React.FC<StickerTopControlsProps> = ({
  clients,
  clientOptions,
  selectedClient,
  onSelectClient,
  searchTerm,
  onSearchChange,
  isSettingsOpen,
  setIsSettingsOpen,
  config,
  onUpdateConfig,
  onReset,
  className,
}) => {
  const isClientFiltered = selectedClient !== 'ALL';
  const isSearchActive = searchTerm.trim().length > 0;

  return (
    <div className={cn('flex items-center justify-between gap-2 w-full', className)}>
      {/* Kiri: Dropdown Filter Perusahaan */}
      <div className="shrink-0 min-w-0">
        <Select value={selectedClient} onValueChange={onSelectClient}>
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
          <SelectContent className="max-h-60">
            <SelectItem value="ALL" className="text-xs cursor-pointer">
              Semua Perusahaan ({clients.length})
            </SelectItem>
            <SelectItem value="NO_CLIENT" className="text-xs cursor-pointer">
              Tanpa Perusahaan
            </SelectItem>
            {clientOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id} className="text-xs cursor-pointer">
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanan: Search Input Serial No & Tombol Pengaturan Stiker */}
      <div className="flex items-center gap-1.5 shrink-0">
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
            onChange={(e) => onSearchChange(e.target.value)}
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
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Tombol Pengaturan Stiker */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="h-8 px-2.5 rounded-lg border border-input bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center shrink-0"
          title="Pengaturan Layout & Ukuran Stiker"
        >
          <Settings className="size-3.5" />
        </button>
      </div>

      {/* Modal Settings Layout Stiker */}
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
