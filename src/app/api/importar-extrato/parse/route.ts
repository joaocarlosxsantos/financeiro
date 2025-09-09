// Função simples de simplificação de descrição
function sugerirCategoria(descricaoSimplificada: string): string {
  if (!descricaoSimplificada) return 'PIX/TRANSF';
  const desc = descricaoSimplificada.toLowerCase();
  // Se for referência ao 'uber' manter associação específica
  if (desc.includes('uber')) return 'Uber/99';
  // Se for apenas número (ex: '99') ou conter 99 pop, mapear para Compras Cartão
  if (desc === '99' || desc.includes('99 pop')) return 'Compras Cartão';
  // Se for uma string numérica mascarada (ex: '99* 99*' -> '99'), tratar como compra cartão
  if (/^\d+$/.test(desc)) return 'Compras Cartão';
  if (desc.includes('ifood')) return 'Ifood';
  if (
    desc.includes('mercado') ||
    desc.includes('carrefour') ||
    desc.includes('pao de acucar') ||
    desc.includes('supermercado')
  )
    return 'Supermercado';
  if (desc.includes('spotify') || desc.includes('netflix') || desc.includes('prime video'))
    return 'Assinaturas';
  if (
    desc.includes('nubank') ||
    desc.includes('itau') ||
    desc.includes('santander') ||
    desc.includes('banco do brasil') ||
    desc.includes('caixa')
  )
    return 'PIX/TRANSF';
  if (desc.includes('pagseguro') || desc.includes('pag*')) return 'Pagamentos';
  if (desc.includes('google') || desc.includes('apple')) return 'Tecnologia';
  if (desc.includes('farmacia') || desc.includes('drogaria')) return 'Saúde';
  if (
    desc.includes('bar') ||
    desc.includes('restaurante') ||
    desc.includes('lanchonete') ||
    desc.includes('food')
  )
    return 'Alimentação';
  if (desc.includes('cinema') || desc.includes('lazer') || desc.includes('parque')) return 'Lazer';
  // Tentativa de capturar compras no cartão/débito
  if (
    desc.includes('compra') ||
    desc.includes('compras') ||
    desc.includes('compra débito') ||
    desc.includes('compra debito') ||
    desc.includes('compra crédito') ||
    desc.includes('compra credito') ||
    desc.includes('cartao') ||
    desc.includes('cartão')
  )
    return 'Compras Cartão';
  if (desc.includes('educac') || desc.includes('Educac')) return 'Educação';
  if (desc.includes('Fatura') || desc.includes('fatura')) return 'Fatura Cartão';
  if (desc.includes('FGTS') || desc.includes('Fgts') || desc.includes('fgts')) return 'FGTS';
  // Investimentos
  if (
    desc.includes('cdb') ||
    desc.includes('tesouro') ||
    desc.includes('lci') ||
    desc.includes('lca') ||
    desc.includes('fundo') ||
    desc.includes('ações') ||
    desc.includes('acao') ||
    desc.includes('ações') ||
    desc.includes('renda fixa') ||
    desc.includes('renda variável') ||
    desc.includes('renda variavel') ||
    desc.includes('investimento') ||
    desc.includes('investimentos') ||
    desc.includes('b3') ||
    desc.includes('fiis') ||
    desc.includes('fii') ||
    desc.includes('debênture') ||
    desc.includes('debenture')
  )
    return 'Investimentos';
  if (desc.includes('pix') || desc.includes('transf')) return 'PIX/TRANSF';
  // fallback
  return 'PIX/TRANSF';
}

