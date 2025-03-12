import { WebContainer } from "@webcontainer/api";
import { WORK_DIR_NAME } from "./contants";
export const webcontainerInstance = await WebContainer.boot({
  workdirName: WORK_DIR_NAME,
  forwardPreviewErrors: true,
});
