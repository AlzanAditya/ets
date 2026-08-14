import React from 'react';
import { StickerData, StickerConfig } from '../types';
import { ProductWithRelations } from '@/services/products.service';
import { ProductDualTableSelector } from './ProductDualTableSelector';

interface StickerConfigurationPanelProps {
  allProducts: ProductWithRelations[];
  loadingProducts?: boolean;
  onSelectProducts: (products: StickerData[]) => void;

  selectedProducts: StickerData[];
  activeProductIndex: number;
  setActiveProductIndex: (index: number) => void;
  onOpenProductModal?: () => void;

  config: StickerConfig;
  onUpdateConfig: <K extends keyof StickerConfig>(key: K, value: StickerConfig[K]) => void;

  onReset: () => void;

  selectedClient?: string;
  setSelectedClient?: (client: string) => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  isSettingsOpen?: boolean;
  setIsSettingsOpen?: (open: boolean) => void;
  hideTopControlsOnMobile?: boolean;
}

export const StickerConfigurationPanel: React.FC<StickerConfigurationPanelProps> = ({
  allProducts,
  loadingProducts = false,
  onSelectProducts,
  selectedProducts,
  activeProductIndex,
  setActiveProductIndex,
  config,
  onUpdateConfig,
  onReset,
  selectedClient,
  setSelectedClient,
  searchTerm,
  setSearchTerm,
  isSettingsOpen,
  setIsSettingsOpen,
  hideTopControlsOnMobile = false,
}) => {
  return (
    <aside className="w-full flex flex-col gap-4 p-4 bg-transparent border-b lg:border-b-0 lg:border-l border-border text-card-foreground lg:h-full lg:overflow-y-auto min-h-0">
      {/* DUAL TABLE PRODUCT SELECTOR */}
      <ProductDualTableSelector
        allProducts={allProducts}
        loadingProducts={loadingProducts}
        selectedProducts={selectedProducts}
        onSelectProducts={onSelectProducts}
        activeProductIndex={activeProductIndex}
        setActiveProductIndex={setActiveProductIndex}
        config={config}
        onUpdateConfig={onUpdateConfig}
        onReset={onReset}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        hideTopControlsOnMobile={hideTopControlsOnMobile}
      />
    </aside>
  );
};
