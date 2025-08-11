export function getInitials(input: string): string {
	const parts = input.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function getTimeAgo(timestamp: number): string {
	const now = Date.now();
	const diff = Math.floor((now - timestamp) / 1000);

	if (diff < 60) return "Last seen just now";
	if (diff < 3600) return `Last seen ${Math.floor(diff / 60)} min ago`;
	if (diff < 86400) {
		const hours = Math.floor(diff / 3600);
		return `Last seen ${hours} hour${hours === 1 ? "" : "s"} ago`;
	}
	const days = Math.floor(diff / 86400);
	return `Last seen ${days} day${days === 1 ? "" : "s"} ago`;
}
