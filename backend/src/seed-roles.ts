
import { prisma } from "./lib/prisma";

const roles = [
  {
    name: "ADMIN",
    description: "System administrator",
  },
  {
    name: "DOCTOR",
    description: "Healthcare doctor",
  },
  {
    name: "PATIENT",
    description: "Registered patient",
  },
  {
    name: "RECEPTIONIST",
    description: "Hospital receptionist",
  },
  {
    name: "HEALTHCARE_STAFF",
    description: "Healthcare support staff",
  },
];

async function seedRoles() {
  try {
    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: role,
      });
    }

    console.log("Successfully created all system roles!");
  } catch (error) {
    console.error("Role seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

seedRoles();
