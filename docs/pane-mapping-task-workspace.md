# タスク管理 4 ペイン 写像表

| 項目 | 内容 |
| --- | --- |
| ステータス | **作り直し版**（2026-06-11 確定 + 2026-08-20 端末フェーズ 1〜2） |
| 根拠 | [spec-task-workspace.md](./spec-task-workspace.md) §4 / [spec-apple-devices.md](./spec-apple-devices.md) |

## ペイン責務の写像

| ペイン | 採用サンプル（現行コンポーネント） | タスク管理（確定） | 現状 |
| --- | --- | --- | --- |
| Pane 1 | `PositionPane` → `ProjectPane` | `ProjectPane`（フラット `Project[]` + 未割当） | **実装済み** |
| Pane 2 | `CandidateListPane` → `TaskListPane` | `TaskListPane`（選択プロジェクトのタスク一覧） | **実装済み** |
| Pane 3 | `CandidateDashboardPane` → `TaskHubPane` | `TaskHubPane`（タスク詳細 + **下部サブタスクチェックリスト**） | **実装済み** |
| Pane 4 | `CandidateDetailPane` → `SubtaskPane` | **`SubtaskPane` = スケジュール**（カレンダー + **統合アジェンダ**：期限タスク・イベント・生活・勤務予定・定期スケジュール・記録を時刻順） | **実装済み** |

> **注意:** コンポーネント名 `SubtaskPane` は歴史的経緯で残っているが、**責務はスケジュール**。サブタスク UI は Pane 3（`TaskHubPane`）内。

## 親・共通コンポーネント

| コンポーネント | タスク管理での扱い |
| --- | --- |
| `Workspace.tsx` | 4 ペイン state の親。Pane 3 = 詳細+subtasks、Pane 4 = スケジュール |
| `GlobalHeader.tsx` | パンくず（プロジェクト名 + タスク名） |
| `SettingsDialog.tsx` | プロジェクト追加・削除 |
| `WorkspaceScheduleDock.tsx` | Pane 4 カレンダー / 統合アジェンダ部品（`ScheduleDockMiniCalendar` / `ScheduleDockAgenda`） |
| `ScheduleWeekView.tsx` | スケジュールビュー本体（週/日グリッド・終日帯・編集ダイアログ連携） |

## データ

| JSON（検証用） | Supabase（正本） | ペイン |
| --- | --- | --- |
| `data/projects.json` | `projects` | Pane 1 |
| `data/tasks.json` | `tasks` | Pane 2 / 3 |
| `data/subtasks.json` | `subtasks` | Pane 3 下部 |
| `data/workspace.json` | —（v1 はリポジトリ固定） | ワークスペース名・アイコン |

## クライアント写像

| ルート / 出口 | 用途 | 現状 |
| --- | --- | --- |
| `/` | PC 4 ペイン | 全項目 + サブタスク + スケジュール |
| `/mobile` | iPhone。予定の確認・編集と、未割当タスクのプロジェクト割当 | **フェーズ 1〜2 実装済み**（ICS 設定は未） |
| `GET /api/calendar/[token].ics` | Google / Apple カレンダー購読（検討段階。使い始めてから） | **未実装** |
| `POST /api/inbox` | Watch の音声。「スケジュールに入れて」/「タスクに入れて」で振り分け。**おはよう／おやすみは記録の睡眠。お風呂・食事は生活** | **実装済み** |

## 次の着手順

1. ~~Supabase Auth 導入~~
2. ~~`/mobile` 新設~~
3. ~~PC 4 ペイン Supabase 接続~~
4. ~~日次レポート改修（ステータス別セクション）~~
5. **端末連携** — [spec-apple-devices.md](./spec-apple-devices.md) のフェーズ 1〜2（inbox + `/mobile` 割当）は実装済み。ICS はカレンダーを使い始めてから
