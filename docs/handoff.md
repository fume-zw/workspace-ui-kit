# 引き継ぎメモ：タスク管理ワークスペース

新チャット開始時に **このファイルを読ませる** か、末尾の「新チャット用プロンプト」を貼り付けてください。

**最終更新:** 2026-06-18（両リポ commit & push 完了・Actions Variables 削除は gh auth 待ち）

---

## 1. プロジェクト概要

**タスク管理ワークスペース** — PC 4ペイン + スマホ `/mobile` + Supabase + 日次レポート連携

| リポジトリ | パス | 役割 |
|-----------|------|------|
| **workspace-ui-kit** | `C:\Users\うめ\src\workspace-ui-kit` | **本体**。PC 4ペイン + **`/mobile` v1** + **migrations 正本** + Auth |
| 自動報告ツール | `C:\Users\うめ\Desktop\My-First-Project\自動報告ツール` | 日次レポートのみ。**web/ は 2026-06 削除済み** |
| 図解 | `C:\Users\うめ\src\creating-visual-explainers\output\DBdesign.html` | データ設計図解 |
| 仕様書 | `workspace-ui-kit/docs/spec-task-workspace.md` | 要件の正本 |
| ペイン写像 | `workspace-ui-kit/docs/pane-mapping-task-workspace.md` | UI ↔ データ対応 |

**利用者:** 自分1人（将来ステータス追加の可能性あり）

---

## 2. 確定した設計方針

### データの持ち方

