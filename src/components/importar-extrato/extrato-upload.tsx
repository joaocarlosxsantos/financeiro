
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import React, { useRef } from "react";

interface ExtratoUploadProps {
  onFileChange: (file: File) => void;
  onSubmit: (e: React.FormEvent) => void;
  file: File | null;
  disabled?: boolean;
}

export function ExtratoUpload({ onFileChange, onSubmit, file, disabled }: ExtratoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-6">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group flex flex-col items-center justify-center border-2 border-dashed border-primary rounded-2xl p-14 md:p-20 cursor-pointer hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-h-[220px] w-full max-w-xl"
        >
          <UploadCloud className="w-16 h-16 text-primary group-hover:scale-110 transition-transform mb-3" />
          <span className="font-semibold text-primary text-lg md:text-xl">Clique para selecionar o arquivo</span>
          <span className="text-sm text-muted-foreground mt-2">CSV, OFX ou Excel</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.ofx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onFileChange(f);
            }}
            className="hidden"
          />
        </button>
        {file && (
          <div className="text-base text-foreground bg-muted px-4 py-2 rounded shadow-inner max-w-xl w-full text-center">
            <span className="font-semibold">Arquivo selecionado:</span> {file.name}
          </div>
        )}
        <Button type="submit" disabled={!file || disabled} className="w-full md:w-auto max-w-xl text-base h-12">
          <UploadCloud className="w-5 h-5 mr-2" /> Pré-visualizar
        </Button>
      </div>
    </form>
  );
}
