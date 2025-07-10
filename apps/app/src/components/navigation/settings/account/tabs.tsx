"use client";

import { useProfileForm } from "@/app/(workspace)/(dashboard)/settings/account/profile/_components/form-context";
import { useNewWorkspaceModal } from "@/hooks/ui/use-new-workspace-modal";
import {
	AnimatedTabs,
	type TabItem,
} from "@firebuzz/ui/components/ui/animated-tabs";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Building2, Shield, User } from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

const TABS: TabItem[] = [
	{
		value: "profile",
		href: "/settings/account/profile",
		icon: User,
		label: "Profile",
	},
	{
		value: "security",
		href: "/settings/account/security",
		icon: Shield,
		label: "Security",
	},
	{
		value: "workspaces",
		href: "/settings/account/workspaces",
		icon: Building2,
		label: "Workspaces",
	},
];

export const AccountSettingsTabs = () => {
	const pathname = usePathname();
	const [, setNewWorkspaceModal] = useNewWorkspaceModal();

	// Always call the hook - it will return null when not available
	const profileFormContext = useProfileForm();

	const currentTab = useMemo(() => {
		if (pathname.includes("/security")) return "security";
		if (pathname.includes("/workspaces")) return "workspaces";
		return "profile";
	}, [pathname]);

	const buttonConfig = useMemo(() => {
		switch (currentTab) {
			case "profile":
				return {
					title: "Save Changes",
					show: currentTab === "profile", // Only show on profile tab
					disabled: !profileFormContext?.canSave,
					loading: profileFormContext?.isLoading || false,
				};
			case "security":
				return {
					title: "Update Security",
					show: false,
					disabled: false,
					loading: false,
				};
			case "workspaces":
				return {
					title: "Create Workspace",
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
	}, [currentTab, profileFormContext?.canSave, profileFormContext?.isLoading]);

	const handleButtonClick = useCallback(() => {
		if (currentTab === "profile" && profileFormContext) {
			profileFormContext.onSubmit();
		} else if (currentTab === "security") {
			// Handle security update
		} else if (currentTab === "workspaces") {
			setNewWorkspaceModal({ create: true });
		}
	}, [currentTab, profileFormContext, setNewWorkspaceModal]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey) {
				if (
					e.key === "s" &&
					currentTab === "profile" &&
					profileFormContext?.canSave
				) {
					e.preventDefault();
					handleButtonClick();
				} else if (e.key === "n" && currentTab === "workspaces") {
					e.preventDefault();
					handleButtonClick();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleButtonClick, currentTab, profileFormContext?.canSave]);

	return (
		<div className="flex relative justify-between items-center px-2 border-b">
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
				<div className="flex gap-2 items-center">
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
									{currentTab === "profile"
										? "⌘S"
										: currentTab === "workspaces"
											? "⌘N"
											: ""}
								</ButtonShortcut>
							</>
						)}
					</Button>
				</div>
			)}
		</div>
	);
};
