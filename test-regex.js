// Teste das regex para Alelo
const testText = `SUPERMERCADOS BH 2025-10-13 -R$ 92,74
ERONGOURMET ALIMENT 2025-10-13 -R$ 19,90
Seu Benefício Caiu 2025-10-01 R$ 1000,00`;

console.log('=== TESTE REGEX ALELO ===');
console.log('Texto de teste:', testText);

// Regex principal
const aleloRegex = /([A-Z][A-Z\s\d]{3,}?)\s*(20\d{2}-\d{2}-\d{2})\s*(-?\s*R?\s*\$?\s*\d{1,3}(?:\.\d{3})*,\d{2})/gi;

let match;
let count = 0;
while ((match = aleloRegex.exec(testText)) !== null) {
  count++;
  const [fullMatch, estabelecimento, dateStr, valorStr] = match;
  console.log(`Match ${count}:`, { estabelecimento: estabelecimento.trim(), dateStr, valorStr });
}

// Regex benefício
const beneficioRegex = /(Seu\s*Benefício\s*Caiu|benefício)\s*(20\d{2}-\d{2}-\d{2})\s*(R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2})/gi;

beneficioRegex.lastIndex = 0;
while ((match = beneficioRegex.exec(testText)) !== null) {
  count++;
  const [, tipo, dateStr, valorStr] = match;
  console.log(`Benefício:`, { tipo, dateStr, valorStr });
}

console.log(`Total matches: ${count}`);