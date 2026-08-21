import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

describe("dialog overflow", () => {
  it("DialogContent は画面内に収まるよう縦スクロールできる", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>勤務ラベルの管理</DialogTitle>
          <p>長い内容</p>
        </DialogContent>
      </Dialog>,
    );

    const content = screen.getByRole("dialog");
    expect(content.className).toContain("max-h-[calc(100%-2rem)]");
    expect(content.className).toContain("overflow-y-auto");
  });

  it("AlertDialogContent も画面内に収まるよう縦スクロールできる", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>確認</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const content = screen.getByRole("alertdialog");
    expect(content.className).toContain("max-h-[calc(100%-2rem)]");
    expect(content.className).toContain("overflow-y-auto");
  });
});
