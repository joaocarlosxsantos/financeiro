'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface CreditExpenseFormDebugProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreditExpenseFormDebug({ onSuccess, onCancel }: CreditExpenseFormDebugProps) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
  });

  return (
    <form className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="description">Descrição da Compra *</Label>
          <Input
            id="description"
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ex: Compra no supermercado"
          />
        </div>

        <div>
          <Label htmlFor="amount">Valor Total *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Salvar
        </Button>
      </div>
    </form>
  );
}