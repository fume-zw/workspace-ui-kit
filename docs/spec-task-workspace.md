# タスク管理 4 ペインワークスペース 仕様書

| 項目 | 内容 |
| --- | --- |
| ステータス | **作り直し版ドラフト**（2026-06-11 方針確定反映） |
| 作成日 | 2026-05-14 |
| 最終更新 | 2026-06-11（作り直し方針・6 論点確定反映） |
| 対象リポジトリ | `workspace-ui-kit`（PC 4 ペイン + スマホ `/mobile` を集約） |
| 連携先 | `C:\Users\うめ\Desktop\My-First-Project\自動報告ツール`（日次レポートのみ。`web/` は廃止予定） |

## 1. 目的

採用管理サンプルを土台に、**プロジェクト・タスク業務**で使える **4 ペインワークスペース**を構築する。Supabase を正本とし、**スマホからの軽いタスク追加**（`/mobile`）と **PC での深い作業**（4 ペイン）を **同一リポジトリ・同一 Supabase** で両立する。

## 2. 背景と前提

### 2.1 本リポジトリ（workspace-ui-kit）

- Next.js 16 / React 19 / shadcn/ui（base-nova）の **4 ペイン雛形**。
- JSON フェーズ（`data/*.json`）で UI 検証済み。接続フェーズで Supabase に差し替える。
- **migrations の正本** — `supabase/migrations/*.sql` を本リポジトリで管理する。
- **スマホ UI** — 同一 Next.js アプリ内に `/mobile` 等の単一路由で新設する（別 Next アプリは作らない）。

### 2.2 連携先（自動報告ツール）

- 日次レポート（GitHub Actions + LINE）が **同じ Supabase を読む**。
- **`web/` はお試し版** — `genre`・`sub_status` 等の旧設計。正本にしない。廃止明記 or 削除予定。
- レポート処理は `lib/report.mjs` 等。DB スキーマ変更後は **ステータス別セクション**（§5.9）。

### 2.3 目標スキーマ（作り直し版）

| テーブル | 主要列 | 備考 |
| --- | --- | --- |
| `task_statuses` | `id`, `user_id`, `code`, `label`, `sort_order`, timestamps | 進捗の選択肢マスタ。**ユーザーごと** |
| `projects` | `id`, `user_id`, `name`, `sort_order`, timestamps | Pane 1 |
| `tasks` | `id`, `user_id`, `status_id`, `title`, `due_date`, `project_id` (nullable), timestamps | Pane 2 / 3。**`status` text なし** |
| `subtasks` | `id`, `task_id`, `user_id`, `title`, `is_done`, `sort_order`, timestamps | Pane 3 下部 |

#### 初期ステータス（seed 5 件）

| sort_order | code | label |
| --- | --- | --- |
| 1 | `not_started` | 未着手 |
| 2 | `in_progress` | 進行中 |
| 3 | `urgent` | 至急対応 |
| 4 | `on_hold` | 保留中 |
| 5 | `done` | 完了 |

サインアップ時（および初回 migration）に `seed_default_task_statuses` で自動投入。将来ユーザーが行を追加可能（RLS: 本人 CRUD）。

## 3. 進め方（ルート）

| 決定 | 内容 |
| --- | --- |
| ルート | **道 A** — 本リポジトリを改造し、4 ペイン構造を維持する |
| 業務の見え方 | **軸 → 一覧 → 1 件ハブ → スケジュール** |
| データの正本 | **Supabase** |
| UI の正本 | **kit の現行 UI**（仕様書・レポート・旧 web/ を揃え直す） |
| migrations | **workspace-ui-kit** に新設 |

### 3.1 UI の場面分担（2026-06-11 確定）

| 利用場面 | 正とするクライアント |
| --- | --- |
| スマホからのタスク追加・軽い更新 | **workspace-ui-kit `/mobile`** |
| PC でのプロジェクト割当・サブタスク編集・4 ペイン作業 | **workspace-ui-kit `/`** |

同一 Supabase プロジェクト・同一認証（メール + パスワード）。セッションはアプリ内で共有（単一 Next.js アプリ）。