- **Supabase = 業務データの正本**（タスク・プロジェクト・サブタスク・ステータスマスタ）
- **GitHub = プログラム + migrations/*.sql + 仕様書 + .env.example**
- **data/*.json = UI 検証用の仮データ。本番移行しない**
- ブラウザで保存 → **DB だけ更新。GitHub は変わらない**
- 秘密情報 → `.env.local` / GitHub Secrets（リポジトリに入れない）

### 作り直し方針

- お試し **web/**（自動報告ツール）廃止
- **DB + PC + `/mobile` を workspace-ui-kit に集約**
- 日次レポートは別 repo から **同じ Supabase を読むだけ**

### genre → project 一本化

- `tasks.genre` 廃止 → `projects` + `tasks.project_id`
- `tasks.sub_status` 廃止 → `subtasks` テーブル

### ステータス（task_statuses テーブル）

text 列ではなく **マスタテーブル + `tasks.status_id`**。ユーザーごとに保持（将来追加可）。

| sort | code | label |
|------|------|-------|
| 1 | `not_started` | 未着手 |
| 2 | `in_progress` | 進行中 |
| 3 | `urgent` | 至急対応 |
| 4 | `on_hold` | 保留中 |
| 5 | `done` | 完了 |

サインアップ時に 5 件自動 seed（`seed_default_task_statuses`）。

### 4 ペイン責務（UI 正）

| ペイン | 責務 |
|--------|------|
| Pane 1 | プロジェクト + 未割当 |
| Pane 2 | タスク一覧（ステータス別グループ） |
| Pane 3 | タスク詳細 + **サブタスクチェックリスト** |
| Pane 4 | **スケジュール**（カレンダー + 期限タスク） |

### クライアント分担

| ルート | 用途 | v1 入力 |
|--------|------|---------|
| `/` | PC 4ペイン | 全項目 + サブタスク |
| `/mobile` | スマホ（**v1 実装済み**） | タイトル・期限・ステータス 5 択・project（任意） |

### Auth（実装済み）

- **メール + パスワード**（Supabase Auth）
- `/login` — ログイン・新規登録
- `/auth/callback` — メール確認後
- `middleware.ts` — 未ログイン → `/login` へリダイレクト
- **PC `/` も Supabase から読み書き**（`data/*.json` は検証用サンプルのみ）

### 日次レポート形式（確定）

1. **【本日期限】** — 最上部・目立たせる。`due_date = 今日` かつ `done` 以外
2. **【至急対応】→【進行中】→【未着手】→【保留中】**（固定順）
3. 各ステータスセクション内: **プロジェクト名でグループ** → グループ内 **期限昇順**
4. 本日期限に載せたタスクは下位セクションに **重複しない**
5. `done`（完了）はレポート全体から除外
6. 判定は `task_statuses.code`（日本語ラベル文字列比較は使わない）

---

## 3. DB スキーマ（リレーション）

```
auth.users
  ├── task_statuses (1:N)  … 進捗マスタ（5 seed + 将来追加可）
  ├── projects      (1:N)  … Pane 1
  ├── tasks         (1:N)  … Pane 2/3/4
  │     ├── status_id  → task_statuses (N:1, NOT NULL)
  │     └── project_id → projects     (N:1, nullable = 未割当)
  └── subtasks      (1:N)  … Pane 3 下部
        └── task_id → tasks (N:1, CASCADE 削除)

削除の動き:
  プロジェクト削除 → タスクの project_id = null（未割当）
  タスク削除       → subtasks も削除（CASCADE）
  ステータス削除   → RESTRICT（参照中は削除不可）
```

---

## 4. migrations（kit 正本・作成済み）

`workspace-ui-kit/supabase/migrations/`

| ファイル | 内容 |
|----------|------|
| `20260611000000_task_statuses.sql` | task_statuses + seed 5 件 + 新規ユーザー trigger |
| `20260611000001_projects.sql` | projects + RLS |
| `20260611000002_subtasks.sql` | subtasks + 強化 RLS |
| `20260611000003_tasks_status_and_project.sql` | status_id / project_id 追加、status・genre・sub_status DROP |

**前提:** 同一 Supabase プロジェクトに、自動報告ツール側 `20260409120000_tasks.sql` で `tasks` テーブルが **既にある** 場合を想定。000003 は旧列 DROP を含むため、**kit・レポート改修後**に適用。

---

## 5. 実装状況

### 完了

- [x] 設計方針確定（6+ 論点）
- [x] migrations 草案 4 ファイル
- [x] spec / pane-mapping / DBdesign / handoff 更新
- [x] Supabase Auth（`@supabase/ssr`、login、middleware、`.env.example`）
- [x] **`/mobile` スマホ登録画面 v1**（`lib/task-db.ts`、`MobileTaskForm`、Supabase INSERT）
- [x] **PC 4ペイン Supabase 接続**（`app/page.tsx` → `fetchWorkspaceData`、CRUD 一式）
- [x] `schema.ts` 5 ステータス化・`subStatus` 除去
- [x] `deleteProject` → DB 削除 + タスク `project_id` null 反映
- [x] `npm run build` / `npm test` 成功

- [x] **日次レポート改修**（`task_statuses` JOIN + ステータス別セクション + プロジェクトグループ化）
- [x] **レポートローカルプレビュー**（`preview-report.mjs` + `npm run preview-report`）
- [x] **レポート本番 DB 確認**（`preview-report` で Supabase 14 件取得）
- [x] **レポート本番パイプライン**（`build-report` → Storage `daily-2026-06-11.png` アップロード成功）

### 本セッションで実施したこと（2026-06-11）

| 順 | 内容 |
|----|------|
| 1 | **`/mobile` v1** — タイトル・期限・ステータス 5 択・project（任意）、Supabase INSERT |
| 2 | スマホ期限 UI を PC 版 `InlineDateField`（Popover + Calendar）に統一 |
| 3 | スマホ Select の表示バグ修正（UUID / `__unassigned__` → 日本語ラベル） |
| 4 | **PC 4ペイン Supabase 接続** — 読み書き CRUD、`schema.ts` 5 ステータス化、`subStatus` 除去 |
| 5 | **日次レポート改修** — `lib/report.mjs` / `render-html.mjs` / `supabase-tasks.mjs` 等 |
| 6 | レポート単体テスト `npm test`（自動報告ツール）5 件成功 |
| 7 | migrations はユーザー側で Supabase に適用済み（`/mobile` 動作確認済み） |
| 8 | **お試し `web/` 削除** — git から除去、`INFORMATION.md` を workspace-ui-kit 向けに更新 |
| 9 | **レポート本番確認** — `.env` に `SUPABASE_SERVICE_ROLE_KEY` 設定、`preview-report` / `build-report` 成功 |

### 未着手（推奨順）

1. **GitHub Actions Variables の削除** — `gh auth login` 後、`INFORMATION.md` H 節の `gh variable delete` コマンドで `STATUS_*` / `COMPLETION_PENDING_PATTERN` を削除（**2026-06-18: gh 未ログインのため手動認証が必要**）

### 2026-06-18 セッション

| 順 | 内容 |
|----|------|
| 1 | **workspace-ui-kit** commit & push → `e474628`（`fume-zw/workspace-ui-kit` main） |
| 2 | **自動報告ツール** commit & push → `1e07cbc`（`fume-zw/task-daily-report` main） |
| 3 | GitHub Actions Variables 削除 — `gh auth login` 待ち |

### 既知のコード上の問題

| 問題 | ファイル / 対処 |
|------|----------------|
| `data/*.json` はスキーマ検証用のみ | `workspace-ui-kit/data/*.json` |
| ~~お試し `web/`~~ | **2026-06 削除済み**（`INFORMATION.md` に移行先を記載） |
| ~~`SUPABASE_SERVICE_ROLE_KEY` 未設定~~ | **設定済み**（本番 DB 14 件・Storage アップロード確認済み） |
| Gemini 無料枠で 429 になりやすい | レポートはフォールバックの「確認すること」で続行（プレビュー時に確認済み） |

---

## 6. Auth 関連ファイル（kit）

| パス | 役割 |
|------|------|
| `lib/supabase/client.ts` | ブラウザ用クライアント |
| `lib/supabase/server.ts` | Server Component 用 |
| `lib/supabase/middleware.ts` | セッション更新 + 保護 |
| `middleware.ts` | Next.js ミドルウェア |
| `app/login/page.tsx` | ログイン画面 |
| `app/mobile/page.tsx` | スマホ登録画面（v1） |
| `components/mobile/MobileTaskForm.tsx` | スマホ登録フォーム |
| `lib/task-db.ts` | ワークスペース全体の Supabase CRUD + 取得 |
| `components/workspace/Workspace.tsx` | 4 ペイン state + DB 永続化 |
| `components/auth/LoginForm.tsx` | フォーム UI |
| `app/auth/callback/route.ts` | OAuth / メール確認コールバック |
| `.env.example` | 環境変数見本 |

### 日次レポート関連（自動報告ツール）

| パス | 役割 |
|------|------|
| `lib/report.mjs` | 正規化 + 本日期限 / ステータス別 / プロジェクト別分類 |
| `lib/supabase-tasks.mjs` | tasks + task_statuses + projects JOIN 取得、PNG Storage |
| `lib/render-html.mjs` | レポート HTML / プレーンテキスト |
| `build-report.mjs` | 本番用（Supabase → PNG → Storage） |
| `preview-report.mjs` | **ローカルプレビュー**（`output/report-preview-YYYY-MM-DD.html`） |
| `test/report.test.mjs` | 分類・描画の単体テスト |

**レポートをローカルで試す:**

```powershell
cd C:\Users\うめ\Desktop\My-First-Project\自動報告ツール
npm run preview-report          # HTML のみ（SERVICE_ROLE 無し → サンプルデータ）
npm run preview-report -- --png # PNG も生成（Puppeteer）
npm run build-report            # 本番（SERVICE_ROLE 必須 → Storage アップロード）
```

---

## 7. ローカルで試す手順（初心者向け）

### 用語の整理

| 用語 | 意味 |
|------|------|
| **Supabase** | タスクデータを保存するクラウド DB + ログイン機能 |
| **`.env.local`** | パスワード的な設定ファイル。PC 内だけに置く（Git に上げない） |
| **`npm run dev`** | 開発用サーバーを起動するコマンド |
| **migration** | DB のテーブルを作る SQL の設計図 |

---

### ステップ 0: 必要なもの

- Node.js（インストール済み想定）
- Supabase アカウント（無料枠で可）
- 自動報告ツールで **既に使っている Supabase プロジェクト** があれば、それを流用して OK

---

### ステップ 1: Supabase のキーを取得

1. ブラウザで [https://supabase.com/dashboard](https://supabase.com/dashboard) を開く
2. プロジェクトを選ぶ（なければ **New project** で作成）
3. 左メニュー **Project Settings**（歯車）→ **API**
4. 次の 2 つをメモ帳にコピー:
   - **Project URL**（`https://xxxx.supabase.co`）
   - **anon public** キー（`eyJ...` で始まる長い文字列）

> anon キーは「公開してよい鍵」ですが、**.env.local にだけ置き、GitHub には push しない** 運用にします。

---

### ステップ 2: ログイン用 URL を Supabase に登録

1. 左メニュー **Authentication** → **URL Configuration**
2. **Site URL** に `http://localhost:3000` を設定（ローカル開発用）
3. **Redirect URLs** に次を **1 行ずつ追加**:
   ```
   http://localhost:3000/auth/callback
   ```
4. **Save**

> これがないと、新規登録メールのリンクやログイン後のリダイレクトが失敗します。

---

### ステップ 3: `.env.local` を作る

1. エクスプローラーで `C:\Users\うめ\src\workspace-ui-kit` を開く
2. `.env.example` をコピーして **`.env.local`** にリネーム
3. 中身を編集（ステップ 1 でコピーした値を貼る）:

```env
NEXT_PUBLIC_SUPABASE_URL=https://あなたのプロジェクト.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJあなたのanonキー...
```

4. 保存

> `.env.local` は `.gitignore` 対象なので、Git には含まれません。

---

### ステップ 4: 開発サーバーを起動

1. **PowerShell** または **Cursor のターミナル** を開く
2. 次を順に実行:

```powershell
cd C:\Users\うめ\src\workspace-ui-kit
npm install
npm run dev
```

3. ターミナルに `http://localhost:3000` と表示されたら成功
4. ブラウザで `http://localhost:3000` を開く
   - 未ログイン → 自動的に **`/login`** へ

---

### ステップ 5: アカウントを作ってログイン

1. `/login` で **新規登録** タブを選ぶ
2. メールアドレスとパスワード（6 文字以上）を入力 → **登録する**
3. Supabase で **メール確認が ON** の場合:
   - 届いたメールのリンクをクリック → `/auth/callback` 経由で戻る
4. **メール確認が OFF** の場合:
   - そのまま **ログイン** タブで同じメール・パスワードでログイン
5. ログイン成功 → **`/`** に 4 ペインが表示される（**Supabase のデータ**）
6. スマホ登録を試す → **`/mobile`** を開く

> Supabase Dashboard → **Authentication** → **Providers** → Email で「Confirm email」の ON/OFF を確認できます。

---

### ステップ 6（任意）: DB テーブルを Supabase に作る

Auth だけ試すなら **ステップ 5 までで OK** です。  
タスクを DB に保存するには、migrations を適用します。

**方法 A: Supabase ダッシュボード（CLI 不要・初心者向け）**

1. Dashboard → **SQL Editor** → **New query**
2. 次のファイルを **番号順に** 開いて、中身をすべてコピー＆実行:
   - `supabase/migrations/20260611000000_task_statuses.sql`
   - `supabase/migrations/20260611000001_projects.sql`
   - `supabase/migrations/20260611000002_subtasks.sql`
   - `supabase/migrations/20260611000003_tasks_status_and_project.sql`
3. エラーが出たら:
   - `tasks` テーブルが無い → 先に自動報告ツール側 `20260409120000_tasks.sql` を実行
   - 列が既にある → その migration はスキップ

**方法 B: Supabase CLI**（慣れている場合）

```powershell
cd C:\Users\うめ\src\workspace-ui-kit
npx supabase link --project-ref あなたのproject-ref
npx supabase db push
```

---

### よくあるつまずき

| 症状 | 対処 |
|------|------|
| `/login` に飛ぶがログインできない | `.env.local` の URL/キーを再確認。サーバー再起動（Ctrl+C → `npm run dev`） |
| 「Invalid login credentials」 | パスワード違い、または未登録。新規登録から |
| メールリンクが開けない | Redirect URLs に `http://localhost:3000/auth/callback` があるか確認 |
| ログイン後も真っ白 / エラー | ターミナルのエラーログを確認。`.env.local` 未設定の可能性 |
| 4 ペインが空 / エラー画面 | migrations 未適用、または `task_statuses` が空 |

---

## 8. 新チャット用プロンプト（コピペ用）

```
workspace-ui-kit/docs/handoff.md を読んで前提を把握してください。

タスク管理ワークスペースの作り直しを続けます。

【完了済み】
- migrations 適用・/mobile v1・PC 4ペイン Supabase・日次レポート本番確認・web/ 削除

【次にやること（推奨順）】
1. GitHub Actions Variables から STATUS_* / COMPLETION_PENDING_PATTERN を削除
   （gh auth login → INFORMATION.md H 節のコマンド）
```

---

## 9. 発表用サマリー（1文）

> お試し web/ を廃止し、**workspace-ui-kit に PC と `/mobile` を置き、Supabase は project + task_statuses 中心の新スキーマで作り直す**。migrations と Auth は kit が正本。日次レポートだけ別 repo から同じ DB を読む。

---

## 10. 作業中断時サマリー（2026-06-11 時点）

### 全体像

| リポジトリ | 役割 | 状態 |
|-----------|------|------|
| `workspace-ui-kit` | PC 4ペイン + `/mobile` + migrations 正本 | **機能実装完了**（未コミット変更あり） |
| `自動報告ツール` | 日次レポート + LINE 配信 | **本番動作確認済み**（未コミット変更あり） |
| `creating-visual-explainers` | 図解のみ | 本タスクとは無関係 |

### 完了したこと

- Supabase migrations 適用済み（`task_statuses` / `projects` / `subtasks` / `status_id`）
- Auth + PC 4ペイン Supabase 読み書き
- `/mobile` v1（タイトル・期限・ステータス 5 択・project 任意）
- 日次レポート改修（新スキーマ対応）+ 単体テスト 5 件
- お試し `web/` 削除（自動報告ツール）
- レポート本番確認: `preview-report`（DB 14 件）・`build-report`（Storage アップロード成功）

### 未コミット（再開時に整理推奨）

~~**workspace-ui-kit** — Auth / mobile / Supabase CRUD / migrations / handoff など大量の変更がローカルのみ。~~ **2026-06-18 push 済み**（`e474628`）

~~**自動報告ツール** — レポート改修・`web/` 削除・`preview-report.mjs`・`test/` など。~~ **2026-06-18 push 済み**（`1e07cbc`）。`.env` はローカルのみ（コミットしない）。

### 再開時の最初の一手（推奨順）

1. **GitHub Actions Variables 削除**（`gh auth login` → 下記 4 コマンド）
2. ~~**両リポジトリを commit & push**~~ **完了（2026-06-18）**
3. 必要なら GitHub Actions の `workflow_dispatch` で日次レポートを手動実行して本番確認

### すぐ試せるコマンド

```powershell
# タスク管理（kit）
cd C:\Users\うめ\src\workspace-ui-kit
npm run dev          # http://localhost:3000 と /mobile

# 日次レポート（自動報告ツール）
cd C:\Users\うめ\Desktop\My-First-Project\自動報告ツール
npm run preview-report
npm run build-report   # Storage に PNG アップロード
npm test
```

### 本番レポート PNG（最終確認時）

https://kfphgyvopqnzdmsaqgqf.supabase.co/storage/v1/object/public/daily-reports/daily-2026-06-11.png

### 既知の注意

- Gemini 無料枠は 429 になりやすい → 「確認すること」はタスク由来フォールバックで続行
- `data/*.json`（kit）は検証用サンプルのみ。本番データは Supabase
