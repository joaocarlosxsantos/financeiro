const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function readJson(name) {
  const p = path.join(__dirname, 'output', name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function mapCategoryType(t) {
  if (!t) return 'EXPENSE';
  const s = String(t).toUpperCase();
  if (s === 'INCOME') return 'INCOME';
  if (s === 'BOTH') return 'BOTH';
  return 'EXPENSE';
}

async function main() {
  console.log('Iniciando import de seeds para o banco (Prisma).');

  const user = await readJson('user.json');
  const wallets = await readJson('wallets.json');
  const categories = await readJson('categories.json');
  const tags = await readJson('tags.json');
  const transactions = await readJson('transactions.json');
  const groups = await readJson('groups.json');
  const members = await readJson('members.json');
  const accounts = await readJson('accounts.json');

  if (!user) {
    console.error('user.json não encontrado em seeds/output. Execute generate_test_data.py antes.');
    process.exit(1);
  }

  // 1) Upsert user (usa email como unique)
  console.log('Upserting user:', user.email);
  const dbUser = await prisma.user.upsert({
    where: { email: user.email },
    update: {
      name: user.name || undefined,
      updatedAt: new Date(),
    },
    create: {
      id: user.id || undefined,
      name: user.name || undefined,
      email: user.email,
      // não seta password/apiKey
    }
  });

  const userId = dbUser.id;

  // 2) Categories
  if (categories && categories.length) {
    console.log(`Inserindo ${categories.length} categorias...`);
    for (const c of categories) {
      try {
        // tentar encontrar por userId+name+type
        const existing = await prisma.category.findFirst({ where: { userId: userId, name: c.name, type: mapCategoryType(c.type) } });
        if (existing) continue;
        await prisma.category.create({ data: {
          id: c.id || undefined,
          name: c.name,
          type: mapCategoryType(c.type),
          userId: userId,
          color: c.color || undefined,
        }});
      } catch (err) {
        console.warn('Erro ao criar categoria', c.name, err.message || err);
      }
    }
  }

  // 3) Tags
  if (tags && tags.length) {
    console.log(`Inserindo ${tags.length} tags...`);
    for (const t of tags) {
      try {
        const existing = await prisma.tag.findFirst({ where: { userId: userId, name: t.name } });
        if (existing) continue;
        await prisma.tag.create({ data: {
          id: t.id || undefined,
          name: t.name,
          userId: userId,
        }});
      } catch (err) {
        console.warn('Erro ao criar tag', t.name, err.message || err);
      }
    }
  }

  // 4) Wallets
  if (wallets && wallets.length) {
    console.log(`Inserindo ${wallets.length} wallets...`);
    for (const w of wallets) {
      try {
        const existing = await prisma.wallet.findFirst({ where: { userId: userId, name: w.name } });
        if (existing) continue;
        await prisma.wallet.create({ data: {
          id: w.id || undefined,
          name: w.name,
          type: w.type || 'carteira',
          userId: userId,
        }});
      } catch (err) {
        console.warn('Erro ao criar wallet', w.name, err.message || err);
      }
    }
  }

  // 5) Transactions (Expense / Income)
  if (transactions && transactions.length) {
    console.log(`Inserindo ${transactions.length} transações (expenses/incomes)...`);
    let i = 0;
    for (const tx of transactions) {
      i++;
      try {
        const isIncome = Number(tx.amount) > 0;
        // Always store amounts as positive values in the DB (expenses should be positive numbers)
        const normalizedAmount = String(Math.abs(Number(tx.amount)));
        const base = {
          id: tx.id || undefined,
          description: tx.description || '',
          amount: normalizedAmount, // string para Decimal compatível (sempre positivo)
          date: tx.date ? new Date(tx.date) : new Date(),
          isFixed: !!tx.recurring_id,
          startDate: tx.recurring_id ? (tx.date ? new Date(tx.date) : undefined) : undefined,
          dayOfMonth: tx.recurring_id && tx.date ? new Date(tx.date).getUTCDate() : undefined,
          categoryId: tx.category_id || undefined,
          userId: userId,
          walletId: tx.wallet_id || undefined,
          tags: tx.tags || [],
        };
        if (isIncome) {
          // income: amount remains positive
          await prisma.income.create({ data: Object.assign({ type: tx.recurring_id ? 'FIXED' : 'VARIABLE' }, base) });
        } else {
          // expense: we already normalized to positive value
          await prisma.expense.create({ data: Object.assign({ type: tx.recurring_id ? 'FIXED' : 'VARIABLE' }, base) });
        }
      } catch (err) {
        console.warn('Erro ao criar transação', tx.id, err.message || err);
      }
    }
  }

  // 6) Groups and Members
  const groupIdMap = {}; // generated id (string) -> prisma generated int id
  if (groups && groups.length) {
    console.log(`Inserindo ${groups.length} groups...`);
    for (const g of groups) {
      try {
        let created = await prisma.group.create({ data: {
          name: g.name,
          description: g.description || undefined,
          userId: userId,
        }});
        groupIdMap[g.id] = created.id;
      } catch (err) {
        console.warn('Erro ao criar group', g.name, err.message || err);
      }
    }
  }

  if (members && members.length) {
    console.log(`Inserindo ${members.length} members...`);
    for (const m of members) {
      try {
        const mappedGroupId = groupIdMap[m.group_id];
        if (!mappedGroupId) {
          console.warn('Grupo não encontrado para membro', m.name, m.group_id);
          continue;
        }
        await prisma.member.create({ data: {
          name: m.name,
          phone: m.phone || undefined,
          userId: userId,
          groupId: mappedGroupId,
        }});
      } catch (err) {
        console.warn('Erro ao criar member', m.name, err.message || err);
      }
    }
  }

  // 7) Accounts -> map to Bills (como placeholder)
  if (accounts && accounts.length) {
    console.log(`Inserindo ${accounts.length} accounts as bills...`);
    for (const a of accounts) {
      try {
        const mappedGroupId = groupIdMap[a.group_id];
        if (!mappedGroupId) {
          console.warn('Grupo não encontrado para account', a.name, a.group_id);
          continue;
        }
        await prisma.bill.create({ data: {
          title: a.name,
          description: `Conta de grupo importada: ${a.name}`,
          amount: Number(a.balance) || 0,
          dueDate: new Date(),
          paid: false,
          userId: userId,
          groupId: mappedGroupId,
        }});
      } catch (err) {
        console.warn('Erro ao criar bill (account)', a.name, err.message || err);
      }
    }
  }

  console.log('Import concluído.');
}

main()
  .catch((e) => {
    console.error('Erro no import:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
