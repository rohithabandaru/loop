import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.feedback.findMany({
  take: 10,
  orderBy: { createdAt: "desc" },
  select: {
    content: true,
    channel: true,
    customerLabel: true,
    sourceRef: true,
    sentiment: true,
    createdAt: true,
  },
});
console.log(JSON.stringify(rows, null, 2));
const csvish = await p.feedback.findMany({
  where: { OR: [{ sourceRef: { startsWith: "CSV" } }, { customerLabel: "CSV Upload" }] },
  take: 20,
  orderBy: { createdAt: "desc" },
  select: {
    content: true,
    channel: true,
    customerLabel: true,
    sourceRef: true,
  },
});
console.log("\nCSV-like rows:", csvish.length);
console.log(JSON.stringify(csvish, null, 2));
await p.$disconnect();
