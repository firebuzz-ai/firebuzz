"use client";

import { useWorkspaceGeneralForm } from "@/app/(workspace)/(dashboard)/settings/workspace/general/_components/form-context";
import { useInviteMemberModal } from "@/hooks/ui/use-invite-member-modal";
import { useNewDomainModal } from "@/hooks/ui/use-new-domain-modal";
import { useProjectModal } from "@/hooks/ui/use-project-modal";
import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Building, FolderOpen, Globe, Users } from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

const TABS: TabItem[] = [
	{
		value: "general",
		href: "/settings/workspace/general",
		icon: Building,
		label: "General",
	},
	{
		value: "team",
		href: "/settings/workspace/team",
		icon: Users,
		label: "Team",
	},
	{
		value: "projects",
		href: "/settings/workspace/projects",
		icon: FolderOpen,
		label: "Projects",
	},
	{
		value: "domains",
		href: "/settings/workspace/domains",
		icon: Globe,
		label: "Domains",
	},
];

export const WorkspaceSettingsTabs = () => {
	const pathname = usePathname();
	const [, setNewDomainModal] = useNewDomainModal();
	const [, setProjectModal] = useProjectModal();
	const [, setInviteMemberModal] = useInviteMemberModal();

	// Always call the hook - it will return null when not available
	const generalFormContext = useWorkspaceGeneralForm();

	const currentTab = useMemo(() => {
		if (pathname.includes("/domains")) return "domains";
		if (pathname.includes("/team")) return "team";
		if (pathname.includes("/projects")) return "projects";
		return "general";
	}, [pathname]);

	const buttonConfig = useMemo(() => {
		switch (currentTab) {
			case "general":
				return {
					title: "Save Changes",
					show: currentTab === "general", // Only show on general tab
					disabled: !generalFormContext?.canSave,
					loading: generalFormContext?.isLoading || false,
				};
			case "team":
				return {
					title: "Invite Member",
					show: true,
					disabled: false,
					loading: false,
				};
			case "projects":
				return {
					title: "New Project",
					show: true,
					disabled: false,
					loading: false,
				};
			case "domains":
				return {
					title: "Add Domain",
					show: true,
					disabled: false,
					loading: false,
				};
			default:
				return {
					title: "",
					show: false,
					disabled: false,
					loading: false,
				};
		}
	}, [currentTab, generalFormContext?.canSave, generalFormContext?.isLoading]);

	const handleButtonClick = useCallback(() => {
		if (currentTab === "general" && generalFormContext) {
			generalFormContext.onSubmit();
		} else if (currentTab === "team") {
			setInviteMemberModal({ create: true });
		} else if (currentTab === "projects") {
			setProjectModal({ create: true });
		} else if (currentTab === "domains") {
			setNewDomainModal({ create: true });
		}
	}, [
		currentTab,
		generalFormContext,
		setProjectModal,
		setNewDomainModal,
		setInviteMemberModal,
	]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey) {
				if (
					e.key === "s" &&
					currentTab === "general" &&
					generalFormContext?.canSave
				) {
					e.preventDefault();
					handleButtonClick();
				} else if (
					e.key === "n" &&
					(currentTab === "domains" ||
						currentTab === "projects" ||
						currentTab === "team")
				) {
					e.preventDefault();
					handleButtonClick();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleButtonClick, currentTab, generalFormContext?.canSave]);

	return (
		<div className="relative flex items-center justify-between px-2 border-b">
			{/* Tabs */}
			<AnimatedTabs
				tabs={TABS}
				asLinks
				currentPath={pathname}
				indicatorPadding={0}
				tabsContainerClassName="flex items-center gap-2"
				linkComponent={Link}
				withBorder={false}
				indicatorRelativeToParent
			/>

			{/* Buttons */}
			{buttonConfig.show && (
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleButtonClick}
						disabled={buttonConfig.disabled}
					>
						{buttonConfig.loading ? (
							<div className="flex gap-2 items-center">
								<Spinner size="xs" variant="default" />
								Saving...
							</div>
						) : (
							<>
								{buttonConfig.title}
								<ButtonShortcut>
									{currentTab === "general" ? "⌘S" : "⌘N"}
								</ButtonShortcut>
							</>
						)}
					</Button>
				</div>
			)}
		</div>
	);
};
