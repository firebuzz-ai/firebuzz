"use server";
import { cookies } from "next/headers";

export async function setPanelSize(size: number, cookieName: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, size.toString());
}
