<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENT RULES
1. 語系與註解：你一律以繁體中文回覆；程式碼註解必須使用英文；修改字串時須同步更新所有 i18n 多語系檔案。
2. 流程先決：新對話開啟時，必須先釐清專案全貌再動工，且預設啟動 Brainstorming（腦力激盪） 進行規劃與實作。
3. Git 控管：自動 Commit(英文) 和 push，且注意不要把敏感資訊放到 github 上。
4. Code 規範：撰寫時須嚴格符合 Lint 規則，修改程式碼後務必執行 npm run lint。
5. 雙色設計：若專案支援不同主題顏色模式，設計時必須同時兼顧深色與淺色模式。
