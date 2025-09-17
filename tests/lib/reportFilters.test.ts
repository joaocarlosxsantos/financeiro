import { filterRows } from '@/lib/reportFilters';

describe('filterRows util', () => {
  const rows = [
    {
      id: 'r1',
      date: '2025-09-01T00:00:00.000Z',
      description: 'Income 1',
      amount: 100,
      kind: 'income',
      categoryName: 'Cat 1',
      categoryId: 'c1',
      walletName: 'Wallet 1',
      walletId: 'w1',
      tags: ['t1'],
      isFixed: false,
    },
    {
      id: 'r2',
      date: '2025-09-02T00:00:00.000Z',
      description: 'Expense 1',
      amount: -50,
      kind: 'expense',
      categoryName: 'Cat 2',
      categoryId: 'c2',
      walletName: 'Wallet 2',
      walletId: 'w2',
      tags: ['t2'],
      isFixed: false,
    },
  ];

  test('filters by walletId', () => {
    const filtered = filterRows(rows as any, [], ['w1'], []);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].walletId).toBe('w1');
    expect(filtered[0].id).toBe('r1');
  });

  test('filters by categoryId', () => {
    const filtered = filterRows(rows as any, ['c2'], [], []);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].categoryId).toBe('c2');
    expect(filtered[0].id).toBe('r2');
  });

  test('filters by tags (must include all selected tags)', () => {
    const filtered = filterRows(rows as any, [], [], ['t1']);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].tags).toEqual(['t1']);
    expect(filtered[0].id).toBe('r1');
  });

  test('filters by tags (nonexistent tag returns empty)', () => {
    const filtered = filterRows(rows as any, [], [], ['nonexistent']);
    expect(filtered).toHaveLength(0);
  });

  test('filters by tags (case-insensitive matching)', () => {
    // add a row with mixed-case tag to ensure case-insensitive match
    const mixedCaseRows = [
      ...rows,
      {
        id: 'r3',
        date: '2025-09-03T00:00:00.000Z',
        description: 'Expense 2',
        amount: -20,
        kind: 'expense',
        categoryName: 'Cat 3',
        categoryId: 'c3',
        walletName: 'Wallet 3',
        walletId: 'w3',
        tags: ['ViagEm'],
        isFixed: false,
      },
    ];

    const filtered = filterRows(mixedCaseRows as any, [], [], ['viagem']);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('r3');
  });
});