## 4. ドメインと 4 ペイン責務

| ペイン | 採用サンプル（参考） | 本仕様での責務 |
| --- | --- | --- |
| Pane 1 | 部署 / ポジション | **プロジェクト**（ナビ軸）+ **未割当** |
| Pane 2 | 候補者リスト | **タスク一覧**（選択中プロジェクトに紐づく） |
| Pane 3 | 候補者ダッシュボード | **タスクハブ**（詳細編集 + **下部にサブタスクチェックリスト**） |
| Pane 4 | 選考ステージ詳細 | **スケジュール**（ミニカレンダー + 日付別の期限タスク）。常時表示 |

### 4.1 Pane 1（プロジェクト）

- v1 の階層は **フラット**（親子なしのプロジェクト一覧）。
- **`project_id` が null のタスク**向けに **「未割当」** エントリを置く。
- プロジェクト削除時: 配下タスクの `project_id` は **`ON DELETE SET NULL`**（未割当へ）。

### 4.2 Pane 3（タスクハブ）

- 日常で最も触る **1 件のタスク**を中心に置く。
- **インライン編集対象**: タイトル・ステータス・期限・**プロジェクト**（`project_id`）。
- **サブタスク**: Pane 3 **下部**にチェックリスト（タイトル + 完了チェック、行追加・行削除可・確認なし）。
- **`genre` は廃止**。プロジェクト（`project_id`）一本化。

### 4.3 Pane 4（スケジュール）

- 上部: コンパクト月カレンダー（期限のある日に件数チップ）。
- 下部: 選択日の期限タスクアジェンダ。
- アジェンダからタスク選択時: Pane 2 / 3 の選択状態を合わせる。
- **サブタスク編集は Pane 4 では行わない**（Pane 3 に集約）。

## 5. データ・連携方針

### 5.1 スキーマ（作り直し版）

マイグレーションは `workspace-ui-kit/supabase/migrations/` に置く。

| ファイル | 内容 |
| --- | --- |
| `20260611000000_task_statuses.sql` | `task_statuses` + seed 関数 + 新規ユーザー trigger |
| `20260611000001_projects.sql` | `projects` テーブル + RLS |
| `20260611000002_subtasks.sql` | `subtasks` テーブル + 強化 RLS |
| `20260611000003_tasks_status_and_project.sql` | `status_id` / `project_id` 追加、旧列 DROP、RLS 強化 |

#### `task_statuses`

| 列 | 備考 |
| --- | --- |
| `id` | uuid, PK |
| `user_id` | RLS 主体 |
| `code` | 安定 ID（`not_started` 等）。`(user_id, code)` UNIQUE |
| `label` | 画面表示名（`未着手` 等） |
| `sort_order` | Pane 2 グループ表示順 |

#### `tasks`

| 列 | 備考 |
| --- | --- |
| `status_id` | uuid, NOT NULL, FK → `task_statuses` **`ON DELETE RESTRICT`** |
| `project_id` | uuid, nullable, FK → `projects` **`ON DELETE SET NULL`** |
| 廃止 | **`status` text**、**`genre`**、**`sub_status`** |

#### `subtasks`

| 列 | 備考 |
| --- | --- |
| `task_id` | FK → `tasks`。`ON DELETE CASCADE` |
| `user_id` | INSERT 時に親 `tasks.user_id` をアプリが引き継ぐ |
| `title`, `is_done`, `sort_order` | v1 はこれのみ |

#### RLS・インデックス

| 対象 | index / 方針 |
| --- | --- |
| `task_statuses` | `(user_id, sort_order)` |
| `projects` | `(user_id, sort_order)` |
| `tasks` | `(user_id, project_id)`、`(user_id, status_id)`。INSERT/UPDATE で他人の `project_id` / `status_id` を SET 不可 |
| `subtasks` | `(task_id, sort_order)`。INSERT/UPDATE で親 `tasks.user_id` 整合を subquery チェック |

### 5.2 クライアント分担

