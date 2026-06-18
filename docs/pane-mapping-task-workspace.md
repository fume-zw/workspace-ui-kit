# タスク管理 4 ペイン 写像表

| 項目 | 内容 |
| --- | --- |
| ステータス | **作り直し版**（2026-06-11 確定反映） |
| 根拠 | [spec-task-workspace.md](./spec-task-workspace.md) §4 |

## ペイン責務の写像

| ペイン | 採用サンプル（現行コンポーネント） | タスク管理（確定） | 現状 |
| --- | --- | --- | --- |
| Pane 1 | `PositionPane` → `ProjectPane` | `ProjectPane`（フラット `Project[]` + 未割当） | **実装済み** |
| Pane 2 | `CandidateListPane` → `TaskListPane` | `TaskListPane`（選択プロジェクトのタスク一覧） | **実装済み** |
| Pane 3 | `CandidateDashboardPane` → `TaskHubPane` | `TaskHubPane`（タスク詳細 + **下部サブタスクチェックリスト**） | **実装済み** |
| Pane 4 | `CandidateDetailPane` → `SubtaskPane` | **`SubtaskPane` = スケジュール**（カレンダー + 期限タスクアジェンダ） | **実装済み** |

> **注意:** コンポーネント名 `SubtaskPane` は歴史的経緯で残っているが、**責務はスケジュール**。サブタスク UI は Pane 3（`TaskHubPane`）内。

## 親・共通コンポーネント

| コンポーネント | タスク管理での扱い |
| --- | --- |
| `Workspace.tsx` | 4 ペイン state の親。Pane 3 = 詳細+subtasks、Pane 4 = スケジュール |
| `GlobalHeader.tsx` | パンくず（プロジェクト名 + タスク名） |
| `SettingsDialog.tsx` | プロジェクト追加・削除 |
| `WorkspaceScheduleDock.tsx` | Pane 4 カレンダー / アジェンダ部品 |

## データ

| JSON（検証用） | Supabase（正本） | ペイン |
| --- | --- | --- |
| `data/projects.json` | `projects` | Pane 1 |
| `data/tasks.json` | `tasks` | Pane 2 / 3 |
| `data/subtasks.json` | `subtasks` | Pane 3 下部 |
| `data/workspace.json` | —（v1 はリポジトリ固定） | ワークスペース名・アイコン |

## クライアント写像

| ルート | 用途 | v1 入力 |
| --- | --- | --- |
| `/` | PC 4 ペイン | 全項目 + サブタスク + スケジュール |
| `/mobile` | スマホ登録（**新設予定**） | タイトル・期限・ステータス・project（任意） |

## 次の着手順

1. Supabase Auth 導入
2. `/mobile` 新設
3. PC 4 ペイン Supabase 接続
4. 日次レポート改修（ステータス別セクション）
