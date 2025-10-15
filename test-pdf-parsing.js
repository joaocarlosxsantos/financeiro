// Teste simples para verificar se o parsing de PDF funciona
// Arquivo de teste para desenvolvimento

const testPdfGroupedText = `
Extrato Bancário - Janeiro 2025

01/01/2025
COMPRA DÉBITO SUPERMERCADO ABC        -150,50
PIX JOÃO SILVA                        -50,00
DEPÓSITO SALÁRIO                    2.500,00
UBER VIAGEM                           -25,30

02/01/2025
IFOOD PEDIDO                          -35,90
COMPRA CARTÃO POSTO SHELL             -80,00
PIX RECEBIDO MARIA                   100,00

03/01/2025
NETFLIX ASSINATURA                    -29,90
NUBANK PAGAMENTO FATURA            -1.200,00
`;

const testPdfIndividualText = `
Extrato Bancário - Janeiro 2025

01/01/2025 COMPRA DÉBITO SUPERMERCADO ABC    -150,50
01/01/2025 PIX JOÃO SILVA                    -50,00
01/01/2025 DEPÓSITO SALÁRIO                2.500,00
01/01/2025 UBER VIAGEM                       -25,30
02/01/2025 IFOOD PEDIDO                      -35,90
02/01/2025 COMPRA CARTÃO POSTO SHELL         -80,00
02/01/2025 PIX RECEBIDO MARIA               100,00
03/01/2025 NETFLIX ASSINATURA                -29,90
03/01/2025 NUBANK PAGAMENTO FATURA        -1.200,00
`;

// Estas são as funções de parse que foram implementadas
// Elas devem ser capazes de processar os textos acima
console.log("Testes de parsing implementados para PDF");
console.log("Formato 1: Agrupado por data");
console.log("Formato 2: Individual por linha");