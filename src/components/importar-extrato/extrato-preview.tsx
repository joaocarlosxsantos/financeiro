import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ExtratoPreviewProps {
  preview: any[];
  wallets: any[];
  selectedWallet: string;
  onWalletChange: (id: string) => void;
  onSave: (registros: any[]) => void;
  saving: boolean;
  error: string | null;
  success: boolean;
}


export function ExtratoPreview({ preview, wallets, selectedWallet, onWalletChange, onSave, saving, error, success }: ExtratoPreviewProps) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  useEffect(() => {
    setRegistros(preview.map((r) => {
      // Se a categoria sugerida já existe, preenche com o id dela
      let categoriaId = '';
      if (r.categoriaSugerida && categorias.length > 0) {
        const match = categorias.find((c: any) => c.name.toLowerCase() === r.categoriaSugerida.toLowerCase());
        if (match) categoriaId = match.id;
        else categoriaId = r.categoriaSugerida;
      } else {
        categoriaId = r.categoriaSugerida || '';
      }
      return {
        ...r,
        categoriaId,
        tagId: '',
        categoriaSugerida: r.categoriaSugerida || '',
      };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, categorias]);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategorias);
    fetch('/api/tags').then(r => r.json()).then(setTags);
  }, []);

  function handleEdit(index: number, field: string, value: string) {
    setRegistros((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Pré-visualização dos dados</h2>
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1">Data</th>
              <th className="border px-2 py-1">Valor</th>
              <th className="border px-2 py-1">Descrição extrato</th>
              <th className="border px-2 py-1">Descrição</th>
              <th className="border px-2 py-1 min-w-[200px]">Categoria</th>
              <th className="border px-2 py-1 min-w-[160px]">Tag</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((row, i) => (
              <tr key={i}>
                <td className="border px-2 py-1 whitespace-nowrap">{row.data}</td>
                <td className="border px-2 py-1 whitespace-nowrap">{row.valor}</td>
                <td className="border px-2 py-1 min-w-[180px]">{row.descricao}</td>
                <td className="border px-2 py-1 min-w-[180px]">
                  <Input
                    value={row.descricaoSimplificada || ''}
                    onChange={e => handleEdit(i, 'descricaoSimplificada', e.target.value)}
                    className="text-xs"
                  />
                </td>
                <td className="border px-2 py-1 min-w-[200px]">
                  <Select
                    value={row.categoriaId || ''}
                    onChange={e => handleEdit(i, 'categoriaId', e.target.value)}
                  >
                    <option value="">Nenhuma</option>
                    {/* Sugestão de categoria */}
                    {row.categoriaSugerida && !categorias.some((c: any) => c.name === row.categoriaSugerida) && (
                      <option value={row.categoriaSugerida} style={{ fontStyle: 'italic' }}>
                        Sugerida: {row.categoriaSugerida}
                      </option>
                    )}
                    {categorias.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </td>
                <td className="border px-2 py-1 min-w-[160px]">
                  <Select
                    value={row.tagId || ''}
                    onChange={e => handleEdit(i, 'tagId', e.target.value)}
                  >
                    <option value="">Nenhuma</option>
                    {tags.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="font-medium">Selecione a carteira para vincular os lançamentos:</Label>
        <Select
          value={selectedWallet}
          onChange={e => onWalletChange(e.target.value)}
        >
          <option value="">Selecione...</option>
          {wallets.map((w: any) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </Select>
        <Button onClick={() => onSave(registros)} disabled={!selectedWallet || saving}>
          {saving ? "Salvando..." : "Salvar lançamentos"}
        </Button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">Importação realizada com sucesso!</div>}
      </div>
    </div>
  );
}
