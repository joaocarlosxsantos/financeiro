#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({ where: { apiKey: null } });
    console.log(`Found ${users.length} users without apiKey`);
    let count = 0;
    for (const u of users) {
      const apiKey = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({ where: { id: u.id }, data: { apiKey } });
      console.log(`Updated ${u.email}`);
      count++;
    }
    console.log(`Done. Updated ${count} users.`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
