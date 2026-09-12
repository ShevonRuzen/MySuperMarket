import { PrismaClient, Role, ProductUnit } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MySuperMarket database seeding...');

  // 1. Create Main Branch
  const branch = await prisma.branch.upsert({
    where: { code: 'C07' },
    update: {},
    create: {
      name: 'Colombo 07 - Flagship Store',
      code: 'C07',
      address: '120 Reid Avenue, Colombo 07',
      city: 'Colombo',
      phone: '+94 11 269 1234',
      openingTime: '07:00',
      closingTime: '22:00',
      isActive: true,
    },
  });
  console.log(`✅ Branch created: ${branch.name} (${branch.code})`);

  // 2. Create Terminal 01
  const terminal = await prisma.terminal.create({
    data: {
      branchId: branch.id,
      name: 'POS Terminal 01',
      bridgeVersion: '1.0.0',
    },
  });
  console.log(`✅ Terminal created: ${terminal.name}`);

  // 3. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);
  const pinHash = await bcrypt.hash('1234', 10);

  // Owner
  const owner = await prisma.user.upsert({
    where: { email: 'owner@mysupermarket.lk' },
    update: {},
    create: {
      name: 'Sunil Perera (Owner)',
      email: 'owner@mysupermarket.lk',
      passwordHash,
      role: Role.OWNER,
      isActive: true,
    },
  });

  // Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@mysupermarket.lk' },
    update: {},
    create: {
      branchId: branch.id,
      name: 'Kamal Silva (Branch Manager)',
      email: 'manager@mysupermarket.lk',
      passwordHash,
      role: Role.MANAGER,
      salary: 120000,
      isActive: true,
    },
  });

  // Cashier
  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@mysupermarket.lk' },
    update: {},
    create: {
      branchId: branch.id,
      name: 'Kasun Bandara (Cashier)',
      email: 'cashier@mysupermarket.lk',
      passwordHash,
      pinHash,
      role: Role.CASHIER,
      salary: 65000,
      isActive: true,
    },
  });
  console.log('✅ Users seeded: Owner, Manager, Cashier (PIN: 1234, Password: password123)');

  // 4. Create Categories
  const catDairy = await prisma.category.create({ data: { name: 'Dairy & Eggs', sortOrder: 1 } });
  const catBakery = await prisma.category.create({ data: { name: 'Bakery & Bread', sortOrder: 2 } });
  const catBeverages = await prisma.category.create({ data: { name: 'Beverages & Tea', sortOrder: 3 } });
  const catRice = await prisma.category.create({ data: { name: 'Rice & Grains', sortOrder: 4 } });
  const catProduce = await prisma.category.create({ data: { name: 'Fresh Vegetables & Fruits', sortOrder: 5 } });

  // 5. Create Sample Products
  const productsData = [
    {
      name: 'Highland Fresh Milk 1L',
      categoryId: catDairy.id,
      costPrice: 210,
      sellingPrice: 240,
      barcode: '4792026000018',
      stockQty: 50,
      unit: ProductUnit.EACH,
      isWeighed: false,
    },
    {
      name: 'Anchor Salted Butter 227g',
      categoryId: catDairy.id,
      costPrice: 850,
      sellingPrice: 950,
      barcode: '9415007012345',
      stockQty: 30,
      unit: ProductUnit.EACH,
      isWeighed: false,
    },
    {
      name: 'Prima Sandwich Bread 450g',
      categoryId: catBakery.id,
      costPrice: 190,
      sellingPrice: 220,
      barcode: '4791001000123',
      stockQty: 25,
      unit: ProductUnit.EACH,
      isWeighed: false,
    },
    {
      name: 'Keeri Samba Rice 5kg',
      categoryId: catRice.id,
      costPrice: 1300,
      sellingPrice: 1450,
      barcode: '4791002000456',
      stockQty: 40,
      unit: ProductUnit.EACH,
      isWeighed: false,
    },
    {
      name: 'Dilmah Premium Ceylon Tea 100 Tea Bags',
      categoryId: catBeverages.id,
      costPrice: 520,
      sellingPrice: 620,
      barcode: '9312631123456',
      stockQty: 35,
      unit: ProductUnit.EACH,
      isWeighed: false,
    },
    {
      name: 'Fresh Red Tomatoes (per kg)',
      categoryId: catProduce.id,
      costPrice: 220,
      sellingPrice: 280,
      barcode: '2001', // PLU code
      stockQty: 20,
      unit: ProductUnit.KG,
      isWeighed: true,
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        categoryId: item.categoryId,
        name: item.name,
        costPrice: item.costPrice,
        unit: item.unit,
        isWeighed: item.isWeighed,
        barcodes: {
          create: {
            barcode: item.barcode,
            isPrimary: true,
          },
        },
        branchProducts: {
          create: {
            branchId: branch.id,
            sellingPrice: item.sellingPrice,
            reorderLevel: 10,
          },
        },
        stocks: {
          create: {
            branchId: branch.id,
            quantity: item.stockQty,
          },
        },
      },
    });
    console.log(`✅ Product seeded: ${product.name} (Barcode: ${item.barcode})`);
  }

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
