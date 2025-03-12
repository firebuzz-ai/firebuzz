"use server";
import { cookies } from "next/headers";

export async function setPanelSize(size: number) {
  const cookieStore = await cookies();
  cookieStore.set("previewPanelSizeChat", size.toString());
}
