// Script de teste para batch import
const testBatchImport = async () => {
  // Simular dados que viriam do frontend
  const testData = {
    batches: [
      {
        registros: [
          {
            data: "14/10/2025",
            descricao: "PIX TRANSFERENCIA JOAO SANTOS",
            valor: -100.50,
            isSaldoInicial: false
          },
          {
            data: "13/10/2025", 
            descricao: "TED SALARIO EMPRESA XYZ",
            valor: 500.00,
            isSaldoInicial: false
          },
          {
            data: "12/10/2025",
            descricao: "COMPRA MERCADO PAGO", 
            valor: -25.90,
            isSaldoInicial: false
          }
        ],
        sourceFile: "test.ofx"
      },
      {
        registros: [
          {
            data: "14/10/2025",
            descricao: "PIX PADARIA SILVA",
            valor: -50.00,
            isSaldoInicial: false  
          },
          {
            data: "13/10/2025",
            descricao: "DEPOSITO EM DINHEIRO",
            valor: 200.00,
            isSaldoInicial: false
          }
        ],
        sourceFile: "test2.ofx"
      }
    ],
    carteiraId: "test-wallet-id", // Você precisará usar um ID válido
    processInBackground: true
  };

  try {
    const response = await fetch('/api/importar-extrato/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

// testBatchImport();
console.log('Test script loaded. Execute testBatchImport() to run.');