# ChurchServe - 教會小組服事報名系統

開放原始碼的教會小組服事排班與報名系統，採用 Mobile-First 設計，讓弟兄姊妹可以輕鬆在手機上完成服事登記。

## 功能特色

### 前台（無需登入）

- 依小組與月份查看服事表
- 點擊任一格子即可報名服事
- 支援從成員清單選擇或輸入自訂名稱
- 桌面版表格檢視 / 行動版卡片檢視
- 底部彈出式選單（Bottom Sheet）選人

### 後台管理

- **小組管理**：新增、重新命名、刪除小組
- **成員管理**：新增、停用、刪除成員（軟刪除）
- **服事項目管理**：新增、排序、刪除各小組的服事項目
- **排班管理**：
  - 鎖定日期（例如：暫停聚會、聯合聚會）
  - 新增特殊聚會（非週六的活動）
  - 管理員直接指派/修改任何人員配置
  - 查看排班歷史

## 技術架構

| 層級 | 技術 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| 語言 | TypeScript 5 |
| 資料庫 | Cloudflare D1 (Serverless SQLite) |
| 部署 | Cloudflare Workers + OpenNext |
| 認證 | JWT (jose) + PBKDF2 密碼雜湊 |
| 驗證 | Zod 4 |
| 授權 | GPL-3.0 |

## 資料庫結構

| 資料表 | 說明 |
|--------|------|
| Groups | 小組 |
| Members | 成員（支援軟刪除） |
| ServiceItems | 服事項目（依小組管理） |
| Admins | 管理員帳號 |
| LoginAttempts | 登入嘗試紀錄（IP 限流用） |
| DutySchedules | 排班日期（含鎖定與特殊活動） |
| DutyAssignments | 服事指派（含樂觀鎖定） |

## 安全機制

- **密碼雜湊**：PBKDF2（100,000 次迭代），Argon2id 格式儲存
- **JWT 認證**：HS256, 24 小時有效期
- **強制改密**：首次登入必須更改預設密碼
- **登入限流**：每 IP 每 15 分鐘最多 5 次嘗試
- **報名限流**：每 IP 每分鐘最多 10 次寫入
- **XSS 防禦**：自訂 HTML 淨化器 + 安全標頭（CSP, X-Frame-Options 等）
- **樂觀鎖定**：DutyAssignments.version 欄位防止併發覆寫
- **輸入驗證**：所有 API 皆使用 Zod schema 驗證

## 快速開始

### 本機開發

```bash
# 複製環境變數
cp .env.example .env

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

開啟 http://localhost:3000

### 部署到 Cloudflare

```bash
# 1. 建立 D1 資料庫
wrangler d1 create churchserve-db

# 2. 更新 wrangler.jsonc 中的 account_id 與 database_id

# 3. 執行資料庫 Schema
wrangler d1 execute churchserve-db --remote --file=schema.sql

# 4. 設定環境變數
wrangler secret put JWT_SECRET

# 5. 建置
npm run pages:build

# 6. 部署
npx wrangler deploy
```

### NPM Scripts

| 指令 | 說明 |
|------|------|
| `npm run dev` | 本機開發伺服器 |
| `npm run build` | Next.js 建置 |
| `npm run lint` | ESLint 檢查 |
| `npm run pages:build` | Cloudflare Pages 建置 |
| `npm run pages:dev` | Cloudflare 本機模擬 |

## 預設管理員帳號

| 欄位 | 值 |
|------|-----|
| 帳號 | `admin` |
| 密碼 | `admin123` |
| 首次登入 | 必須更改密碼 |

## 環境變數

在 `.env.example` 中有完整範例，主要變數：

| 變數 | 說明 |
|------|------|
| `JWT_SECRET` | JWT 簽章密鑰（建議使用隨機字串） |

## 專案結構

```
src/
├── app/
│   ├── page.tsx                    # 前台服事表（無需登入）
│   ├── admin/
│   │   ├── login/page.tsx          # 登入頁面
│   │   ├── page.tsx                # 管理後台首頁
│   │   ├── groups/                 # 小組管理
│   │   ├── schedule/               # 排班管理
│   │   └── layout.tsx              # 後台佈局（含認證守衛）
│   └── api/                        # API 路由
│       ├── auth/                   # 認證 API
│       ├── groups/                 # 小組 CRUD API
│       ├── schedules/              # 排班 API
│       ├── assignments/            # 指派 API
│       └── admin/                  # 管理員專用 API
├── lib/server/
│   ├── auth/                       # JWT 與密碼雜湊
│   ├── db/                         # D1 資料庫操作
│   └── middleware/                  # 限流、驗證、XSS 淨化
└── types/                          # TypeScript 介面定義
```

## 設計風格

採用溫暖大地色系，適合教會氛圍：

- 背景：米白 `#FDF8F3`
- 主色：木質棕 `#8B6F47`
- 副色：大地綠 `#6B8E5A`
- 強調色：暖橘 `#E8913A`
- 危險色：赤陶 `#C75B3F`

## 授權條款

[GPL-3.0](LICENSE)
