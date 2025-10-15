import { Alert, AlertDescription } from '../ui/alert';
import { Info, FileText, Copy, Upload } from 'lucide-react';

export function PdfHelp() {
  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div className="font-semibold">Como importar extratos:</div>
        <div className="space-y-2">

          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span className="text-sm">
              <strong>OFX:</strong> Arquivos padrão de extratos bancários (Banco do Brasil, Itaú, etc.)
            </span>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <span className="text-sm">
              <strong>TXT:</strong> Texto de extratos copiado manualmente de PDFs ou outras fontes
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          💡 <strong>Para PDFs:</strong> Abra o PDF, selecione todo o texto (Ctrl+A), copie (Ctrl+C), cole no Bloco de Notas, salve como .txt e faça upload aqui.
        </div>
      </AlertDescription>
    </Alert>
  );
}