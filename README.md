# Bug Tracker

一个好玩的VSCode扩展，帮助开发者快速记录、管理和追踪代码中的Bug问题，通过markdown文件实现bug列表的导出和导入：）

## ✨ 主要功能

### 🐛 快速Bug记录

- 在代码中直接标记Bug位置
- 支持键盘快捷键 `Ctrl+Shift+B` (Mac: `Cmd+Shift+B`)
- 可视化Bug标记，鼠标悬停查看详情

### 📝 独立Bug记录

- 不依赖代码位置的Bug记录
- 适合记录设计问题、架构缺陷、用户体验问题
- 支持添加详细的解决方案

### 📊 Markdown报告

- 自动导出Bug报告到Markdown文件
- 包含统计概览和详细信息
- 支持双向同步，可编辑后重新导入

### ⏰ 时间跟踪

- 显示Bug创建和更新时间
- 智能相对时间显示（几分钟前、几小时前等）
- 自动按时间排序

### 🔄 状态管理

- 四种Bug状态：Open、In Progress、Resolved、Closed
- 严重程度分级：Critical、High、Medium、Low
- 解决方案记录和更新

## 🚀 快速开始

### 安装

从VSCode扩展市场搜索 "Bug Tracker" 并安装。（暂时还未上线）

### 基本使用

1. **记录代码Bug**

   - 将光标放在有问题的代码行
   - 按 `Ctrl+Shift+B` 或右键选择 "添加Bug记录"
   - 输入描述和选择严重程度
2. **添加独立Bug**

   - 在Bug追踪器面板点击 "+" 按钮
   - 或使用命令面板：`Ctrl+Shift+P` → "添加独立Bug记录"
3. **管理Bug**

   - 在Bug追踪器面板查看所有Bug
   - 右键Bug项目可更新状态、添加解决方案或删除
4. **导出报告**

   - 点击Bug面板的导出按钮
   - 自动生成 `BUG_TRACKER.md` 文件

## 📋 命令列表

| 命令            | 快捷键           | 说明                    |
| --------------- | ---------------- | ----------------------- |
| 添加Bug记录     | `Ctrl+Shift+B` | 在当前代码位置添加Bug   |
| 添加独立Bug记录 | -                | 添加不依赖代码位置的Bug |
| 导出Bug报告     | -                | 导出Markdown格式报告    |
| 导入Bug记录     | -                | 从Markdown文件导入Bug   |
| 更新解决方案    | -                | 为Bug添加或更新解决方案 |

## 🎯 使用场景

### 开发过程中

- 快速标记发现的Bug，不中断编码流程
- 记录临时解决方案和TODO项目
- 代码审查时标记问题点

### 团队协作

- 共享Bug追踪Markdown文件
- 统一的Bug记录格式
- 便于代码交接和知识传递

### 项目管理

- 生成Bug统计报告
- 跟踪Bug解决进度
- 项目质量评估依据

## 📸 截图展示

### Bug列表面板

显示所有Bug的概览，包含文件位置、严重程度、状态和时间信息。
![20250618134822](https://raw.githubusercontent.com/POCRO/myPic/main/pics20250618134822.png)
### 代码中的Bug标记

在代码编辑器中直接显示Bug位置，红色背景标记配合🐛图标。
![20250618134835](https://raw.githubusercontent.com/POCRO/myPic/main/pics20250618134835.png)
### Markdown报告

自动生成的详细报告，包含统计信息和完整的Bug记录。
![20250618134856](https://raw.githubusercontent.com/POCRO/myPic/main/pics20250618134856.png)

## 🔄 更新日志

### 1.0.0

- 初始版本发布
- 支持代码Bug标记和独立Bug记录
- Markdown导出和导入功能
- 时间跟踪和状态管理
- 解决方案记录功能

## 🤝 贡献指南

欢迎提交建议和改进意见！

## 📄 许可证

本项目基于MIT许可证开源。详见 [LICENSE](LICENSE) 文件。

## 🐞 问题反馈

如果遇到问题或有功能建议，请通过以下方式联系：

- 邮箱：your.email@example.com
- 或者在使用过程中通过插件反馈

## 👨‍💻 作者

**Porcovvsky** - *初始开发*

---

**享受无Bug的编程体验！** 🎉
