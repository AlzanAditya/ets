import * as React from "react";
import {
  EllipsisVertical,
  Copy,
  CheckSquare,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DataTableRowActionsProps<TData> {
  row: TData;
  onDelete?: (row: TData) => Promise<void>;
  showPreview?: boolean;
  previewUrl?: string;
}

export function DataTableRowActions<TData>({
  row,
  onDelete,
  showPreview,
  previewUrl,
}: DataTableRowActionsProps<TData>) {
  const [isOpen, setIsOpen] = React.useState(false);

  function handleCopy() {
    const textToCopy = (row as any).nomor_seri ?? (row as any).id;
    navigator.clipboard.writeText(String(textToCopy));
    toast.success("Disalin ke clipboard");
  }

  function handlePreview() {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  }

  async function handleDelete() {
    if (!onDelete) return;

    const loadingToast = toast.loading("Menghapus...");
    try {
      await onDelete(row);
      toast.dismiss(loadingToast);
      toast.success("Berhasil dihapus");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Gagal menghapus");
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onContextMenu={(e) => {
            e.preventDefault();
            setIsOpen(true);
          }}
        >
          <span className="sr-only">Buka menu</span>
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Salin
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CheckSquare className="mr-2 h-4 w-4" />
          Pilih
        </DropdownMenuItem>
        {showPreview && previewUrl && (
          <DropdownMenuItem onClick={handlePreview}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Preview
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
