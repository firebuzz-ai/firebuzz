export async function setPanelSize(size: number, cookieName: string) {
  await fetch("/api/cookie", {
    method: "POST",
    body: JSON.stringify({ key: cookieName, value: size.toString() }),
  });
}
