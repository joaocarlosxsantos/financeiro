import { logger } from '../../../../lib/logger';

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
  desc.includes('renda recorrente') ||
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
import { analyzeTransactionWithAI } from '@/lib/ai-categorization';



// Função para normalizar texto mal formatado
function normalizeText(text: string) {
  // Junta todas as letras e remove quebras de linha estranhas
  const joined = text.replace(/\n/g, '');
  // Remove espaços entre caracteres individuais e espaços duplicados
  return joined.replace(/\s+/g, '').trim();
}

// Função para parsing de texto mal formatado (genérica para qualquer PDF)
function parseMalformedText(text: string) {
  const transactions: any[] = [];
  console.log('Usando parsing para texto mal formatado');
  
  // Normaliza o texto primeiro
  const normalizedText = normalizeText(text);
  console.log('Texto normalizado (500 chars):', normalizedText.substring(0, 500));
  
  // Padrões genéricos para extrair transações baseados no formato normalizado (sem espaços)
  const patterns = [
    // Padrão principal: DESCRICAO2025-10-13-R$92,74 (com sinal negativo)
    /([A-ZÀ-Ú0-9]+?)(\d{4}-\d{2}-\d{2})-R\$([\d.,]+)/g,
    // Padrão para receitas: DESCRICAO2025-10-01R$1000,00 (sem sinal negativo)
    /([A-ZÀ-Ú0-9]+?)(\d{4}-\d{2}-\d{2})R\$([\d.,]+)/g
  ];
  
  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(normalizedText)) !== null) {
      const [fullMatch, descRaw, dateStr, amountRaw] = match;
      
      // Limpa e formata a descrição
      const description = descRaw.trim().replace(/\s{2,}/g, ' ');
      
      // Pula cabeçalhos e textos irrelevantes
      if (description.length < 3 || 
          description.includes('Extrato') || 
          description.includes('Nome') ||
          description.includes('CPF') ||
          description.includes('Saldo') ||
          description.includes('Período')) {
        continue;
      }
      
      // Converte data para formato brasileiro
      const [year, month, day] = dateStr.split('-');
      const data = `${day}/${month}/${year}`;
      
      // Converte valor
      let valor = parseFloat(amountRaw.replace(/\./g, '').replace(',', '.'));
      
      // Define se é receita ou despesa baseado no padrão
      if (fullMatch.includes('-R$')) {
        // Tem sinal negativo = despesa
        valor = -Math.abs(valor);
      } else {
        // Sem sinal negativo = pode ser receita, mas vamos assumir despesa por padrão
        // A menos que contenha palavras que indiquem receita
        if (description.toLowerCase().includes('benefício') || 
            description.toLowerCase().includes('recarga') ||
            description.toLowerCase().includes('crédito') ||
            description.toLowerCase().includes('depósito')) {
          valor = Math.abs(valor);
        } else {
          valor = -Math.abs(valor);
        }
      }
      
      // Melhora o nome da descrição
      let descricao = description;
      // Adiciona espaços entre palavras de forma mais inteligente
      // Primeiro detecta padrões de palavras completas concatenadas
      descricao = description
        .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2') // SUPERMERCADOS BH -> SUPERMERCADOS BH
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase -> camel Case
        .replace(/([A-Z])([A-Z][a-z])/g, '$1$2') // Corrige casos como S UPERMERCADOS
        .replace(/\s+/g, ' ') // Remove espaços duplos
        .trim();
      
      transactions.push({
        data,
        valor,
        descricao
      });
      
      console.log('Transação extraída:', { data, valor, descricao, original: description });
    }
  }
  
  console.log(`Total de transações extraídas: ${transactions.length}`);
  return transactions;
}

