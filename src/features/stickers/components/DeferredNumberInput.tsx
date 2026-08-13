import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface DeferredNumberInputProps {
  id?: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  isInteger?: boolean;
  onCommit: (val: number) => void;
  className?: string;
}

export const DeferredNumberInput: React.FC<DeferredNumberInputProps> = ({
  id,
  label,
  value,
  min,
  max,
  isInteger = false,
  onCommit,
  className = 'w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono',
}) => {
  const [localVal, setLocalVal] = useState<string>(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const handleCommit = () => {
    const trimmed = localVal.trim();
    if (trimmed === '') {
      toast.error(`Field ${label} tidak boleh kosong. Mengembalikan nilai ke ${value}.`);
      setLocalVal(String(value));
      return;
    }

    const parsed = isInteger ? parseInt(trimmed, 10) : parseFloat(trimmed);

    if (isNaN(parsed)) {
      toast.error(`Nilai ${label} tidak valid.`);
      setLocalVal(String(value));
      return;
    }

    if (min !== undefined && parsed < min) {
      toast.error(`Nilai ${label} minimal adalah ${min}.`);
      setLocalVal(String(value));
      return;
    }

    if (max !== undefined && parsed > max) {
      toast.error(`Nilai ${label} maksimal adalah ${max}.`);
      setLocalVal(String(value));
      return;
    }

    setLocalVal(String(parsed));
    if (parsed !== value) {
      onCommit(parsed);
    }
  };

  return (
    <input
      type="number"
      id={id}
      value={localVal}
      min={min}
      max={max}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleCommit();
          e.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
};
