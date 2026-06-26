import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding locations data...');

  const dataPath = path.join(__dirname, 'seeders', 'updated-locations.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`Location data not found at ${dataPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(content);

  console.log(
    `Loaded ${data.divisions.length} divisions, ${data.districts.length} districts, ${data.upazilas.length} upazilas, ${data.unions.length} unions.`,
  );

  console.log('Clearing existing locations data...');
  // Delete in reverse order to respect foreign key constraints
  await prisma.union.deleteMany();
  await prisma.upazila.deleteMany();
  await prisma.district.deleteMany();
  await prisma.division.deleteMany();

  console.log('Inserting Divisions...');
  await prisma.division.createMany({
    data: data.divisions,
    skipDuplicates: true,
  });

  console.log('Inserting Districts...');
  await prisma.district.createMany({
    data: data.districts,
    skipDuplicates: true,
  });

  console.log('Inserting Upazilas...');
  await prisma.upazila.createMany({
    data: data.upazilas,
    skipDuplicates: true,
  });

  console.log('Inserting Unions...');
  const chunkSize = 500;
  for (let i = 0; i < data.unions.length; i += chunkSize) {
    const chunk = data.unions.slice(i, i + chunkSize);
    await prisma.union.createMany({ data: chunk, skipDuplicates: true });
    process.stdout.write(
      `  Inserted unions ${i + chunk.length}/${data.unions.length}\r`,
    );
  }
  console.log('\nResetting PostgreSQL auto-increment sequences...');

  // Update sequences to Max ID + 1 so new inserts don't collide with seeded IDs
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('public.divisions', 'id'), COALESCE((SELECT MAX(id)+1 FROM public.divisions), 1), false);`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('public.districts', 'id'), COALESCE((SELECT MAX(id)+1 FROM public.districts), 1), false);`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('public.upazilas', 'id'), COALESCE((SELECT MAX(id)+1 FROM public.upazilas), 1), false);`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('public.unions', 'id'), COALESCE((SELECT MAX(id)+1 FROM public.unions), 1), false);`;

  console.log('Location seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
