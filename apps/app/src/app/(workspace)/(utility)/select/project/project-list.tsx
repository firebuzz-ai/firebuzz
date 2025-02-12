"use client";

import { useProject } from "@/hooks/project";
import { useWorkspace } from "@/hooks/workspace";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import type { ColorPickerColorType } from "@firebuzz/ui/components/ui/color-picker";
import { ColoredIconPreview } from "@firebuzz/ui/components/ui/colored-icon-preview";
import type { IconPickerIconType } from "@firebuzz/ui/components/ui/icon-picker";
import {
  ArrowRightIcon,
  ArrowRightLeft,
  Plus,
} from "@firebuzz/ui/icons/lucide";
import { motion } from "motion/react";
import Link from "next/link";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const header = {
  hidden: { opacity: 0, y: -20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export const ProjectList = () => {
  const { projects, changeProject } = useProject();
  const { currentWorkspace } = useWorkspace();

  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container mx-auto max-w-2xl py-8"
      >
        {/* Header */}
        <motion.div variants={header} className="">
          <h2 className="text-2xl font-bold tracking-tight">Select Project</h2>
          <p className="text-muted-foreground">
            Choose a project to continue or create a new one
          </p>
        </motion.div>

        {/* Project List */}
        <motion.div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
          {projects.map((project) => (
            <motion.button
              key={project._id}
              variants={item}
              onClick={() => changeProject(project._id)}
              className={buttonVariants({
                variant: "outline",
                className: "flex items-center justify-start text-left h-12",
              })}
            >
              <ColoredIconPreview
                icon={project.icon as IconPickerIconType}
                color={project.color as ColorPickerColorType}
                className="size-9"
              />
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{project.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {currentWorkspace?.title}
                  </p>
                </div>
                <ArrowRightIcon className="size-3" />
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="flex items-center gap-4 w-full justify-between mt-8"
          variants={item}
        >
          <Link
            className={buttonVariants({
              variant: "outline",
              className: "flex-1 flex items-center justify-center gap-2",
            })}
            href="/new/project"
          >
            Create New Project <Plus className="size-3" />
          </Link>
          <Link
            className={buttonVariants({
              variant: "outline",
              className: "flex-1 flex items-center justify-center gap-2",
            })}
            href="/select/workspace"
          >
            Change Workspace <ArrowRightLeft className="size-3" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};
