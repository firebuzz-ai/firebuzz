"use client";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@firebuzz/ui/components/ui/button";

export default function Home() {
  const { getToken } = useAuth();
  
  const testHandler = async () => {
    const token = await getToken();
    const res = await fetch("http://localhost:8787/testclerk", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });
    const data = await res.json();
    console.log(data);
  };

  return (
    <div className="flex flex-col flex-1 justify-center items-center">
      <Button onClick={testHandler}>Test</Button>
    </div>
  );
}