| クライアント | 役割 |
| --- | --- |
| **workspace-ui-kit `/mobile`** | スマホ向け。**v1 入力: タイトル・期限・status（5 択）・project（任意）** |
| **workspace-ui-kit `/`** | PC 4 ペイン。プロジェクト割当・サブタスク・スケジュール |
| **自動報告ツール** | 日次レポート。**DB を読むだけ**。**ステータス別**にセクション分け（§5.9） |

### 5.3 正本データと実装フェーズ

- 業務データの正本は **Supabase**。
- JSON（`data/*.json`）は UI 検証用の仮データ。**本番移行しない**。
- 失敗時トースト（`sonner` 等）は JSON フェーズから導入済み。

### 5.4 認証（2026-06-11 確定）

- **メール + パスワード**（Supabase Auth）。
- ログイン画面・middleware・サーバー／クライアント用 Supabase クライアントを kit に導入。
- Redirect URL 例: `http://localhost:3000/auth/callback`（本番 URL も Dashboard に登録）。

### 5.5 同期・保存

- Supabase Realtime は v1 で使わない。
- 保存は成功時のみ UI に反映。失敗時はトースト + 再取得。
- 複数端末の同時編集は最後の書き込み優先。

### 5.6 削除

- タスク削除: subtasks は `ON DELETE CASCADE`。
- プロジェクト削除: 配下タスクの `project_id` は null（未割当）。
- **確認ダイアログ必須**: タスク削除・プロジェクト削除。サブタスク行削除は確認なし。

### 5.7 未割当

- `project_id = null` のタスクを Pane 1「未割当」に集約。
- Pane 2 取得は DB クエリで **`project_id IS NULL`** を絞る。

### 5.8 旧列廃止手順（`status` text / `genre` / `sub_status`）

| 段階 | 内容 |
| --- | --- |
| 1 | kit（PC + `/mobile`）を `status_id` + `task_statuses` で読み書き |
| 2 | 日次レポートを `task_statuses` JOIN + **ステータス別セクション**（§5.9）に改修 |
| 3 | お試し `web/` 廃止 or 除去 |
| 4 | `20260611000003_tasks_status_and_project.sql` 適用（旧 text 列 DROP 含む） |

既存値の退避・自動移行は行わない。

### 5.9 日次レポート（2026-06-11 確定）

#### 対象タスク（案 B）

- **`task_statuses.code = 'done'`（完了）以外**のタスクをすべて掲載する。
- 未着手・進行中・至急対応・保留中（および将来追加したステータス）が対象。

#### レイアウト

**1. 本日期限（最上部・目立たせる）**

- `due_date = 今日` かつ `code <> 'done'` のタスクを **最初のセクション** にまとめる（旧仕様踏襲）。
- 本日期限に載せたタスクは、以降のステータス別セクションには **重複掲載しない**。

**2. ステータス別セクション（本日期限の次）**

掲載順は **`task_statuses.sort_order` ではなく、次の固定順**：

| 順 | code | label |
| --- | --- | --- |
| 1 | `urgent` | 至急対応 |
| 2 | `in_progress` | 進行中 |
| 3 | `not_started` | 未着手 |
| 4 | `on_hold` | 保留中 |

`done`（完了）はレポート全体から除外。

**3. セクション内の並べ方 — プロジェクト（旧ジャンル）ごと + 期限順**

各ステータスセクション内では：

1. **プロジェクト名**（`projects.name`）でグループ化。`project_id IS NULL` は **「未割当」** グループ。
2. グループの並び: プロジェクト名の五十音順（`localeCompare('ja')`）。「未割当」は末尾。
3. グループ内: **期限昇順**（`due_date` null は末尾）。

```
【本日期限】          ← 最上部・強調
  ・タスクX / 至急対応 / 検査

【至急対応】
  ■ 検査
    ・タスクA / 2026-06-20
    ・タスクB / 期限なし
  ■ 未割当
    ・タスクC / 2026-06-18

【進行中】
  ■ システム
    ・…

【未着手】
  …

【保留中】
  …
```

