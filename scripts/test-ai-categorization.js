/**
 * Script de demonstração das melhorias de IA na importação de extrato
 * Execute com: node scripts/test-ai-categorization.js
 */

const { analyzeTransactionWithAI, batchAnalyzeTransactions } = require('../src/lib/ai-categorization');

// Dados de teste simulando transações reais
const testTransactions = [
  {
    description: "COMPRA CARTAO DEBITO 99* 99*",
    amount: -15.50
  },
  {
    description: "PAG*SPOTIFY BR SAO PAULO",
    amount: -16.90
  },
  {
    description: "PIX TRANSFERENCIA JOAO SILVA",
    amount: -200.00
  },
  {
    description: "COMPRA CARTAO CREDITO MERCADO LIVRE",
    amount: -89.99
  },
  {
    description: "DEP TRANSFERENCIA SALARIO",
    amount: 3500.00
  },
  {
    description: "COMPRA DEBITO CARREFOUR HIPER",
    amount: -156.78
  },
  {
    description: "UBER *TRIP 4X8Y9",
    amount: -23.45
  },
  {
    description: "IFOOD *PEDIDO ABC123",
    amount: -42.30
  },
  {
    description: "FARMACIA DROGASIL CENTRO",
    amount: -34.50
  },
  {
    description: "NETFLIX.COM",
    amount: -45.90
  }
];

// Categorias existentes simuladas
const existingCategories = [
  { name: "Alimentação", type: "EXPENSE" },
  { name: "Transporte", type: "EXPENSE" },
  { name: "Saúde", type: "EXPENSE" },
  { name: "Supermercado", type: "EXPENSE" },
  { name: "Salário", type: "INCOME" },
  { name: "Tecnologia", type: "EXPENSE" }
];

async function demonstrateAI() {
  console.log("🧠 DEMONSTRAÇÃO: Sistema de IA para Importação de Extrato\n");
  console.log("=" .repeat(80));
  
  // Testa análise individual
  console.log("\n📋 ANÁLISE INDIVIDUAL DE TRANSAÇÕES:");
  console.log("-".repeat(50));
  
  for (let i = 0; i < 3; i++) {
    const transaction = testTransactions[i];
    console.log(`\n${i + 1}. Transação Original:`);
    console.log(`   Descrição: "${transaction.description}"`);
    console.log(`   Valor: R$ ${transaction.amount.toFixed(2)}`);
    
    try {
      const analysis = await analyzeTransactionWithAI(
        transaction.description,
        transaction.amount,
        existingCategories
      );
      
      console.log(`\n   🔍 Análise da IA:`);
      console.log(`   ✨ Descrição Melhorada: "${analysis.enhancedDescription}"`);
      console.log(`   📂 Categoria Sugerida: "${analysis.suggestedCategory}"`);
      console.log(`   🎯 Confiança: ${(analysis.confidence * 100).toFixed(1)}%`);
      console.log(`   🏷️  Tags: [${analysis.suggestedTags.join(', ')}]`);
      console.log(`   💡 Tipo: ${analysis.categoryType}`);
      
      if (analysis.merchant) {
        console.log(`   🏪 Estabelecimento: ${analysis.merchant}`);
      }
      
      if (analysis.shouldCreateCategory) {
        console.log(`   ➕ Sugestão: Criar nova categoria "${analysis.suggestedCategory}"`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro na análise: ${error.message}`);
    }
  }
  
  // Testa análise em lote
  console.log("\n\n📦 ANÁLISE EM LOTE:");
  console.log("-".repeat(50));
  
  try {
    const batchResults = await batchAnalyzeTransactions(
      testTransactions,
      existingCategories
    );
    
    console.log(`\n✅ Processadas ${batchResults.length} transações com sucesso!\n`);
    
    // Estatísticas
    const stats = {
      highConfidence: batchResults.filter(r => r.confidence >= 0.8).length,
      mediumConfidence: batchResults.filter(r => r.confidence >= 0.6 && r.confidence < 0.8).length,
      lowConfidence: batchResults.filter(r => r.confidence < 0.6).length,
      shouldCreateCategory: batchResults.filter(r => r.shouldCreateCategory).length,
      uniqueCategories: [...new Set(batchResults.map(r => r.suggestedCategory))].length,
      totalTags: batchResults.reduce((acc, r) => acc + r.suggestedTags.length, 0)
    };
    
    console.log("📊 ESTATÍSTICAS:");
    console.log(`   🎯 Alta confiança (≥80%): ${stats.highConfidence} transações`);
    console.log(`   🎯 Média confiança (60-79%): ${stats.mediumConfidence} transações`);
    console.log(`   🎯 Baixa confiança (<60%): ${stats.lowConfidence} transações`);
    console.log(`   ➕ Novas categorias sugeridas: ${stats.shouldCreateCategory}`);
    console.log(`   📂 Categorias únicas identificadas: ${stats.uniqueCategories}`);
    console.log(`   🏷️  Total de tags sugeridas: ${stats.totalTags}`);
    
    // Mostra resumo das melhorias
    console.log("\n🎉 RESUMO DAS MELHORIAS:");
    console.log("-".repeat(30));
    
    batchResults.forEach((result, index) => {
      const original = testTransactions[index];
      if (result.enhancedDescription !== original.description) {
        console.log(`\n${index + 1}. "${original.description}"`);
        console.log(`   → "${result.enhancedDescription}" (${result.suggestedCategory})`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Erro na análise em lote: ${error.message}`);
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("🎯 Demonstração concluída! O sistema está pronto para uso.");
}

// Funções auxiliares para cores no terminal
function colorize(text, color) {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
  };
  return `${colors[color] || ''}${text}${colors.reset}`;
}

// Executa a demonstração
if (require.main === module) {
  demonstrateAI().catch(console.error);
}

module.exports = { demonstrateAI };