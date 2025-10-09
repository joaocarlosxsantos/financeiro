jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));

jest.mock('next/server', () => ({jest.mock('next/server', () => ({

  NextRequest: class {},  NextRequest: class {},

  NextResponse: {  NextResponse: {

    json: (body: any, opts?: any) => ({ body, opts }),    json: (body: any, opts?: any) => ({ body, opts }),

  },  },

}));}));



jest.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: jest.fn(() => ({})) }));jest.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: jest.fn(() => ({})) }));



jest.mock('@/lib/prisma', () => ({jest.mock('@/lib/prisma', () => ({

  prisma: {  prisma: {

    user: { findUnique: jest.fn() },    user: { findUnique: jest.fn() },

    expense: { create: jest.fn(), findUnique: jest.fn() },    expense: { create: jest.fn(), findUnique: jest.fn() },

    income: { create: jest.fn(), findUnique: jest.fn() },    income: { create: jest.fn(), findUnique: jest.fn() },

  },  },

}));}));



jest.mock('@/lib/apikey', () => ({jest.mock('@/lib/apikey', () => ({

  getUserByApiKeyFromHeader: jest.fn(),  getUserByApiKeyFromHeader: jest.fn(),

}));}));



const mockedPrisma = require('@/lib/prisma').prisma;const mockedPrisma = require('@/lib/prisma').prisma;

const expensesModule = require('../../src/app/api/shortcuts/expenses/route');const expensesModule = require('../../src/app/api/shortcuts/expenses/route');

const incomesModule = require('../../src/app/api/shortcuts/incomes/route');const incomesModule = require('../../src/app/api/shortcuts/incomes/route');