// Função para parsing de PDF com registros por data
function parsePdfGroupedByDate(text: string) {
  const transactions: any[] = [];
  
  // Processa texto normalmente
  const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
  
  let currentDate = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Tenta encontrar uma data no formato dd/MM/yyyy ou dd/MM/yy
    const dateMatch = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (dateMatch) {
      let [, day, month, year] = dateMatch;
      // Normaliza o ano para 4 dígitos se necessário
      if (year.length === 2) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        year = String(currentCentury + parseInt(year));
      }
      currentDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      continue;
    }
    
    // Se temos uma data atual, tenta extrair transações desta linha
    if (currentDate && line.length > 0) {
      // Procura por valor no final da linha (formato: R$ 123,45 ou -123,45 ou 123,45-)
      const valorMatch = line.match(/(.*?)\s+(R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})(-?)$/);
      if (valorMatch) {
        let [, descricao, , valorStr, negativeFlag] = valorMatch;
        descricao = descricao.trim().replace(/^R\$\s*/, '');
        
        // Converte valor para número
        let valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
        if (negativeFlag === '-' || valorStr.startsWith('-')) {
          valor = -Math.abs(valor);
        }
        
        if (descricao && !isNaN(valor)) {
          transactions.push({
            data: currentDate,
            valor,
            descricao: descricao.trim()
          });
        }
      }
    }
  }
  
  return transactions;
}

// Função para parsing de PDF com cada linha tendo data, descrição e valor (formato DD/MM/YYYY)
function parsePdfIndividualLines(text: string) {
  const transactions: any[] = [];
  console.log('Tentando parsing linha por linha (formato DD/MM/YYYY)');
  
  const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
  
  // Formato tradicional: data descrição valor na mesma linha
  for (const line of lines) {
    // Padrão tradicional: "01/01/2025 COMPRA SUPERMERCADO ABC -150,00"
    const lineMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.*?)\s+(R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})(-?)$/);
    if (lineMatch) {
      let [, dateStr, descricao, , valorStr, negativeFlag] = lineMatch;
      
      // Normaliza a data
      const dateParts = dateStr.split('/');
      if (dateParts.length === 3) {
        let [day, month, year] = dateParts;
        if (year.length === 2) {
          const currentYear = new Date().getFullYear();
          const currentCentury = Math.floor(currentYear / 100) * 100;
          year = String(currentCentury + parseInt(year));
        }
        const normalizedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        
        // Converte valor para número
        let valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
        if (negativeFlag === '-' || valorStr.startsWith('-')) {
          valor = -Math.abs(valor);
        }
        
        if (descricao.trim() && !isNaN(valor)) {
          transactions.push({
            data: normalizedDate,
            valor,
            descricao: descricao.trim()
          });
          
          console.log('Transação DD/MM extraída:', { data: normalizedDate, valor, descricao: descricao.trim() });
        }
      }
    }
  }
  
  console.log(`Total de transações DD/MM extraídas: ${transactions.length}`);
  return transactions;
}

