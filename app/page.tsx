// app/main/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import MainPageComponent from "./components/MainPage";
import { Navbar } from "./components/Navbar";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <MainPageComponent />
    </main>
  );
}
