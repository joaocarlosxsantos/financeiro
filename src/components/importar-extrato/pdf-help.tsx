import { Alert, AlertDescription } from '../ui/alert';
import { Info, FileText, Copy, Upload } from 'lucide-react';

export function PdfHelp() {
  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div className="font-semibold">Como importar extratos PDF:</div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span className="text-sm">
              <strong>1.</strong> Abra seu extrato PDF no navegador ou leitor de PDF
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Copy className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span className="text-sm">
              <strong>2.</strong> Selecione todo o texto do extrato (Ctrl+A) e copie (Ctrl+C)
            </span>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span className="text-sm">
              <strong>3.</strong> Cole o texto em um arquivo .txt usando o Bloco de Notas
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Upload className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span className="text-sm">
              <strong>4.</strong> Importe o arquivo .txt usando o botão acima
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          O sistema reconhece automaticamente extratos com transações agrupadas por data, individuais por linha, e também extratos Alelo mal formatados (cada caractere em linha separada).
        </div>
      </AlertDescription>
    </Alert>
  );
}