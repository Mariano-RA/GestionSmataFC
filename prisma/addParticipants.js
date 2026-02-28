const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// list of people to add; "COMPLETO" items will get that string in their notes field
const people = [
  { name: 'agustin guzman', notes: 'COMPLETO' },
  { name: 'Fabricio roman' },
  { name: 'Fede benitez' },
  { name: 'Gaston nadaya' },
  { name: 'Gaston quilimar' },
  { name: 'Heber quinteros' },
  { name: 'Joaquin Rodriguez', notes: 'COMPLETO' },
  { name: 'Joaquin maragliano', notes: 'COMPLETO' },
  { name: 'Lucas campo' },
  { name: 'Matias castillo', notes: 'COMPLETO' },
  { name: 'Matias reartes' },
  { name: 'Mauricio sayago', notes: 'COMPLETO' },
  { name: 'Nacho maragni' },
  { name: 'Nahuel mercado' },
  { name: 'Nano Rodriguez', notes: 'COMPLETO' },
  { name: 'Luciano quipildor' },
  { name: 'Agustin rojas' },
  { name: 'Rodrigo urquiza' },
  { name: 'Alexis molina', notes: 'COMPLETO' },
  { name: 'Franco paz' },
  { name: 'Nico arias' },
  { name: 'Facundo ripossi' }
];

async function main() {
  for (const person of people) {
    // use findFirst because name is not unique
    const existing = await prisma.participant.findFirst({
      where: { name: person.name }
    });

    if (existing) {
      console.log(`✔ already exists: ${person.name}`);
      continue;
    }

    await prisma.participant.create({
      data: {
        name: person.name,
        phone: null,
        notes: person.notes || null,
        active: true
      }
    });
    console.log(`Added: ${person.name}`);
  }
}

main()
  .then(async () => {
    console.log('✅ Done adding participants');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding participants:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