describe('Shortcuts API - Tags Handling', () => {describe('Shortcuts API - Tags Handling', () => {

  beforeEach(() => jest.resetAllMocks());  beforeEach(() => jest.resetAllMocks());



  const mockUser = { id: 'user-123', email: 'test@example.com' };  const mockUser = { id: 'user-123', email: 'test@example.com' };

    

  const mockCreatedExpense = {  const mockCreatedExpense = {

    id: 'expense-123',    id: 'expense-123',

    description: 'Test expense',    description: 'Test expense',

    amount: 100,    amount: 100,

    tags: [],    tags: [],

    category: null,    category: null,

    wallet: null,    wallet: null,

  };  };



  const mockCreatedIncome = {  const mockCreatedIncome = {

    id: 'income-123',    id: 'income-123',

    description: 'Test income',    description: 'Test income',

    amount: 100,    amount: 100,

    tags: [],    tags: [],

    category: null,    category: null,

    wallet: null,    wallet: null,

  };  };



  describe('Expenses API', () => {  describe('Expenses API', () => {

    test('should save empty tags array when no-tag is selected', async () => {    test('should save empty tags array when no-tag is selected', async () => {

      // Setup mocks      // Setup mocks

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      mockedPrisma.expense.create.mockResolvedValue(mockCreatedExpense);      mockedPrisma.expense.create.mockResolvedValue(mockCreatedExpense);

      mockedPrisma.expense.findUnique.mockResolvedValue(mockCreatedExpense);      mockedPrisma.expense.findUnique.mockResolvedValue(mockCreatedExpense);



      const requestBody = {      const requestBody = {

        description: 'Test expense',        description: 'Test expense',

        amount: 100,        amount: 100,

        type: 'VARIABLE',        type: 'VARIABLE',

        tags: [{ id: 'no-tag', name: 'Sem tag' }],        tags: [{ id: 'no-tag', name: 'Sem tag' }],

      };      };



      const req = {       const req = { 

        json: async () => requestBody,        json: async () => requestBody,

        headers: { get: () => null }        headers: { get: () => null }

      };      };



      await expensesModule.POST(req);      const response = await expensesModule.POST(req);



      expect(mockedPrisma.expense.create).toHaveBeenCalledWith({      expect(mockedPrisma.expense.create).toHaveBeenCalledWith({

        data: expect.objectContaining({        data: expect.objectContaining({

          tags: [], // Should be empty array, not ['no-tag']          tags: [], // Should be empty array, not ['no-tag']

        }),        }),

      });      });

    });    });



    test('should save actual tags when real tags are selected', async () => {    test('should save actual tags when real tags are selected', async () => {

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      mockedPrisma.expense.create.mockResolvedValue({      mockedPrisma.expense.create.mockResolvedValue({

        ...mockCreatedExpense,        ...mockCreatedExpense,

        tags: ['alimentação', 'supermercado'],        tags: ['alimentação', 'supermercado'],

      });      });

      mockedPrisma.expense.findUnique.mockResolvedValue({      mockedPrisma.expense.findUnique.mockResolvedValue({

        ...mockCreatedExpense,        ...mockCreatedExpense,

        tags: ['alimentação', 'supermercado'],        tags: ['alimentação', 'supermercado'],

      });      });



      const requestBody = {      const requestBody = {

        description: 'Test expense',        description: 'Test expense',

        amount: 100,        amount: 100,

        type: 'VARIABLE',        type: 'VARIABLE',

        tags: ['alimentação', 'supermercado'],        tags: ['alimentação', 'supermercado'],

      };      };



      const req = {       const req = { 

        json: async () => requestBody,        json: async () => requestBody,

        headers: { get: () => null }        headers: { get: () => null }

      };      };



      await expensesModule.POST(req);      await expensesModule.POST(req);



      expect(mockedPrisma.expense.create).toHaveBeenCalledWith({      expect(mockedPrisma.expense.create).toHaveBeenCalledWith({

        data: expect.objectContaining({        data: expect.objectContaining({

          tags: ['alimentação', 'supermercado'],          tags: ['alimentação', 'supermercado'],

        }),        }),

      });      });

    });    });



    test('should filter out no-tag when mixed with real tags', async () => {    test('should filter out no-tag when mixed with real tags', async () => {

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      mockedPrisma.expense.create.mockResolvedValue({      mockedPrisma.expense.create.mockResolvedValue({

        ...mockCreatedExpense,        ...mockCreatedExpense,

        tags: ['alimentação'],        tags: ['alimentação'],

      });      });

      mockedPrisma.expense.findUnique.mockResolvedValue({      mockedPrisma.expense.findUnique.mockResolvedValue({

        ...mockCreatedExpense,        ...mockCreatedExpense,

        tags: ['alimentação'],        tags: ['alimentação'],

      });      });



      const requestBody = {      const requestBody = {

        description: 'Test expense',        description: 'Test expense',

        amount: 100,        amount: 100,

        type: 'VARIABLE',        type: 'VARIABLE',

        tags: [        tags: [

          { id: 'no-tag', name: 'Sem tag' },          { id: 'no-tag', name: 'Sem tag' },

          'alimentação',          'alimentação',

        ],        ],

      };      };



      const req = {       const req = { 

        json: async () => requestBody,        json: async () => requestBody,

        headers: { get: () => null }        headers: { get: () => null }

      };      };



      await expensesModule.POST(req);      await expensesModule.POST(req);



      expect(mockedPrisma.expense.create).toHaveBeenCalledWith({      expect(mockedPrisma.expense.create).toHaveBeenCalledWith({

        data: expect.objectContaining({        data: expect.objectContaining({

          tags: ['alimentação'], // Should only contain real tags          tags: ['alimentação'], // Should only contain real tags

        }),        }),

      });      });

    });    });

  });  });



  describe('Incomes API', () => {  describe('Incomes API', () => {

    test('should save empty tags array when no-tag is selected', async () => {    test('should save empty tags array when no-tag is selected', async () => {

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      mockedPrisma.income.create.mockResolvedValue(mockCreatedIncome);      mockedPrisma.income.create.mockResolvedValue(mockCreatedIncome);

      mockedPrisma.income.findUnique.mockResolvedValue(mockCreatedIncome);      mockedPrisma.income.findUnique.mockResolvedValue(mockCreatedIncome);



      const requestBody = {      const requestBody = {

        description: 'Test income',        description: 'Test income',

        amount: 100,        amount: 100,

        type: 'VARIABLE',        type: 'VARIABLE',

        tags: [{ id: 'no-tag', name: 'Sem tag' }],        tags: [{ id: 'no-tag', name: 'Sem tag' }],

      };      };



      const req = {       const req = { 

        json: async () => requestBody,        json: async () => requestBody,

        headers: { get: () => null }        headers: { get: () => null }

      };      };



      await incomesModule.POST(req);      await incomesModule.POST(req);



      expect(mockedPrisma.income.create).toHaveBeenCalledWith({      expect(mockedPrisma.income.create).toHaveBeenCalledWith({

        data: expect.objectContaining({        data: expect.objectContaining({

          tags: [], // Should be empty array, not ['no-tag']          tags: [], // Should be empty array, not ['no-tag']

        }),        }),

      });      });

    });    });



    test('should save actual tags when real tags are selected', async () => {    test('should save actual tags when real tags are selected', async () => {

      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      mockedPrisma.income.create.mockResolvedValue({      mockedPrisma.income.create.mockResolvedValue({

        ...mockCreatedIncome,        ...mockCreatedIncome,

        tags: ['salário', 'trabalho'],        tags: ['salário', 'trabalho'],

      });      });

      mockedPrisma.income.findUnique.mockResolvedValue({      mockedPrisma.income.findUnique.mockResolvedValue({

        ...mockCreatedIncome,        ...mockCreatedIncome,

        tags: ['salário', 'trabalho'],        tags: ['salário', 'trabalho'],

      });      });



      const requestBody = {      const requestBody = {

        description: 'Test income',        description: 'Test income',

        amount: 100,        amount: 100,

        type: 'VARIABLE',        type: 'VARIABLE',

        tags: ['salário', 'trabalho'],        tags: ['salário', 'trabalho'],

      };      };



      const req = {       const req = { 

        json: async () => requestBody,        json: async () => requestBody,

        headers: { get: () => null }        headers: { get: () => null }

      };      };



      await incomesModule.POST(req);      await incomesModule.POST(req);



      expect(mockedPrisma.income.create).toHaveBeenCalledWith({      expect(mockedPrisma.income.create).toHaveBeenCalledWith({

        data: expect.objectContaining({        data: expect.objectContaining({

          tags: ['salário', 'trabalho'],          tags: ['salário', 'trabalho'],

        }),        }),

      });      });

    });    });

  });  });

});});