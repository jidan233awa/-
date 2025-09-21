# 打卡日历 Check-in Calendar

基于 Next.js 15 App Router 与 shadcn/ui 的轻量级打卡工具，适合习惯养成、晨会签到或团队打卡。界面默认中文，布局支持移动端。

## 功能
- 月历视图：支持按月切换，今日高亮，正常打卡与补卡差异化标记。
- 打卡规则：每天仅一次打卡，未来日期不可操作，补卡前需确认。
- 统计面板：展示总打卡数、本月打卡数、连续天数与补卡次数。
- 数据导出：本地存储在浏览器，可**导出**文件，自行备份或恢复。
- 数据管理：提供补卡记录查阅、导入合并、清空数据等功能。
- UI 设计：响应式+简洁风。

## 快速开始
```bash
npm install
npm run dev
# 浏览器访问
```

## 构建与部署
```bash
npm run build
npm start
```
推荐使用 Vercel 部署，也可在任何支持 Node.js 的平台运行（如 Netlify、Railway、Render、AWS 等）。

## 项目结构
```text
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── check-in-calendar.tsx
│   ├── enhanced-check-in-calendar.tsx
│   └── statistics-page.tsx
└── lib/
    └── utils.ts
```

## 脚本
- `npm run dev`：启动开发服务器（Turbopack）。
- `npm run build`：构建生产版本。
- `npm start`：运行构建后的产物。
- `npm run lint`：执行 ESLint。

## 数据说明
- 打卡数据与补卡记录仅保存在浏览器 LocalStorage。
- 导出功能会生成 `.crw` 文件，可用于备份与导入合并。
- 清除数据后所有记录会被移除，操作不可撤销。

## 贡献
欢迎以 Issue 或 Pull Request 的形式反馈问题与提交改进，在提交 PR 前记得跑一遍 lint 与 build。

## 许可证
本项目采用 MIT License。
