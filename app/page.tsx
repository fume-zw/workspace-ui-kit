import { Workspace } from "@/components/workspace/Workspace";
import projectsData from "@/data/projects.json";
import tasksData from "@/data/tasks.json";
import subtasksData from "@/data/subtasks.json";
import workspaceData from "@/data/workspace.json";
import {
  projectsSchema,
  tasksSchema,
  subtasksSchema,
  workspaceSchema,
} from "@/lib/schema";

export default function Page() {
  const projectResult = projectsSchema.safeParse(projectsData);
  const taskResult = tasksSchema.safeParse(tasksData);
  const subtaskResult = subtasksSchema.safeParse(subtasksData);
  const wsResult = workspaceSchema.safeParse(workspaceData);

  if (
    !projectResult.success ||
    !taskResult.success ||
    !subtaskResult.success ||
    !wsResult.success
  ) {
    const errors = [
      !projectResult.success &&
        `projects.json: ${projectResult.error.issues[0]?.message}`,
      !taskResult.success &&
        `tasks.json: ${taskResult.error.issues[0]?.message}`,
      !subtaskResult.success &&
        `subtasks.json: ${subtaskResult.error.issues[0]?.message}`,
      !wsResult.success &&
        `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  return (
    <Workspace
      initialProjects={projectResult.data}
      initialTasks={taskResult.data}
      initialSubtasks={subtaskResult.data}
      workspace={wsResult.data}
    />
  );
}
