# タスク管理 4 ペイン 写像表（JSON フェーズ）

| 項目 | 内容 |
| --- | --- |
| ステータス | JSON フェーズ完了（Pane 1〜4 実装済み） |
| 根拠 | [spec-task-workspace.md](./spec-task-workspace.md) §4・§8 |

## ペイン責務の写像

| ペイン | 採用サンプル（現行コンポーネント） | タスク管理（目標） | JSON フェーズの状態 |
| --- | --- | --- | --- |
| Pane 1 | `PositionPane`（`Department[]` → ポジション） | `ProjectPane`（フラット `Project[]` + 未割当） | **実装済み** |
| Pane 2 | `CandidateListPane`（ステージ別候補者一覧） | `TaskListPane`（選択プロジェクトのタスク一覧） | **実装済み** |
| Pane 3 | `CandidateDashboardPane`（候補者ハブ） | `TaskHubPane`（タスクハブ） | **実装済み** |
| Pane 4 | `CandidateDetailPane`（選考ステージ詳細） | `SubtaskPane`（サブタスクチェックリスト） | **実装済み** |

## 親・共通コンポーネント

| 採用サンプル | タスク管理での扱い | JSON フェーズ |
| --- | --- | --- |
| `Workspace.tsx` | 4 ペイン state の親。Pane 1 は `Project[]` を保持 | Pane 1 接続済み |
| `GlobalHeader.tsx` | パンくずをプロジェクト軸に簡略化 | プロジェクト名 + 候補者名（暫定） |
| `SettingsDialog.tsx` | プロジェクト追加・削除 | プロジェクト管理に差し替え |
| `AddItemDialog.tsx` | 名称入力ダイアログ（流用） | 流用 |
| `DeleteConfirmDialog.tsx` | タスク・プロジェクト削除の確認 | プロジェクト削除で使用 |

## データ（JSON フェーズ）

| 採用サンプル | タスク管理 | 備考 |
| --- | --- | --- |
| `data/positions.json` | `data/projects.json` | `app/page.tsx` は `projects.json` を読む |
| `data/candidates.json` | 採用サンプル検証用（本線 UI からは未接続） | スキーマテストのみ |
| `data/subtasks.json` | Pane 4 チェックリスト | 読み込み済み |
| `data/workspace.json` | 同ファイル | `unassignedTaskCount` で未割当件数を渡す |

## 型・スキーマ

| 採用 | タスク管理 |
| --- | --- |
| `Department` / `Position` | `Project`（`lib/schema.ts`） |
| `UNASSIGNED_PROJECT_ID` | Pane 1 の「未割当」行（仮想 ID） |

## 次の着手順（推奨）

1. 失敗時トースト（`sonner`）— 仕様 O-15
2. Supabase 接続フェーズ
