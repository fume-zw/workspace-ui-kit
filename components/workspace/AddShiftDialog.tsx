"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";

type AddShiftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** 勤務一括入力 UI はフェーズ3で実装。フェーズ2では導線のみ確保する。 */
export function AddShiftDialog({ open, onOpenChange }: AddShiftDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <Card className="rounded-none border-0 shadow-none">
          <CardHeader>
            <CardTitle>勤務予定を追加</CardTitle>
            <CardDescription>
              月カレンダーで複数日を選び、ラベルを一括適用する画面は次のフェーズで実装します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              採血当番・当直・休みなどのラベルを複数日にまとめて入力できるようになります。
            </p>
          </CardContent>
        </Card>
        <DialogFooter className="border-t border-border px-6 py-4">
          <DialogClose render={<Button variant="outline">閉じる</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
