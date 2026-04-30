// One-time script to set admin by email
// Run with: node scripts/set-admin.js <email>

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log("Usage: npx tsx scripts/set-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    console.log(`User with email ${email} not found`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
  });

  console.log(`✅ ${email} is now an admin!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());