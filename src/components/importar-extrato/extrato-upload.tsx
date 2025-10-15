import { Button } from '@/components/ui/button';
import { UploadCloud, X, FileText } from 'lucide-react';
import React, { useRef } from 'react';

interface ExtratoUploadProps {
  onFileChange?: (file: File) => void;
  onFilesChange?: (files: File[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  file?: File | null;
  files?: File[];
  disabled?: boolean;
  multiple?: boolean;
}

export function ExtratoUpload({ 
  onFileChange, 
  onFilesChange, 
  onSubmit, 
  file, 
  files = [], 
  disabled,
  multiple = false 
}: ExtratoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (multiple && onFilesChange) {
      onFilesChange(selectedFiles);
    } else if (!multiple && onFileChange && selectedFiles[0]) {
      onFileChange(selectedFiles[0]);
    }
  };

  const removeFile = (index: number) => {
    if (multiple && onFilesChange) {
      const newFiles = files.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    }
  };

  const hasFiles = multiple ? files.length > 0 : !!file;
  const fileCount = multiple ? files.length : (file ? 1 : 0);

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
            {multiple ? 'Clique para selecionar arquivos' : 'Clique para selecionar o arquivo'}
          </span>
          <span className="text-sm text-muted-foreground mt-2">
            {multiple ? 'Múltiplos arquivos OFX ou TXT' : 'OFX ou TXT'}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".ofx,.txt,text/plain"
            multiple={multiple}
            onChange={handleFileSelection}
            className="hidden"
          />
        </button>

        {/* Arquivo único */}
        {!multiple && file && (
          <div className="text-base text-foreground bg-muted px-4 py-2 rounded shadow-inner max-w-xl w-full text-center">
            <span className="font-semibold">Arquivo selecionado:</span> {file.name}
          </div>
        )}

        {/* Múltiplos arquivos */}
        {multiple && files.length > 0 && (
          <div className="w-full max-w-xl space-y-3">
            <div className="text-sm text-muted-foreground text-center">
              {files.length} arquivo{files.length !== 1 ? 's' : ''} selecionado{files.length !== 1 ? 's' : ''}
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((selectedFile, index) => (
                <div
                  key={`${selectedFile.name}-${index}`}
                  className="flex items-center justify-between bg-muted px-3 py-2 rounded"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{selectedFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-6 w-6 p-0 ml-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={!hasFiles || disabled}
          className="w-full md:w-auto max-w-xl text-base h-12"
        >
          <UploadCloud className="w-5 h-5 mr-2" /> 
          {multiple && fileCount > 1 ? `Processar ${fileCount} arquivos` : 'Pré-visualizar'}
        </Button>
      </div>
    </form>
  );
}