// Função específica para parsing de arquivos TXT de extrato (formato como Alelo)
function parseTxtExtract(text: string) {
  const transactions: any[] = [];
  console.log('Tentando parsing de arquivo TXT de extrato');
  
  // Remove caracteres especiais e normaliza o texto
  const normalizedText = text.replace(/•/g, '').replace(/\r/g, '');
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Ignora cabeçalhos e informações do cartão
    if (line.includes('Extrato') || 
        line.includes('•••') || 
        line.includes('Periodo') || 
        line.includes('Nome do Portador') || 
        line.includes('CPF:') || 
        line.includes('Saldo R$') || 
        line.includes('Último benefício') ||
        line.includes('about:blank') ||
        line.includes('Consulta de Saldo') ||
        line.includes('MeuAlelo') ||
        line.match(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)) {
      continue;
    }
    
    // Procura por data no formato YYYY-MM-DD
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch && i > 0 && i + 1 < lines.length) {
      const dateStr = dateMatch[1];
      const [year, month, day] = dateStr.split('-');
      const data = `${day}/${month}/${year}`;
      
      // Linha anterior deve ser a descrição
      const descricaoLine = lines[i - 1];
      
      // Linha seguinte deve ser o valor
      const valorLine = lines[i + 1];
      
      // Verifica se o padrão está correto
      if (descricaoLine && valorLine) {
        // Processa o valor
        // Processa o valor (aceita tanto "- R$" quanto "-R$" quanto "R$")
        let valorMatch = valorLine.match(/^(-\s*)?R\$\s*([\d.,]+)$/);
        if (valorMatch) {
          const isNegative = !!valorMatch[1];
          const valueStr = valorMatch[2];
          let valor = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
          
          // Trata o sinal
          if (isNegative) {
            valor = -Math.abs(valor);
          } else {
            // Se não tem sinal negativo, verifica se é receita baseado na descrição
            if (descricaoLine.toLowerCase().includes('benefício') || 
                descricaoLine.toLowerCase().includes('recarga') ||
                descricaoLine.toLowerCase().includes('crédito') ||
                descricaoLine.toLowerCase().includes('depósito')) {
              valor = Math.abs(valor); // Receita
            } else {
              // Para extratos de cartão alimentação, sem sinal negativo geralmente são despesas
              valor = -Math.abs(valor);
            }
          }
          
          // Processa a descrição
          let descricao = descricaoLine.trim();
          
          // Melhora descrições específicas
          if (descricao.toLowerCase().includes('seu benefício caiu')) {
            descricao = 'Benefício Alimentação';
          } else if (descricao.toLowerCase().includes('supermercado')) {
            descricao = descricao.replace(/SUPERMERCADO/gi, 'Supermercado');
          } else if (descricao.toLowerCase().includes('outback')) {
            descricao = descricao.replace(/OUTBACK.*/, 'Outback Steakhouse');
          } else if (descricao.toLowerCase().includes('mcdonalds')) {
            descricao = 'McDonalds';
          }
          
          // Sugere categoria baseada na descrição
          let categoriaRecomendada = 'Alimentação';
          if (descricao.toLowerCase().includes('benefício')) {
            categoriaRecomendada = 'Receitas';
          } else if (descricao.toLowerCase().includes('supermercado')) {
            categoriaRecomendada = 'Supermercado';
          } else if (descricao.toLowerCase().includes('restaurante') || 
                     descricao.toLowerCase().includes('outback') ||
                     descricao.toLowerCase().includes('mcdonalds') ||
                     descricao.toLowerCase().includes('comercio') ||
                     descricao.toLowerCase().includes('lanchonete') ||
                     descricao.toLowerCase().includes('padaria')) {
            categoriaRecomendada = 'Alimentação';
          }
          
          transactions.push({
            data,
            valor,
            descricao,
            categoriaRecomendada,
            shouldCreateCategory: true
          });
          
          console.log('Transação TXT extraída:', { data, valor, descricao, categoriaRecomendada });
        }
      }
    }
  }
  
  console.log(`Total de transações TXT extraídas: ${transactions.length}`);
  return transactions;
}

