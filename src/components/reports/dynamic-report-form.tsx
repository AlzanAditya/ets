import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export interface SchemaField {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "date" | "boolean";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: any;
}

interface DynamicReportFormProps {
  fieldSchema?: any; // e.g. Array<SchemaField> or JSON schema object
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  disabled?: boolean;
}

export function DynamicReportForm({
  fieldSchema,
  value,
  onChange,
  disabled = false,
}: DynamicReportFormProps) {
  // If fieldSchema is an array of field definitions
  const schemaList: SchemaField[] | null = React.useMemo(() => {
    if (!fieldSchema) return null;
    if (Array.isArray(fieldSchema)) return fieldSchema;
    if (fieldSchema.fields && Array.isArray(fieldSchema.fields)) return fieldSchema.fields;
    return null;
  }, [fieldSchema]);

  const handleFieldChange = (name: string, val: any) => {
    onChange({
      ...value,
      [name]: val,
    });
  };

  // State for free-form key-value builder if schema is null
  const [customFields, setCustomFields] = React.useState<Array<{ key: string; val: string }>>(() => {
    if (schemaList) return [];
    const entries = Object.entries(value || {}).filter(([k]) => k !== "notes" && k !== "summary");
    return entries.map(([key, val]) => ({ key, val: String(val) }));
  });

  const [notes, setNotes] = React.useState<string>(value?.notes || value?.summary || "");

  const handleCustomFieldChange = (idx: number, key: string, val: string) => {
    const updated = [...customFields];
    updated[idx] = { key, val };
    setCustomFields(updated);

    const out: Record<string, any> = {};
    if (notes) out.notes = notes;
    updated.forEach((item) => {
      if (item.key.trim()) {
        out[item.key.trim()] = item.val;
      }
    });
    onChange(out);
  };

  const handleAddCustomField = () => {
    const next = [...customFields, { key: "", val: "" }];
    setCustomFields(next);
  };

  const handleRemoveCustomField = (idx: number) => {
    const next = customFields.filter((_, i) => i !== idx);
    setCustomFields(next);
    const out: Record<string, any> = {};
    if (notes) out.notes = notes;
    next.forEach((item) => {
      if (item.key.trim()) {
        out[item.key.trim()] = item.val;
      }
    });
    onChange(out);
  };

  const handleNotesChange = (txt: string) => {
    setNotes(txt);
    const out: Record<string, any> = { ...value, notes: txt };
    onChange(out);
  };

  // 1. Structured Schema Renderer
  if (schemaList && schemaList.length > 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {schemaList.map((field) => {
            const fieldVal = value[field.name] ?? field.defaultValue ?? "";

            return (
              <div
                key={field.name}
                className={field.type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}
              >
                <Label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                  <span>{field.label || field.name}</span>
                  {field.required && <span className="text-rose-400">*</span>}
                </Label>

                {field.type === "textarea" ? (
                  <textarea
                    disabled={disabled}
                    value={fieldVal}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder || `Masukkan ${field.label || field.name}...`}
                    rows={3}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                ) : field.type === "select" ? (
                  <select
                    disabled={disabled}
                    value={fieldVal}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Pilih opsi...</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === "date" ? (
                  <Input
                    type="date"
                    disabled={disabled}
                    value={fieldVal}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className="h-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-100 rounded-xl"
                  />
                ) : field.type === "number" ? (
                  <Input
                    type="number"
                    disabled={disabled}
                    value={fieldVal}
                    onChange={(e) => handleFieldChange(field.name, e.target.valueAsNumber || 0)}
                    placeholder={field.placeholder}
                    className="h-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-100 rounded-xl"
                  />
                ) : (
                  <Input
                    type="text"
                    disabled={disabled}
                    value={fieldVal}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder || `Masukkan ${field.label || field.name}...`}
                    className="h-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-100 rounded-xl"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Generic / Free-Form Data Renderer (when field_schema is null or empty)
  return (
    <div className="space-y-4">
      {/* Primary Notes / Summary */}
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-300 font-semibold">
          Catatan & Keterangan Laporan
        </Label>
        <textarea
          disabled={disabled}
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Tuliskan ringkasan, temuan lapangan, atau catatan operasional di sini..."
          rows={3}
          className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Structured Key-Value List */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/60">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-zinc-400 font-semibold">
            Data Tambahan / Parameter (Opsional)
          </Label>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddCustomField}
              className="h-6 text-[11px] px-2 text-amber-400 hover:text-amber-300 gap-1"
            >
              <Plus className="size-3" />
              <span>Tambah Parameter</span>
            </Button>
          )}
        </div>

        {customFields.length > 0 && (
          <div className="space-y-2">
            {customFields.map((cf, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  disabled={disabled}
                  placeholder="Nama Parameter (e.g. Tegangan, Suhu)"
                  value={cf.key}
                  onChange={(e) => handleCustomFieldChange(idx, e.target.value, cf.val)}
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 text-zinc-200 rounded-lg flex-1"
                />
                <Input
                  disabled={disabled}
                  placeholder="Nilai (e.g. 220V, 35°C)"
                  value={cf.val}
                  onChange={(e) => handleCustomFieldChange(idx, cf.key, e.target.value)}
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg flex-1"
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCustomField(idx)}
                    className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