| ルール | 内容 |
| --- | --- |
| 対象 | `code <> 'done'` |
| 本日期限 | 最上部。ここに載せた ID は下位セクションから除外 |
| ステータスセクション順 | 至急対応 → 進行中 → 未着手 → 保留中（固定） |
| セクション内 | プロジェクト別見出し + 期限昇順 |
| 空セクション | タスク 0 件なら見出し + 「なし」等（実装時に統一） |

#### DB クエリ方針

- `tasks` を `task_statuses`（`status_id`）と `projects`（`project_id` LEFT JOIN）に JOIN。
- 判定は **`task_statuses.code`**（文字列ラベル比較は使わない）。
- 旧 `genre` / `sub_status` / 「完了待ち」セクション / 「対応中（ジャンル別）」は **廃止**。

#### その他

- レポート本体は DB に永続保存しない（都度生成 → LINE 送信）。
- 環境変数 `STATUS_*` による日本語ラベル一致は廃止し、`code` ベースに統一。

### 5.10 Server / Client 境界

- 接続フェーズ: `app/page.tsx` を `async` + Supabase 取得。
- `Workspace` は `"use client"` のまま。取得結果は props で渡す。

## 6. スコープ外（v1）

- 自動報告ツール `web/` の維持（廃止予定）。
- プロジェクトの多段ツリー。
- `subtasks` のドラッグ並べ替え UI。
- Supabase Realtime。
- 明示的な編集競合解決 UI。
- `genre` / `sub_status` 既存値の自動移行。
- レポートの「完了待ち」セクション。

## 7. 要件確定事項

### 7.1 2026-05-14 グリル（引き続き有効）

| ID | 論点 | 回答 |
| --- | --- | --- |
| O-9 | プロジェクト削除時の配下タスク | `ON DELETE SET NULL` |
| O-10 | サブタスク行削除 | 可・確認なし |
| O-11 | 空状態・エラー UI | 各ペイン空状態 / 初回失敗はページ全体ブロック / 保存失敗はトースト |
| O-14 | 削除確認 | タスク・プロジェクトとも必須 |
| O-15 | トースト | JSON フェーズから導入 |
| O-16 | Server / Client | 初回 Server / Workspace は client |
| O-17 | subtasks.user_id | 親 tasks.user_id を INSERT 時に引き継ぐ |
| O-18 | 未割当一覧 | DB で `project_id IS NULL` |
| O-19 | Pane 1 | フラット `Project[]` に作り直し済み |

### 7.2 2026-06-11 作り直し確定（上書き）

| 論点 | 旧仕様 | **確定** |
| --- | --- | --- |
| O-8 genre | PC で genre 編集 | **genre 廃止。project 一本化** |
| スマホ UI | 自動報告ツール `web/` | **kit `/mobile`** |
| migrations | 連携先 repo | **kit `supabase/migrations/`** |
| Pane 4 | サブタスク | **スケジュール**（サブタスクは Pane 3） |
| 完了待ち | sub_status ベース | **レポートからセクション廃止** |
| Auth | web/ 同型 | **メール + パスワード** |

## 8. 推奨する次ステップ

1. ~~マイグレーション SQL 草案~~ — **作成済み**（`supabase/migrations/`）
2. ~~仕様書・pane-mapping 更新~~ — 本書反映済み
3. **Supabase Auth 導入** — kit にログイン・middleware
4. **`/mobile` スマホ登録画面** — v1 入力項目
5. **PC 4 ペイン Supabase 接続** — deleteProject SET NULL 修正含む
6. **日次レポート改修** — ステータス別セクション（`done` 除外）
7. **お試し `web/` 廃止明記 or 削除**
8. **`20260611000003` 適用** — genre / sub_status DROP

## 9. 参考

- `docs/handoff.md` — 引き継ぎメモ
- `docs/pane-mapping-task-workspace.md` — ペイン写像表
- `supabase/migrations/*.sql` — スキーマ草案
- `components/workspace/Workspace.tsx` — 4 ペイン親（Pane 3 = 詳細+subtasks、Pane 4 = スケジュール）
- `creating-visual-explainers/output/DBdesign.html` — データ設計図解

---

*2026-05-14 グリル + 2026-06-11 作り直し 6 論点確定を反映。*
