import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ReactNode } from 'react';

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (session) {
    redirect("/");
  }

  return <>{children}</>;
}
