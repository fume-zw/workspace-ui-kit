"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { type Project } from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type SettingsDialogContentProps = {
  projects: Project[];
  onAddProject: (name: string) => void;
  onDeleteProject: (projectId: string) => void;
};

export function SettingsDialogContent({
  projects,
  onAddProject,
  onDeleteProject,
}: SettingsDialogContentProps) {
  const [newProjectName, setNewProjectName] = useState("");
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleAddProject = () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    onAddProject(trimmed);
    setNewProjectName("");
  };

  return (
    <>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ワークスペース設定</DialogTitle>
          <DialogDescription>
            プロジェクトやワークスペース名を管理します
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-new-project">プロジェクト</FieldLabel>
            <ScrollArea className="max-h-48">
              <div className="divide-y divide-border rounded-lg border border-border">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm">{project.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setDeleteProjectTarget({
                          id: project.id,
                          name: project.name,
                        })
                      }
                      aria-label={`${project.name} を削除`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {projects.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    プロジェクトがありません
                  </div>
                )}
              </div>
            </ScrollArea>
            <InputGroup>
              <InputGroupInput
                id="settings-new-project"
                placeholder="新しいプロジェクト名"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddProject();
                }}
              />
              <InputGroupAddon align="inline-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddProject}
                  disabled={!newProjectName.trim()}
                >
                  <Plus data-icon="inline-start" />
                  追加
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Separator />

          <Field>
            <FieldLabel htmlFor="settings-workspace-name">
              ワークスペース名
            </FieldLabel>
            <Input
              id="settings-workspace-name"
              defaultValue="タスク管理ワークスペース"
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">閉じる</Button>} />
        </DialogFooter>
      </DialogContent>

      <DeleteConfirmDialog
        open={deleteProjectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteProjectTarget(null);
        }}
        title="プロジェクトを削除しますか？"
        itemName={deleteProjectTarget?.name ?? ""}
        onConfirm={() => {
          if (deleteProjectTarget) {
            onDeleteProject(deleteProjectTarget.id);
            setDeleteProjectTarget(null);
          }
        }}
      />
    </>
  );
}
