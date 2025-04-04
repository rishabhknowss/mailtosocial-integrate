import { NextResponse } from "next/server";
import { z as zod } from "zod";
import db from "../../../../prisma/db";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  const schema = zod.object({
    email: zod.string().email(),
    password: zod.string().min(6),
    firstname: zod.string(),
    lastname: zod.string(),
  });

  try {
    const body = await request.json();

    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: result.error.issues },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: {
        email: result.data.email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const user = await db.user.create({
      data: {
        email: result.data.email,
        password: await bcrypt.hash(result.data.password, 10),
        firstname: result.data.firstname,
        lastname: result.data.lastname,
      },
    });

    // Return user without the password
    const { ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