// Função para parsing de extrato com formato estruturado (data YYYY-MM-DD com descrição e valor em linhas separadas)
function parseStructuredExtract(text: string) {
  const transactions: any[] = [];
  console.log('Tentando parsing de extrato estruturado (formato YYYY-MM-DD)');
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Procura por data no formato YYYY-MM-DD
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    
    const dateStr = dateMatch[1];
    const [year, month, day] = dateStr.split('-');
    const data = `${day}/${month}/${year}`;
    
    // Procura pela linha anterior que deve conter a descrição
    let descricao = 'Transação';
    if (i > 0) {
      const prevLine = lines[i - 1];
      // Se a linha anterior não contém data nem valor, é provavelmente a descrição
      if (!prevLine.match(/\d{4}-\d{2}-\d{2}/) && !prevLine.match(/R\$\s*[\d.,]+/)) {
        descricao = prevLine;
      }
    }
    
    // Procura pela próxima linha que deve conter o valor
    let valor = 0;
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      
      // Procura por valor com ou sem sinal negativo
      const valueMatch = nextLine.match(/(-\s*)?R\$\s*([\d.,]+)/);
      if (valueMatch) {
        const isNegative = !!valueMatch[1];
        const valueStr = valueMatch[2];
        valor = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
        
        if (isNegative) {
          valor = -Math.abs(valor);
        } else {
          // Para valores positivos, verifica se é um benefício/receita
          if (descricao.toLowerCase().includes('benefício') || 
              descricao.toLowerCase().includes('seu benefício caiu') ||
              descricao.toLowerCase().includes('recarga') ||
              descricao.toLowerCase().includes('crédito') ||
              descricao.toLowerCase().includes('depósito')) {
            valor = Math.abs(valor);
          } else {
            // Por padrão, considera como despesa mesmo sem sinal negativo
            valor = -Math.abs(valor);
          }
        }
        
        // Limpa e normaliza a descrição
        descricao = descricao
          .replace(/\s+/g, ' ')
          .trim();
        
        // Melhora descrições específicas
        if (descricao.toLowerCase().includes('seu benefício caiu')) {
          descricao = 'Benefício Alimentação';
        } else if (descricao.toLowerCase().includes('supermercado')) {
          // Mantém o nome do supermercado mas padroniza
          descricao = descricao.replace(/SUPERMERCADO/gi, 'Supermercado');
        } else if (descricao.toLowerCase().includes('outback')) {
          descricao = descricao.replace(/OUTBACK.*/, 'Outback Steakhouse');
        }
        
        // Sugere categoria relacionada à alimentação para esse formato
        let categoria = 'Alimentação';
        if (descricao.toLowerCase().includes('benefício')) {
          categoria = 'Receitas'; // Para os benefícios/receitas
        } else if (descricao.toLowerCase().includes('supermercado')) {
          categoria = 'Supermercado';
        } else if (descricao.toLowerCase().includes('restaurante') || 
                   descricao.toLowerCase().includes('outback') ||
                   descricao.toLowerCase().includes('comercio')) {
          categoria = 'Alimentação';
        }
        
        transactions.push({
          data,
          valor,
          descricao,
          categoriaRecomendada: categoria,
          shouldCreateCategory: true
        });
        
        console.log('Transação estruturada extraída:', { data, valor, descricao });
      }
    }
  }
  
  console.log(`Total de transações estruturadas extraídas: ${transactions.length}`);
  return transactions;
}


async function parsePdfExtract(text: string) {
  try {
    // Verifica se é texto mal formatado e usa normalização
    const lines = text.split('\n');
    const singleCharLines = lines.filter(line => line.trim().length === 1).length;
    const ratio = singleCharLines / lines.length;
    
    if (ratio > 0.5) {
      console.log('Detectado texto mal formatado, usando normalização');
      return parseMalformedText(text);
    }
    
    // Tenta primeiro o formato agrupado por data
    let transactions = parsePdfGroupedByDate(text);
    
    // Se não encontrou transações, tenta o formato individual (DD/MM/YYYY)
    if (transactions.length === 0) {
      transactions = parsePdfIndividualLines(text);
    }
    
    // Se ainda não encontrou, tenta o formato estruturado (YYYY-MM-DD)
    if (transactions.length === 0) {
      transactions = parseStructuredExtract(text);
    }
    
    // Se ainda não encontrou, tenta padrões mais flexíveis
    if (transactions.length === 0) {
      // Busca por qualquer linha que contenha data e valor
      const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
      
      for (const line of lines) {
        // Padrão mais flexível: qualquer data + qualquer valor na linha
        const flexibleMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}).*?(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})/);
        if (flexibleMatch) {
          const [, dateStr, valorStr] = flexibleMatch;
          
          // Extrai descrição (tudo entre data e valor)
          const descricaoMatch = line.match(/\d{1,2}\/\d{1,2}\/\d{2,4}\s+(.*?)\s+-?\d{1,3}(?:\.\d{3})*,\d{2}/);
          const descricao = descricaoMatch ? descricaoMatch[1].trim() : 'Transação';
          
          // Normaliza data
          const dateParts = dateStr.split('/');
          if (dateParts.length === 3) {
            let [day, month, year] = dateParts;
            if (year.length === 2) {
              const currentYear = new Date().getFullYear();
              const currentCentury = Math.floor(currentYear / 100) * 100;
              year = String(currentCentury + parseInt(year));
            }
            const normalizedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
            
            // Converte valor
            const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
            
            if (!isNaN(valor)) {
              transactions.push({
                data: normalizedDate,
                valor,
                descricao
              });
            }
          }
        }
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Erro ao processar texto de PDF:', error);
    throw new Error('Erro ao processar texto do arquivo PDF');
  }
}

