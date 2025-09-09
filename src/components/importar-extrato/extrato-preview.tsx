import { Button } from '@/components/ui/button';
import { formatYmd } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExtratoPreviewProps {
  preview: any[];
  wallets: any[];
  selectedWallet: string;
  onWalletChange: (id: string) => void;
  onSave: (registros: any[]) => void;
  saving: boolean;
  error: string | null;
  success: boolean;
  fetchWallets?: () => Promise<void>;
}
import { WalletCreateModal } from '@/components/ui/wallet-create-modal';
import { Plus } from 'lucide-react';

export function ExtratoPreview({
  preview,
  wallets,
  selectedWallet,
  onWalletChange,
  onSave,
  saving,
  error,
  success,
  fetchWallets,
}: ExtratoPreviewProps) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [saldoAnterior, setSaldoAnterior] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  // Descobre a data do primeiro lançamento do extrato
  const dataPrimeiroLancamento = React.useMemo(() => {
    if (!registros.length) return null;
    // Considera que o campo 'data' está no formato 'dd/mm/yyyy' ou 'yyyy-mm-dd'
    const datas = registros
      .map((r) => {
        if (r.data && r.data.includes('/')) {
          const [d, m, y] = r.data.split('/');
          return new Date(Number(y), Number(m) - 1, Number(d));
        } else if (r.data && r.data.includes('-')) {
          return new Date(r.data);
        }
        return null;
      })
      .filter(Boolean) as Date[];
    if (!datas.length) return null;
    return new Date(Math.min(...datas.map((d) => d.getTime())));
  }, [registros]);

  useEffect(() => {
    setRegistros(
      preview.map((r) => {
        // Se a categoria sugerida já existe, preenche com o id dela
        let categoriaId: string | undefined = undefined;
        if (r.categoriaSugerida && categorias.length > 0) {
          const match = categorias.find(
            (c: any) => c.name.toLowerCase() === r.categoriaSugerida.toLowerCase(),
          );
          if (match) categoriaId = match.id;
          else categoriaId = r.categoriaSugerida;
        } else if (r.categoriaSugerida) {
          categoriaId = r.categoriaSugerida;
        }
        // Se categoriaId for string vazia, deixa como undefined
        if (categoriaId === '') categoriaId = undefined;
        return {
          ...r,
          categoriaId,
          tagId: '',
          categoriaSugerida: r.categoriaSugerida || '',
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, categorias]);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategorias);
    fetch('/api/tags')
      .then((r) => r.json())
      .then(setTags);
  }, []);

  // Trunca uma string sem cortar no meio da palavra
  function truncateByWord(text: string | undefined, max = 60) {
    if (!text) return '';
    if (text.length <= max) return text;
    const sub = text.slice(0, max);
    const lastSpace = sub.lastIndexOf(' ');
    if (lastSpace === -1) return sub + '...';
    return sub.slice(0, lastSpace) + '...';
  }

  function handleEdit(index: number, field: string, value: string) {
    setRegistros((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function handleSaveComSaldo() {
    let novosRegistros = [...registros];
    if (saldoAnterior && dataPrimeiroLancamento) {
      // Gera data do saldo inicial: um dia antes do primeiro lançamento
      const dataSaldo = new Date(dataPrimeiroLancamento);
      dataSaldo.setDate(dataSaldo.getDate() - 1);
      // Formata para yyyy-mm-dd
  // format YYYY-MM-DD using local date parts to avoid timezone shifts
  const dataFormatada = formatYmd(dataSaldo);
      // Busca categoria "Saldo" (ou cria string caso não exista)
      let categoriaId = '';
      const catSaldo = categorias.find((c: any) => c.name.toLowerCase() === 'saldo');
      if (catSaldo) categoriaId = catSaldo.id;
      else categoriaId = 'Saldo';
      novosRegistros = [
        {
          data: dataFormatada,
          valor: saldoAnterior,
          descricao: 'Saldo inicial',
          descricaoSimplificada: 'Saldo inicial',
          categoriaId,
          categoriaSugerida: 'Saldo',
          tagId: '',
          tipo: 'RENDA_VARIAVEL',
          isSaldoInicial: true,
        },
        ...novosRegistros,
      ];
    }
    onSave(novosRegistros);
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
                <td
                  className="border px-2 py-1 min-w-[180px]"
                  title={row.descricao}
                >
                  {truncateByWord(row.descricao)}
                </td>
                <td className="border px-2 py-1 min-w-[180px]">
                  <Input
                    value={row.descricaoSimplificada || ''}
                    onChange={(e) => handleEdit(i, 'descricaoSimplificada', e.target.value)}
                    className="text-xs"
                  />
                </td>
                <td className="border px-2 py-1 min-w-[200px]">
                  <Select
                    value={row.categoriaId || ''}
                    onChange={(e) => handleEdit(i, 'categoriaId', e.target.value)}
                  >
                    <option value="">Nenhuma</option>
                    {/* Sugestão de categoria */}
                    {row.categoriaSugerida &&
                      !categorias.some((c: any) => c.name === row.categoriaSugerida) && (
                        <option value={row.categoriaSugerida} style={{ fontStyle: 'italic' }}>
                          Sugerida: {row.categoriaSugerida}
                        </option>
                      )}
                    {categorias.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="border px-2 py-1 min-w-[160px]">
                  <Select
                    value={row.tagId || ''}
                    onChange={(e) => handleEdit(i, 'tagId', e.target.value)}
                  >
                    <option value="">Nenhuma</option>
                    {tags.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
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
        <div className="flex gap-2 items-center">
          <Select value={selectedWallet} onChange={(e) => onWalletChange(e.target.value)}>
            <option value="">Selecione...</option>
            {wallets.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Button variant="default" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar carteira
          </Button>
        </div>
        {/* Campo de saldo anterior */}
        {selectedWallet && dataPrimeiroLancamento && (
          <div className="flex flex-col gap-1 mt-2">
            <Label>
              Saldo do dia anterior a {dataPrimeiroLancamento.toLocaleDateString('pt-BR')}:
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Informe o saldo anterior"
              value={saldoAnterior}
              onChange={(e) => setSaldoAnterior(e.target.value)}
              className="max-w-xs"
            />
            <span className="text-xs text-gray-500">
              Esse valor será lançado como renda variável na data do primeiro dia do extrato.
            </span>
          </div>
        )}
        <Button onClick={handleSaveComSaldo} disabled={!selectedWallet || saving}>
          {saving ? 'Salvando...' : 'Salvar lançamentos'}
        </Button>
        <WalletCreateModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={async (id: string) => {
            setCreateOpen(false);
            if (id && typeof id === 'string' && id.length) {
              // recarrega carteiras se função disponível e seleciona a criada
              if (fetchWallets) await fetchWallets();
              onWalletChange(id);
            }
          }}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">Importação realizada com sucesso!</div>}
      </div>
    </div>
  );
}
