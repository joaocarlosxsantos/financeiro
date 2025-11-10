import { Button } from '@/components/ui/button';
import { UploadCloud, X, FileText } from 'lucide-react';
import React, { useRef } from 'react';

interface FaturaUploadProps {
  onFileChange?: (file: File) => void;
  onSubmit: (e: React.FormEvent) => void;
  file?: File | null;
  disabled?: boolean;
}

export function FaturaUpload({ 
  onFileChange, 
  onSubmit, 
  file, 
  disabled
}: FaturaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && onFileChange) {
      onFileChange(selectedFile);
    }
  };

  const removeFile = () => {
    if (onFileChange) {
      onFileChange(null as any);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-6">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group flex flex-col items-center justify-center border-2 border-dashed border-primary rounded-2xl p-14 md:p-20 cursor-pointer hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-h-[220px] w-full max-w-xl"
        >
          <UploadCloud className="w-16 h-16 text-primary group-hover:scale-110 transition-transform mb-3" />
          <span className="font-semibold text-primary text-lg md:text-xl">
            Clique para selecionar o arquivo CSV
          </span>
          <span className="text-sm text-muted-foreground mt-2">
            Arquivo CSV da fatura do cartão
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelection}
            className="hidden"
          />
        </button>

        {file && (
          <div className="w-full max-w-xl">
            <div className="flex items-center justify-between bg-muted px-4 py-3 rounded shadow-inner">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate font-semibold">{file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="h-8 w-8 p-0 ml-2"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <Button 
          type="submit" 
          disabled={!file || disabled}
          size="lg"
          className="px-8"
        >
          {disabled ? 'Processando...' : 'Processar Fatura'}
        </Button>
      </div>
    </form>
  );
}
