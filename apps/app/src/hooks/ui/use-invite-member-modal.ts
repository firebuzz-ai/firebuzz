"use client";

import { atom, useAtom } from "jotai";

interface InviteMemberModalState {
	create: boolean;
}

const inviteMemberModalAtom = atom<InviteMemberModalState | null>(null);

export const useInviteMemberModal = () => {
	return useAtom(inviteMemberModalAtom);
};
