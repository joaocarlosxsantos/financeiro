'use client';
import { Download, Table2, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

interface ChartExportButtonsProps {
  onExportCSV: () => void;
  onExportPNG: () => void;
  onToggleTable: () => void;
  showingTable: boolean;
  chartTitle?: string;
}

export function ChartExportButtons({
  onExportCSV,
  onExportPNG,
  onToggleTable,
  showingTable,
  chartTitle = 'Gráfico',
}: ChartExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await onExportCSV();
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      await onExportPNG();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={showingTable ? "default" : "secondary"}
        size="sm"
        onClick={onToggleTable}
        className="gap-2 shadow-sm"
      >
        <Table2 className="h-4 w-4" />
        {showingTable ? 'Ver Gráfico' : 'Ver Tabela'}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="secondary" 
            size="sm" 
            className="gap-2 shadow-sm" 
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportPNG} className="gap-2 cursor-pointer">
            <Download className="h-4 w-4" />
            Exportar PNG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
