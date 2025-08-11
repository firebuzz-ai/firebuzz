import { api, usePresenceConvex } from "@firebuzz/convex";
import { useMemo } from "react";
import { useUser } from "./use-user";

export const usePresence = ({ roomId }: { roomId: string }) => {
	const { user } = useUser();
	const presenceSate = usePresenceConvex(
		api.components.presence,
		roomId,
		user?._id ?? "", // We should never be here, but we need to provide a value
	);

	const isCurrentUserFirstActiveUser = useMemo(() => {
		if (!presenceSate) return false;
		const firstActiveUser = presenceSate.find((p) => p.online);
		if (!firstActiveUser) return false;
		return firstActiveUser.userId === user?._id;
	}, [presenceSate, user?._id]);

	return { presenceSate, isCurrentUserFirstActiveUser };
};
