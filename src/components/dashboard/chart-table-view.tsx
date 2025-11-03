'use client';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ChartTableViewProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
  showPercentage?: boolean;
}

export function ChartTableView({ data, title = 'Dados', showPercentage = true }: ChartTableViewProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            {showPercentage && <TableHead className="text-right">Percentual</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={`${item.name}-${index}`}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(item.value)}</TableCell>
              {showPercentage && (
                <TableCell className="text-right text-muted-foreground">
                  {((item.value / total) * 100).toFixed(1)}%
                </TableCell>
              )}
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/50">
            <TableCell>Total</TableCell>
            <TableCell className="text-right font-mono">{formatCurrency(total)}</TableCell>
            {showPercentage && <TableCell className="text-right">100%</TableCell>}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
