import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SearchCheck,
  Package,
  Truck,
  Wrench,
  Camera,
  KeyRound,
  Handshake,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export interface ReportDocItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  hasDoc: boolean;
}

const INITIAL_DOCS: ReportDocItem[] = [
  { id: "survey", title: "Survey", icon: Search, hasDoc: true },
  { id: "final_survey", title: "Final Survey", icon: SearchCheck, hasDoc: false },
  { id: "material", title: "Material", icon: Package, hasDoc: true },
  { id: "pengiriman", title: "Pengiriman unit", icon: Truck, hasDoc: false },
  { id: "instalasi", title: "Instalasi", icon: Wrench, hasDoc: false },
  { id: "dokumentasi", title: "Dokumentasi", icon: Camera, hasDoc: true },
  { id: "berita_acara", title: "Berita Acara", icon: KeyRound, hasDoc: true },
  { id: "serah_terima", title: "Serah Terima", icon: Handshake, hasDoc: true },
  { id: "training", title: "Training", icon: ClipboardList, hasDoc: false },
];

interface PublicReportCardProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function PublicReportCard({
  isExpanded = true,
  onToggleExpand,
}: PublicReportCardProps) {
  const [docs, setDocs] = React.useState<ReportDocItem[]>(INITIAL_DOCS);

  const toggleDocState = (id: string, title: string) => {
    setDocs((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.hasDoc;
          toast.info(
            nextState
              ? `Status '${title}' diubah menjadi: Ada Dokumen`
              : `Status '${title}' diubah menjadi: Belum Ada`
          );
          return { ...item, hasDoc: nextState };
        }
        return item;
      })
    );
  };

  return (
    <motion.div
      id="laporan"
      initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-xl space-y-4 scroll-mt-16"
    >
      {/* Header Button */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between text-left focus:outline-none group cursor-pointer select-none py-1 pl-1"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 group-hover:text-emerald-400 transition-colors">
          LAPORAN
        </h2>
        <div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
          )}
        </div>
      </button>

      {/* Expandable Grid */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(6px)", height: 0 }}
            animate={{ opacity: 1, filter: "blur(0px)", height: "auto" }}
            exit={{ opacity: 0, filter: "blur(6px)", height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3.5 sm:gap-5 pt-2 pb-1">
              {docs.map((doc) => {
                const IconComponent = doc.icon;
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocState(doc.id, doc.title)}
                    className="flex flex-col items-center group cursor-pointer select-none"
                  >
                    {/* Document Card Icon Box */}
                    <div
                      className={`w-full aspect-[4/5] rounded-xl sm:rounded-2xl transition-all duration-200 flex flex-col justify-between items-center p-3 relative overflow-hidden ${
                        doc.hasDoc
                          ? "bg-zinc-300 text-zinc-900 shadow-md group-hover:bg-zinc-200 group-hover:scale-[1.03]"
                          : "border-2 border-dashed border-zinc-700/80 bg-zinc-950/30 group-hover:border-zinc-500 group-hover:bg-zinc-900/40 group-hover:scale-[1.03]"
                      }`}
                    >
                      {doc.hasDoc ? (
                        <>
                          {/* Top/Middle Icon - matching lines color */}
                          <div className="flex-1 flex items-center justify-center pt-0.5 sm:pt-1 -mb-1">
                            <IconComponent className="h-7 w-7 sm:h-9 sm:w-9 text-zinc-800 stroke-[2.2]" />
                          </div>

                          {/* 2 Line Document Mock Style - shifted up slightly */}
                          <div className="w-full space-y-1 sm:space-y-1.5 px-0.5 sm:px-1 mb-1.5 sm:mb-2">
                            <div className="w-3/4 h-1.5 sm:h-2 bg-zinc-800/80 rounded-full" />
                            <div className="w-1/2 h-1.5 sm:h-2 bg-zinc-800/80 rounded-full" />
                          </div>
                        </>
                      ) : (
                        /* Empty state item */
                        <div className="w-full h-full flex items-center justify-center opacity-30">
                          <IconComponent className="h-6 w-6 sm:h-7 sm:w-7 text-zinc-500 stroke-[1.5]" />
                        </div>
                      )}
                    </div>

                    {/* Document Label */}
                    <span className="mt-2 text-center text-xs sm:text-sm font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors tracking-tight leading-snug">
                      {doc.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