function simplificarDescricao(descricao: string): string {
  if (!descricao) return '';
  const raw = descricao.trim();
  const desc = raw.toLowerCase();

  // Primeiro: detectar transações de compra no débito/crédito e tentar extrair o merchant
  const isCompraCard =
    desc.includes('compra') &&
    (desc.includes('débito') || desc.includes('debito') || desc.includes('cr[ée]dito') || desc.includes('credito') || desc.includes('cartao') || desc.includes('cartão'));
  if (isCompraCard) {
    // tenta extrair texto após um separador comum ( - , : , — )
    const parts = raw.split(/[-:–—]/);
    let merchant = parts.length > 1 ? parts.slice(1).join('-').trim() : '';
    if (!merchant) {
      // tenta capturar texto logo após a palavra débito/crédito/cartão
      const m = raw.match(/(?:d[eé]bito|cr[ée]dito|credito|cart[aã]o|cartao)\s*[:\-–—]?\s*(.+)$/i);
      if (m && m[1]) merchant = m[1].trim();
    }
    if (merchant) {
      // Se merchant é algo como "99* 99*" extrai o primeiro grupo numérico
      const num = merchant.match(/(\d{2,})/);
      if (num) return num[1];
      // Remove estrelas e excesso de espaços/pontuação
      return merchant.replace(/\*/g, '').replace(/[\s]{2,}/g, ' ').replace(/[,.]\s*$/g, '').trim();
    }
    // Se não encontrou merchant, retornar a descrição completa (não cortar para 'Compra')
    return raw;
  }

  // Dicionário de padrões comuns (não sobrescrever casos específicos acima)
  if (desc.includes('uber')) return 'Uber';
  if (desc.includes('99*') || desc.includes('99 pop')) return '99 Pop';
  if (desc.includes('ifd') || desc.includes('ifood')) return 'Ifood';
  if (desc.includes('mercado livre')) return 'Mercado Livre';
  if (desc.includes('nubank')) return 'Nubank';
  if (desc.includes('pag*') || desc.includes('pagseguro')) return 'PagSeguro';
  if (desc.includes('pix')) return 'Pix';
  if (desc.includes('itau')) return 'Itaú';
  if (desc.includes('santander')) return 'Santander';
  if (desc.includes('banco do brasil')) return 'Banco do Brasil';
  if (desc.includes('caixa economica')) return 'Caixa';
  if (desc.includes('spotify')) return 'Spotify';
  if (desc.includes('netflix')) return 'Netflix';
  if (desc.includes('amazon')) return 'Amazon';
  if (desc.includes('google')) return 'Google';
  if (desc.includes('apple')) return 'Apple';
  if (desc.includes('Pagamento Fatura') || desc.includes('fatura')) return 'Fatura';
  if (desc.includes('FGTS') || desc.includes('Fgts') || desc.includes('fgts')) return 'FGTS';

  // Se for nome de pessoa (muitas palavras, sem palavras-chave conhecidas)
  const palavras = raw.replace(/\*/g, '').trim().split(/\s+/);
  if (palavras.length >= 2 && palavras.length <= 4 && palavras.every((p) => /^[A-Za-zÀ-ÿ]+$/.test(p))) {
    return palavras.slice(0, 2).join(' ');
  }

  // Heurística: pega a primeira 1-2 tokens relevantes (mantendo números e letras)
  const match = raw.match(/([A-Za-z0-9]+[\s\*]*){1,2}/);
  if (match) return match[0].replace(/\*/g, '').trim();
  return raw.split(' ')[0];
}

import { NextRequest, NextResponse } from 'next/server';
// import Papa from 'papaparse';
// @ts-ignore
import * as ofxParser from 'ofx-parser';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function handler(req: NextRequest) {
  // Busca categorias do usuário logado (se autenticado)
  let categoriasUsuario: any[] = [];
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (user) {
        categoriasUsuario = await prisma.category.findMany({ where: { userId: user.id } });
      }
    }
  } catch {}

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
  const text = await file.text();
  let preview: any[] = [];
  if (file.name.endsWith('.ofx') || text.trim().startsWith('<OFX')) {
    // Parse OFX
    try {
      const parsed = await ofxParser.parse(text);
      let transactions: any[] = [];
      // Extrato bancário
      const ofxObj: any = parsed?.OFX;
      const bank = ofxObj?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN;
      const cc = ofxObj?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN;
      transactions = bank || cc || [];
      if (!Array.isArray(transactions)) transactions = transactions ? [transactions] : [];
      if (transactions.length === 0) {
        return NextResponse.json(
          {
            error: 'Nenhuma transação encontrada no arquivo OFX',
            debug: { keys: Object.keys(ofxObj || {}) },
          },
          { status: 400 },
        );
      }
      preview = transactions.map((t: any) => {
        // Normaliza data OFX (YYYYMMDD ou YYYYMMDDHHMMSS)
        let rawDate = t.DTPOSTED || t.date || '';
        let data = '';
        if (rawDate && typeof rawDate === 'string') {
          const match = rawDate.match(/(\d{4})(\d{2})(\d{2})/);
          if (match) {
            data = `${match[3]}/${match[2]}/${match[1]}`; // dd/MM/yyyy
          }
        }
        const valor = Number(t.TRNAMT || t.amount || 0);
        const descricao = String(
          t.MEMO || t.memo || t.NAME || t.name || t.PAYEE || t.payee || '',
        ).trim();
        const descricaoSimplificada = simplificarDescricao(descricao);
        // Sugerir/pre-selecionar categoria existente se similar
        let categoriaSugerida = sugerirCategoria(descricaoSimplificada);
        if (categoriaSugerida && categoriasUsuario.length > 0) {
          // Função para remover acentos (sem regex ES6)
          const removeAcentos = (str: string) => str.normalize('NFD').replace(/[̀-ͯ]/g, '');
          const match = categoriasUsuario.find(
            (cat) =>
              removeAcentos(cat.name.toLowerCase()) ===
              removeAcentos(categoriaSugerida.toLowerCase()),
          );
          if (match) categoriaSugerida = match.name;
        }
        return {
          data,
          valor,
          descricao,
          descricaoSimplificada,
          categoriaSugerida,
        };
      });
    } catch (e) {
      return NextResponse.json(
        { error: 'Erro ao processar OFX', details: String(e), debug: text.slice(0, 200) },
        { status: 400 },
      );
    }
  }
  if (!preview || preview.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum lançamento encontrado no arquivo.', preview: [] },
      { status: 400 },
    );
  }
  return NextResponse.json({ preview });
}

export { handler as POST };
