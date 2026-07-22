import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon, TagIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface InteractiveTagsProps {
  itemId: string;
  type: "products" | "clients";
  /** Custom callback when tags change */
  onChange?: (tags: string[]) => void;
}

const DEFAULT_TAG_OPTIONS = {
  products: ["Premium", "Standard", "Baru", "Servis", "Grosir", "Refurbished"],
  clients: ["VIP", "Regular", "Corporate", "Partner", "New", "Aktif"],
};

export function InteractiveTags({ itemId, type, onChange }: InteractiveTagsProps) {
  const storageKey = `tags:${type}:${itemId}`;
  
  // Load initial tags from localStorage
  const [tags, setTags] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error reading tags from localStorage", e);
    }
    // Default fallback tags based on item ID to make it look seeded on first load
    const hash = itemId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const defaults = DEFAULT_TAG_OPTIONS[type];
    const defaultTag = defaults[hash % defaults.length];
    return [defaultTag];
  });

  const availableOptions = DEFAULT_TAG_OPTIONS[type];

  const handleToggleTag = (tag: string) => {
    let newTags: string[];
    if (tags.includes(tag)) {
      newTags = tags.filter((t) => t !== tag);
    } else {
      newTags = [...tags, tag];
    }
    
    setTags(newTags);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newTags));
    } catch (e) {
      console.error("Error saving tags to localStorage", e);
    }
    
    onChange?.(newTags);
    toast.success(`Tag "${tag}" berhasil diperbarui`);
  };

  const handleRemoveTag = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation(); // Prevent triggering row click or other actions
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newTags));
    } catch (e) {
      console.error("Error saving tags to localStorage", e);
    }
    onChange?.(newTags);
    toast.success(`Tag "${tag}" dihapus`);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="h-5 text-[10px] font-medium px-1.5 py-0 rounded flex items-center gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
        >
          <span>{tag}</span>
          <button
            type="button"
            onClick={(e) => handleRemoveTag(e, tag)}
            className="text-primary/60 hover:text-primary rounded-full p-0.5 focus:outline-none"
            title="Hapus tag"
          >
            <XIcon className="size-2.5" />
          </button>
        </Badge>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-5 rounded-full border-dashed border-muted-foreground/30 hover:border-primary hover:text-primary transition-colors flex items-center justify-center p-0"
            title="Kelola tag"
          >
            <PlusIcon className="size-2.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-xs flex items-center gap-1 text-muted-foreground">
            <TagIcon className="size-3" />
            <span>Kelola Tags</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={tags.includes(option)}
              onCheckedChange={() => handleToggleTag(option)}
              className="text-xs"
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
