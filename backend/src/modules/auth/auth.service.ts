
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../../lib/prisma";

import type {
  RegisterInput,
  LoginInput,
} from "./auth.validation";

// ==========================================
// PATIENT REGISTRATION
// ==========================================

export async function registerPatient(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const patientRole = await tx.role.findUnique({
      where: {
        name: "PATIENT",
      },
    });

    if (!patientRole) {
      throw new Error(
        "PATIENT role not found. Please seed the system roles first."
      );
    }

    const newUser = await tx.user.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email,
        passwordHash,
        phone: input.phone,

        userRoles: {
          create: {
            roleId: patientRole.id,
          },
        },

        patient: {
          create: {
            dateOfBirth: input.dateOfBirth
              ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
              : undefined,
            gender: input.gender,
            address: input.address,
            emergencyContact: input.emergencyContact,
          },
        },
      },

      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        patient: {
          select: {
            id: true,
          },
        },
      },
    });

    return newUser;
  });

  return user;
}

// ==========================================
// USER LOGIN
// ==========================================

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Your account is not active");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  const roles = user.userRoles.map(
    (userRole) => userRole.role.name
  );

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const accessToken = jwt.sign(
    { roles },
    jwtSecret,
    {
      subject: String(user.id),
      expiresIn: "15m",
    }
  );

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: 900,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles,
    },
  };
}
