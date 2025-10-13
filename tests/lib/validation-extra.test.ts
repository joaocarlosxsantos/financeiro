import { sanitizeObject, validateAndSanitize, secureNotificationSchemas } from '../../src/lib/validation';

describe('SanitizeObject - tipos mistos', () => {
  it('deve ignorar números, booleanos e datas', () => {
    const input = {
      nome: '<b>João</b>',
      idade: 30,
      ativo: true,
      nascimento: new Date('2000-01-01'),
      detalhes: {
        email: '<script>mal</script>email@teste.com',
        score: 99.9
      }
    };
    const result = sanitizeObject(input);
    expect(result.nome).toBe('João');
    expect(result.idade).toBe(30);
    expect(result.ativo).toBe(true);
    expect(result.nascimento instanceof Date).toBe(true);
    expect(result.detalhes.email).toBe('malemail@teste.com');
    expect(result.detalhes.score).toBe(99.9);
  });
});

describe('Validação de schema - campos opcionais e default', () => {
  it('deve aceitar campos opcionais ausentes', async () => {
    const input = {
      type: 'CUSTOM',
      title: 'Teste',
      message: 'Mensagem'
      // priority ausente
    };
    const validation = await validateAndSanitize(
      secureNotificationSchemas.create,
      input
    );
    expect(validation.success).toBe(true);
    if (validation.success) {
      const allowed = [undefined, 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      expect(allowed.includes(validation.data.priority)).toBe(true);
    }
  });
});

describe('SanitizeObject - arrays grandes', () => {
  it('deve sanitizar todos os itens de um array grande', () => {
    const arr = Array.from({ length: 100 }, (_, i) => `<script>${i}</script>Item${i}`);
    const input = { itens: arr };
    const result = sanitizeObject(input);
    for (let i = 0; i < 100; i++) {
      expect(result.itens[i]).toBe(`${i}Item${i}`);
    }
  });
});