async function handler(req: NextRequest) {
  // Busca categorias do usuário logado (se autenticado)
  let categoriasUsuario: any[] = [];
  let user: any = null;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      user = await prisma.user.findUnique({ 
        where: { email: session.user.email },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              type: true,
              color: true,
              icon: true
            }
          }
        }
      });
      if (user) {
        categoriasUsuario = user.categories;
      }
    }
  } catch (error) {
    logger.error(
      'Erro ao buscar categorias do usuário em /api/importar-extrato/parse',
      error
    );
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
  
  let preview: any[] = [];
  let transactions: any[] = [];
  

  
  // Processa texto (incluindo texto extraído de PDF)
  if (file.name.endsWith('.txt') || file.type === 'text/plain') {
    try {
      const text = await file.text();
      console.log('Processando arquivo TXT. Tamanho:', text.length);
      
      // Tenta primeiro o parsing específico para TXT de extrato
      transactions = parseTxtExtract(text) || [];
      
      // Se não encontrou transações com o parser TXT, tenta os parsers de PDF
      if (transactions.length === 0) {
        console.log('Parser TXT não encontrou transações, tentando parsers de PDF...');
        transactions = await parsePdfExtract(text);
      }
      
      if (transactions.length === 0) {
        return NextResponse.json(
          { 
            error: 'Nenhuma transação foi encontrada no texto. Verifique se o arquivo contém dados no formato esperado (data, descrição, valor).',
            debug: {
              fileSize: text.length,
              sample: text.substring(0, 200),
              hasExtractKeywords: text.toLowerCase().includes('extrato') || text.includes('Benefício'),
              hasDate: /20\d{2}-\d{2}-\d{2}/.test(text) || /\d{2}\/\d{2}\/\d{4}/.test(text),
              lines: text.split('\n').length
            }
          },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Erro ao processar arquivo de texto', details: String(error) },
        { status: 400 }
      );
    }
  }
  // Processa OFX
  else if (file.name.endsWith('.ofx') || (await file.text()).trim().startsWith('<OFX')) {
    const text = await file.text();
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
      // Busca tags do usuário uma só vez para todas as transações
      let tagsUsuario: any[] = [];
      if (user) {
        try {
          tagsUsuario = await prisma.tag.findMany({
            where: { userId: user.id },
            select: { id: true, name: true }
          });
        } catch (error) {
          console.error('Erro ao buscar tags:', error);
        }
      }

      preview = await Promise.all(transactions.map(async (t: any) => {
        // Normaliza data OFX (YYYYMMDD ou YYYYMMDDHHMMSS)
        let rawDate = t.DTPOSTED || t.date || '';
        let data = '';
        if (rawDate && typeof rawDate === 'string') {
          const match = rawDate.match(/(\d{4})(\d{2})(\d{2})/);
          if (match) {
            // Retorna no formato dd/MM/yyyy para a API de salvar processar corretamente
            data = `${match[3]}/${match[2]}/${match[1]}`; // dd/MM/yyyy
          }
        }
        const valor = Number(t.TRNAMT || t.amount || 0);
        const descricao = String(
          t.MEMO || t.memo || t.NAME || t.name || t.PAYEE || t.payee || '',
        ).trim();

        // Usa IA para análise da transação
        let aiAnalysis: any = null;
        let categoriaRecomendada = '';
        let categoriaId = '';
        let descricaoMelhorada = descricao;
        let tagsRecomendadas: string[] = [];
        let shouldCreateCategory = false;
        
        try {
          if (user && descricao) {
            aiAnalysis = await analyzeTransactionWithAI(descricao, valor, categoriasUsuario);
            
            // Verifica se categoria sugerida existe
            const removeAcentos = (str: string) => str.normalize('NFD').replace(/[̀-ͯ]/g, '');
            const categoriaExistente = categoriasUsuario.find(
              (cat) =>
                removeAcentos(cat.name.toLowerCase()) ===
                removeAcentos(aiAnalysis.suggestedCategory.toLowerCase()),
            );
            
            if (categoriaExistente) {
              // Categoria existe - usar ela
              categoriaRecomendada = categoriaExistente.name;
              categoriaId = categoriaExistente.id;
              shouldCreateCategory = false;
            } else {
              // Categoria não existe - sugerir criação
              categoriaRecomendada = aiAnalysis.suggestedCategory;
              shouldCreateCategory = true;
            }
            
            descricaoMelhorada = aiAnalysis.enhancedDescription;
            
            // Verifica tags e filtra apenas as que não existem
            const tagsNaoExistentes = aiAnalysis.suggestedTags.filter((tagSugerida: string) => {
              return !tagsUsuario.some(tagExistente => 
                removeAcentos(tagExistente.name.toLowerCase()) === 
                removeAcentos(tagSugerida.toLowerCase())
              );
            });
            
            // Tags recomendadas são apenas as que precisam ser criadas
            tagsRecomendadas = tagsNaoExistentes;
          }
        } catch (error) {
          console.error('Erro na análise IA:', error);
          // Fallback para método antigo se IA falhar
          const descricaoSimplificada = simplificarDescricao(descricao);
          const categoriaSugerida = sugerirCategoria(descricaoSimplificada);
          descricaoMelhorada = descricaoSimplificada || descricao;
          
          // Verifica se categoria do fallback existe
          const removeAcentos = (str: string) => str.normalize('NFD').replace(/[̀-ͯ]/g, '');
          const categoriaExistente = categoriasUsuario.find(
            (cat) =>
              removeAcentos(cat.name.toLowerCase()) ===
              removeAcentos(categoriaSugerida.toLowerCase()),
          );
          
          if (categoriaExistente) {
            categoriaRecomendada = categoriaExistente.name;
            categoriaId = categoriaExistente.id;
            shouldCreateCategory = false;
          } else {
            categoriaRecomendada = categoriaSugerida;
            shouldCreateCategory = true;
          }
        }
        
        return {
          data,
          valor,
          descricao,
          descricaoOriginal: descricao,
          descricaoMelhorada,
          categoriaRecomendada,
          categoriaId,
          tagsRecomendadas,
          shouldCreateCategory,
          aiAnalysis: aiAnalysis ? {
            confidence: aiAnalysis.confidence,
            merchant: aiAnalysis.merchant,
            location: aiAnalysis.location,
            categoryType: aiAnalysis.categoryType
          } : null,
        };
      }));
    } catch (e) {
      return NextResponse.json(
        { error: 'Erro ao processar OFX', details: String(e), debug: text.slice(0, 200) },
        { status: 400 },
      );
    }
  }
  
  // Processa transações do PDF (aplicando a mesma lógica de IA que OFX)
  if (transactions.length > 0) {
    console.log(`Processando ${transactions.length} transações para preview com IA`);
    
    // Busca tags do usuário uma só vez para todas as transações
    let tagsUsuario: any[] = [];
    if (user) {
      try {
        tagsUsuario = await prisma.tag.findMany({
          where: { userId: user.id },
          select: { id: true, name: true }
        });
      } catch (error) {
        console.error('Erro ao buscar tags:', error);
      }
    }

    try {
      preview = await Promise.all(transactions.map(async (t: any) => {
      const data = t.data;
      const valor = t.valor;
      const descricao = t.descricao;

      // Usa IA para análise da transação (ou categoria já sugerida pelo parser)
      let aiAnalysis: any = null;
      let categoriaRecomendada = t.categoriaRecomendada || ''; // Pode já vir do parser específico (ex: Alelo)
      let categoriaId = '';
      let descricaoMelhorada = descricao;
      let tagsRecomendadas: string[] = [];
      let shouldCreateCategory = t.shouldCreateCategory || false; // Pode já vir definido
      
      try {
        if (user && descricao && !categoriaRecomendada) { // Só usa IA se não há categoria sugerida
          aiAnalysis = await analyzeTransactionWithAI(descricao, valor, categoriasUsuario);
          
          // Verifica se categoria sugerida existe
          const removeAcentos = (str: string) => str.normalize('NFD').replace(/[̀-ͯ]/g, '');
          const categoriaExistente = categoriasUsuario.find(
            (cat) =>
              removeAcentos(cat.name.toLowerCase()) ===
              removeAcentos(aiAnalysis.suggestedCategory.toLowerCase()),
          );
          
          if (categoriaExistente) {
            // Categoria existe - usar ela
            categoriaRecomendada = categoriaExistente.name;
            categoriaId = categoriaExistente.id;
            shouldCreateCategory = false;
          } else {
            // Categoria não existe - sugerir criação
            categoriaRecomendada = aiAnalysis.suggestedCategory;
            shouldCreateCategory = true;
          }
          
          descricaoMelhorada = aiAnalysis.enhancedDescription;
          
          // Verifica tags e filtra apenas as que não existem
          const tagsNaoExistentes = aiAnalysis.suggestedTags.filter((tagSugerida: string) => {
            return !tagsUsuario.some(tagExistente => 
              removeAcentos(tagExistente.name.toLowerCase()) === 
              removeAcentos(tagSugerida.toLowerCase())
            );
          });
          
          // Tags recomendadas são apenas as que precisam ser criadas
          tagsRecomendadas = tagsNaoExistentes;
        }
      } catch (error) {
        console.error('Erro na análise IA:', error);
        // Fallback para método antigo se IA falhar e não há categoria já sugerida
        if (!categoriaRecomendada) {
          const descricaoSimplificada = simplificarDescricao(descricao);
          const categoriaSugerida = sugerirCategoria(descricaoSimplificada);
          descricaoMelhorada = descricaoSimplificada || descricao;
          
          // Verifica se categoria do fallback existe
          const removeAcentos = (str: string) => str.normalize('NFD').replace(/[̀-ͯ]/g, '');
          const categoriaExistente = categoriasUsuario.find(
            (cat) =>
              removeAcentos(cat.name.toLowerCase()) ===
              removeAcentos(categoriaSugerida.toLowerCase()),
          );
          
          if (categoriaExistente) {
            categoriaRecomendada = categoriaExistente.name;
            categoriaId = categoriaExistente.id;
            shouldCreateCategory = false;
          } else {
            categoriaRecomendada = categoriaSugerida;
            shouldCreateCategory = true;
          }
        }
      }
      
      // Se categoria veio do parser específico, verificar se já existe no sistema
      if (categoriaRecomendada && !categoriaId) {
        const removeAcentos = (str: string) => str.normalize('NFD').replace(/[̀-ͯ]/g, '');
        const categoriaExistente = categoriasUsuario.find(
          (cat) =>
            removeAcentos(cat.name.toLowerCase()) ===
            removeAcentos(categoriaRecomendada.toLowerCase()),
        );
        
        if (categoriaExistente) {
          categoriaId = categoriaExistente.id;
          shouldCreateCategory = false;
        } else {
          shouldCreateCategory = true;
        }
      }
      
      return {
        data,
        valor,
        descricao,
        descricaoOriginal: descricao,
        descricaoMelhorada,
        categoriaRecomendada,
        categoriaId,
        tagsRecomendadas,
        shouldCreateCategory,
        aiAnalysis: aiAnalysis ? {
          confidence: aiAnalysis.confidence,
          merchant: aiAnalysis.merchant,
          location: aiAnalysis.location,
          categoryType: aiAnalysis.categoryType
        } : null,
      };
    }));
    } catch (error) {
      console.error('Erro ao processar transações PDF para preview:', error);
      return NextResponse.json(
        { error: 'Erro ao processar transações para preview', details: String(error) },
        { status: 400 }
      );
    }
  }
  
  console.log(`Preview final: ${preview?.length || 0} transações`);
  console.log('Primeiras 3 transações do preview:', preview?.slice(0, 3));
  
  if (!preview || preview.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum lançamento encontrado no arquivo.', preview: [] },
      { status: 400 },
    );
  }
  return NextResponse.json({ preview });
}

export { handler as POST };
