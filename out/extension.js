"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
class BugManager {
    constructor(context) {
        this.bugs = [];
        this.storageUri = vscode.Uri.joinPath(context.globalStorageUri, 'bugs.json');
        this.markdownUri = this.initMarkdownUri();
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
            border: '1px solid red',
            borderRadius: '3px',
            after: {
                contentText: ' 🐛',
                color: 'red'
            }
        });
        this.loadBugs().then(() => {
            this.updateDecorations();
            // 确保在加载完成后刷新树视图
            if (bugTreeProvider) {
                bugTreeProvider.refresh();
            }
        });
    }
    initMarkdownUri() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            return vscode.Uri.joinPath(workspaceFolder.uri, 'BUG_TRACKER.md');
        }
        // 如果没有工作区，使用全局存储位置
        return vscode.Uri.joinPath(vscode.Uri.parse(vscode.env.appRoot), 'BUG_TRACKER.md');
    }
    async addBug(file, line, column, description, severity, solution, isStandalone = false) {
        const bug = {
            id: Date.now().toString(),
            file,
            line,
            column,
            description,
            severity,
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date(),
            code: isStandalone ? '' : await this.getLineCode(file, line),
            solution,
            isStandalone
        };
        this.bugs.push(bug);
        await this.saveBugs();
        await this.exportToMarkdown();
        this.updateDecorations();
        bugTreeProvider.refresh();
    }
    async removeBug(bugId) {
        this.bugs = this.bugs.filter(bug => bug.id !== bugId);
        await this.saveBugs();
        await this.exportToMarkdown();
        this.updateDecorations();
        bugTreeProvider.refresh();
    }
    async updateBugStatus(bugId, status) {
        const bug = this.bugs.find(b => b.id === bugId);
        if (bug) {
            bug.status = status;
            bug.updatedAt = new Date();
            await this.saveBugs();
            await this.exportToMarkdown();
            bugTreeProvider.refresh();
        }
    }
    async updateBugSolution(bugId, solution) {
        const bug = this.bugs.find(b => b.id === bugId);
        if (bug) {
            bug.solution = solution;
            bug.updatedAt = new Date();
            await this.saveBugs();
            await this.exportToMarkdown();
            bugTreeProvider.refresh();
        }
    }
    getBugs() {
        return this.bugs;
    }
    getBugsForFile(file) {
        return this.bugs.filter(bug => bug.file === file);
    }
    async importFromMarkdown() {
        try {
            const data = await vscode.workspace.fs.readFile(this.markdownUri);
            const content = data.toString();
            const importedBugs = this.parseMarkdownToBugs(content);
            // 合并导入的Bug，避免重复
            for (const importedBug of importedBugs) {
                const exists = this.bugs.find(b => b.id === importedBug.id);
                if (!exists) {
                    this.bugs.push(importedBug);
                }
            }
            await this.saveBugs();
            this.updateDecorations();
            bugTreeProvider.refresh();
        }
        catch (error) {
            console.log('Markdown文件不存在或无法读取，跳过导入');
        }
    }
    async exportMarkdownReport() {
        await this.exportToMarkdown();
    }
    getMarkdownUri() {
        return this.markdownUri;
    }
    refreshDecorations() {
        this.updateDecorations();
    }
    parseMarkdownToBugs(content) {
        const bugs = [];
        const bugRegex = /## Bug #(\d+)\s*\n((?:(?!## Bug #)[\s\S])*)/g;
        let match;
        while ((match = bugRegex.exec(content)) !== null) {
            const [, id, bugContent] = match;
            const descMatch = bugContent.match(/\*\*描述\*\*: (.+)/);
            const severityMatch = bugContent.match(/\*\*严重程度\*\*: (.+)/);
            const statusMatch = bugContent.match(/\*\*状态\*\*: (.+)/);
            const fileMatch = bugContent.match(/\*\*文件\*\*: (.+)/);
            const lineMatch = bugContent.match(/\*\*行号\*\*: (\d+)/);
            const createdMatch = bugContent.match(/\*\*创建时间\*\*: (.+)/);
            const updatedMatch = bugContent.match(/\*\*更新时间\*\*: (.+)/);
            const solutionMatch = bugContent.match(/\*\*解决方案\*\*:\s*\n((?:(?!\*\*)[\s\S])*)/);
            const codeMatch = bugContent.match(/```[\s\S]*?\n(.*)\n```/);
            if (descMatch && severityMatch && statusMatch) {
                const bug = {
                    id,
                    description: descMatch[1].trim(),
                    severity: severityMatch[1].trim(),
                    status: statusMatch[1].trim(),
                    file: fileMatch ? fileMatch[1].trim() : '',
                    line: lineMatch ? parseInt(lineMatch[1]) : 0,
                    column: 0,
                    createdAt: createdMatch ? new Date(createdMatch[1].trim()) : new Date(),
                    updatedAt: updatedMatch ? new Date(updatedMatch[1].trim()) : new Date(),
                    code: codeMatch ? codeMatch[1].trim() : '',
                    solution: solutionMatch ? solutionMatch[1].trim() : '',
                    isStandalone: !fileMatch || fileMatch[1].trim() === ''
                };
                bugs.push(bug);
            }
        }
        return bugs;
    }
    async exportToMarkdown() {
        const content = this.generateMarkdownContent();
        try {
            await vscode.workspace.fs.writeFile(this.markdownUri, Buffer.from(content, 'utf8'));
        }
        catch (error) {
            console.error('导出Markdown失败:', error);
        }
    }
    generateMarkdownContent() {
        const sortedBugs = this.bugs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        let content = `# Bug Tracker报告\n\n`;
        content += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
        // 统计信息
        const statusCount = {
            open: this.bugs.filter(b => b.status === 'open').length,
            'in-progress': this.bugs.filter(b => b.status === 'in-progress').length,
            resolved: this.bugs.filter(b => b.status === 'resolved').length,
            closed: this.bugs.filter(b => b.status === 'closed').length
        };
        content += `## 📊 统计概览\n\n`;
        content += `- 🔴 待处理: ${statusCount.open}\n`;
        content += `- 🟡 进行中: ${statusCount['in-progress']}\n`;
        content += `- 🟢 已解决: ${statusCount.resolved}\n`;
        content += `- ⚪ 已关闭: ${statusCount.closed}\n`;
        content += `- 📝 总计: ${this.bugs.length}\n\n`;
        content += `---\n\n`;
        // Bug详情
        for (const bug of sortedBugs) {
            content += `## Bug #${bug.id}\n\n`;
            content += `**描述**: ${bug.description}\n\n`;
            content += `**严重程度**: ${this.getSeverityEmoji(bug.severity)} ${bug.severity}\n\n`;
            content += `**状态**: ${this.getStatusEmoji(bug.status)} ${bug.status}\n\n`;
            if (!bug.isStandalone && bug.file) {
                content += `**文件**: ${bug.file}\n\n`;
                content += `**行号**: ${bug.line + 1}\n\n`;
                if (bug.code) {
                    content += `**代码片段**:\n\`\`\`\n${bug.code}\n\`\`\`\n\n`;
                }
            }
            else {
                content += `**类型**: 独立Bug记录\n\n`;
            }
            content += `**创建时间**: ${bug.createdAt.toLocaleString('zh-CN')}\n\n`;
            content += `**更新时间**: ${bug.updatedAt.toLocaleString('zh-CN')}\n\n`;
            if (bug.solution) {
                content += `**解决方案**:\n${bug.solution}\n\n`;
            }
            else {
                content += `**解决方案**: 待补充\n\n`;
            }
            content += `---\n\n`;
        }
        return content;
    }
    getSeverityEmoji(severity) {
        switch (severity) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }
    getStatusEmoji(status) {
        switch (status) {
            case 'open': return '🔴';
            case 'in-progress': return '🟡';
            case 'resolved': return '🟢';
            case 'closed': return '⚪';
            default: return '⚪';
        }
    }
    async getLineCode(file, line) {
        try {
            const document = await vscode.workspace.openTextDocument(file);
            if (line < document.lineCount) {
                return document.lineAt(line).text.trim();
            }
        }
        catch (error) {
            // 文件可能不存在或无法访问
        }
        return '';
    }
    async loadBugs() {
        try {
            const data = await vscode.workspace.fs.readFile(this.storageUri);
            const bugsData = JSON.parse(data.toString());
            this.bugs = bugsData.map((bug) => ({
                ...bug,
                createdAt: new Date(bug.createdAt),
                updatedAt: new Date(bug.updatedAt)
            }));
        }
        catch (error) {
            // 文件不存在或格式错误，使用空数组
            this.bugs = [];
        }
    }
    async saveBugs() {
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(this.storageUri, '..'));
            const data = JSON.stringify(this.bugs, null, 2);
            await vscode.workspace.fs.writeFile(this.storageUri, Buffer.from(data));
        }
        catch (error) {
            vscode.window.showErrorMessage(`保存Bug数据失败: ${error}`);
        }
    }
    updateDecorations() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }
        const currentFile = activeEditor.document.uri.fsPath;
        const fileBugs = this.getBugsForFile(currentFile);
        const decorations = fileBugs.map(bug => {
            const timeAgo = this.getTimeAgo(bug.createdAt);
            const hoverMessage = `🐛 ${bug.description}\n严重程度: ${bug.severity}\n状态: ${bug.status}\n创建时间: ${this.formatDate(bug.createdAt)}\n更新时间: ${this.formatDate(bug.updatedAt)}`;
            return {
                range: new vscode.Range(bug.line, bug.column, bug.line, bug.column + 1),
                hoverMessage: hoverMessage
            };
        });
        activeEditor.setDecorations(this.decorationType, decorations);
    }
    formatDate(date) {
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMinutes < 1) {
            return '刚刚';
        }
        else if (diffMinutes < 60) {
            return `${diffMinutes}分钟前`;
        }
        else if (diffHours < 24) {
            return `${diffHours}小时前`;
        }
        else if (diffDays < 7) {
            return `${diffDays}天前`;
        }
        else {
            return date.toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric'
            });
        }
    }
}
class BugTreeItem extends vscode.TreeItem {
    constructor(bug, collapsibleState) {
        super(`${bug.description}`, collapsibleState);
        this.bug = bug;
        this.collapsibleState = collapsibleState;
        const severityIcon = this.getSeverityIcon(bug.severity);
        const statusIcon = this.getStatusIcon(bug.status);
        const timeAgo = this.getTimeAgo(bug.createdAt);
        this.tooltip = `文件: ${bug.isStandalone ? '独立记录' : path.basename(bug.file)}\n行: ${bug.isStandalone ? 'N/A' : bug.line + 1}\n严重程度: ${bug.severity}\n状态: ${bug.status}\n描述: ${bug.description}\n代码: ${bug.code || 'N/A'}\n解决方案: ${bug.solution || '待补充'}\n创建时间: ${this.formatDate(bug.createdAt)}\n更新时间: ${this.formatDate(bug.updatedAt)}`;
        this.description = bug.isStandalone
            ? `[独立记录] [${bug.severity}] [${bug.status}] ${timeAgo}`
            : `${path.basename(bug.file)}:${bug.line + 1} [${bug.severity}] [${bug.status}] ${timeAgo}`;
        this.contextValue = 'bug';
        this.iconPath = new vscode.ThemeIcon(severityIcon);
        this.command = {
            command: 'bugtracker.jumpToBug',
            title: '跳转到Bug位置',
            arguments: [bug]
        };
    }
    getSeverityIcon(severity) {
        switch (severity) {
            case 'critical': return 'error';
            case 'high': return 'warning';
            case 'medium': return 'info';
            case 'low': return 'circle-outline';
            default: return 'bug';
        }
    }
    getStatusIcon(status) {
        switch (status) {
            case 'open': return 'circle-outline';
            case 'in-progress': return 'sync';
            case 'resolved': return 'check';
            case 'closed': return 'pass';
            default: return 'bug';
        }
    }
    formatDate(date) {
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMinutes < 1) {
            return '刚刚';
        }
        else if (diffMinutes < 60) {
            return `${diffMinutes}分钟前`;
        }
        else if (diffHours < 24) {
            return `${diffHours}小时前`;
        }
        else if (diffDays < 7) {
            return `${diffDays}天前`;
        }
        else {
            return date.toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric'
            });
        }
    }
}
class BugTreeProvider {
    constructor(bugManager) {
        this.bugManager = bugManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        // 每分钟刷新一次时间显示
        this.refreshTimer = setInterval(() => {
            this.refresh();
        }, 60000); // 60秒
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    dispose() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            const bugs = this.bugManager.getBugs();
            console.log('获取Bug列表，总数:', bugs.length); // 调试信息
            if (bugs.length === 0) {
                // 返回一个提示项
                return Promise.resolve([]);
            }
            // 按创建时间倒序排列（最新的在前面）
            const sortedBugs = bugs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            return Promise.resolve(sortedBugs.map(bug => new BugTreeItem(bug, vscode.TreeItemCollapsibleState.None)));
        }
        return Promise.resolve([]);
    }
}
let bugManager;
let bugTreeProvider;
function activate(context) {
    try {
        console.log('Bug Tracker插件开始激活');
        vscode.window.showInformationMessage('Bug Tracker插件已激活！');
        bugManager = new BugManager(context);
        bugTreeProvider = new BugTreeProvider(bugManager);
        // 注册树视图
        const treeView = vscode.window.createTreeView('bugTrackerView', {
            treeDataProvider: bugTreeProvider,
            showCollapseAll: true
        });
        context.subscriptions.push(treeView);
        console.log('Bug Tracker插件激活完成');
    }
    catch (error) {
        console.error('插件激活失败:', error);
        vscode.window.showErrorMessage(`Bug Tracker插件激活失败: ${error}`);
    }
    // 测试命令
    const testCommand = vscode.commands.registerCommand('bugtracker.test', () => {
        vscode.window.showInformationMessage('Bug Tracker插件正在工作！');
        console.log('测试命令执行成功');
    });
    // 添加Bug命令
    const addBugCommand = vscode.commands.registerCommand('bugtracker.addBug', async () => {
        console.log('addBug命令被触发');
        vscode.window.showInformationMessage('addBug命令被触发');
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showWarningMessage('请先打开一个文件');
            return;
        }
        const position = activeEditor.selection.active;
        const file = activeEditor.document.uri.fsPath;
        console.log('当前文件:', file);
        console.log('当前位置:', position.line, position.character);
        // 获取Bug描述
        const description = await vscode.window.showInputBox({
            prompt: '请输入Bug描述',
            placeHolder: '例如: 空指针异常，需要添加null检查'
        });
        if (!description) {
            console.log('用户取消了输入');
            return;
        }
        console.log('用户输入的描述:', description);
        // 选择严重程度
        const severity = await vscode.window.showQuickPick([
            { label: '🔴 Critical', value: 'critical' },
            { label: '🟠 High', value: 'high' },
            { label: '🟡 Medium', value: 'medium' },
            { label: '🟢 Low', value: 'low' }
        ], {
            placeHolder: '选择Bug严重程度'
        });
        if (!severity) {
            console.log('用户取消了严重程度选择');
            return;
        }
        console.log('用户选择的严重程度:', severity.value);
        try {
            await bugManager.addBug(file, position.line, position.character, description, severity.value);
            // 询问是否添加解决方案
            const addSolution = await vscode.window.showQuickPick(['是', '否'], {
                placeHolder: '是否现在添加解决方案？'
            });
            if (addSolution === '是') {
                const solution = await vscode.window.showInputBox({
                    prompt: '请输入解决方案或备注',
                    placeHolder: '例如: 在第45行添加null检查...'
                });
                if (solution) {
                    const lastBug = bugManager.getBugs()[bugManager.getBugs().length - 1];
                    await bugManager.updateBugSolution(lastBug.id, solution);
                }
            }
            // 调试信息
            console.log('Bug已添加，当前总数:', bugManager.getBugs().length);
            console.log('所有Bug:', JSON.stringify(bugManager.getBugs(), null, 2));
            bugTreeProvider.refresh();
            vscode.window.showInformationMessage(`Bug记录已添加: ${description}`);
        }
        catch (error) {
            console.error('添加Bug时出错:', error);
            vscode.window.showErrorMessage(`添加Bug失败: ${error}`);
        }
    });
    // 添加独立Bug记录命令
    const addStandaloneBugCommand = vscode.commands.registerCommand('bugtracker.addStandaloneBug', async () => {
        console.log('添加独立Bug记录命令被触发');
        // 获取Bug描述
        const description = await vscode.window.showInputBox({
            prompt: '请输入Bug描述',
            placeHolder: '例如: 用户登录模块存在安全漏洞'
        });
        if (!description) {
            return;
        }
        // 选择严重程度
        const severity = await vscode.window.showQuickPick([
            { label: '🔴 Critical', value: 'critical' },
            { label: '🟠 High', value: 'high' },
            { label: '🟡 Medium', value: 'medium' },
            { label: '🟢 Low', value: 'low' }
        ], {
            placeHolder: '选择Bug严重程度'
        });
        if (!severity) {
            return;
        }
        // 获取解决方案（可选）
        const solution = await vscode.window.showInputBox({
            prompt: '请输入解决方案（可选）',
            placeHolder: '例如: 实施双因子认证，加强密码策略...'
        });
        try {
            await bugManager.addBug('', 0, 0, description, severity.value, solution, true);
            vscode.window.showInformationMessage(`独立Bug记录已添加: ${description}`);
        }
        catch (error) {
            console.error('添加独立Bug时出错:', error);
            vscode.window.showErrorMessage(`添加独立Bug失败: ${error}`);
        }
    });
    // 导出Bug报告命令
    const exportMarkdownCommand = vscode.commands.registerCommand('bugtracker.exportMarkdown', async () => {
        try {
            await bugManager.exportMarkdownReport();
            vscode.window.showInformationMessage('Bug报告已导出到 BUG_TRACKER.md');
            // 询问是否打开文件
            const openFile = await vscode.window.showQuickPick(['是', '否'], {
                placeHolder: '是否打开导出的Markdown文件？'
            });
            if (openFile === '是') {
                const markdownUri = bugManager.getMarkdownUri();
                const document = await vscode.workspace.openTextDocument(markdownUri);
                await vscode.window.showTextDocument(document);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`导出失败: ${error}`);
        }
    });
    // 从Markdown导入Bug记录命令
    const importMarkdownCommand = vscode.commands.registerCommand('bugtracker.importMarkdown', async () => {
        try {
            await bugManager.importFromMarkdown();
            vscode.window.showInformationMessage('已从 BUG_TRACKER.md 导入Bug记录');
        }
        catch (error) {
            vscode.window.showErrorMessage(`导入失败: ${error}`);
        }
    });
    // 更新Bug解决方案命令
    const updateSolutionCommand = vscode.commands.registerCommand('bugtracker.updateSolution', async (item) => {
        const currentSolution = item.bug.solution || '';
        const solution = await vscode.window.showInputBox({
            prompt: '请输入或更新解决方案',
            value: currentSolution,
            placeHolder: '例如: 在第45行添加null检查...'
        });
        if (solution !== undefined) {
            await bugManager.updateBugSolution(item.bug.id, solution);
            vscode.window.showInformationMessage('解决方案已更新');
        }
    });
    // 跳转到Bug位置命令
    const jumpToBugCommand = vscode.commands.registerCommand('bugtracker.jumpToBug', async (bug) => {
        if (bug.isStandalone || !bug.file) {
            vscode.window.showInformationMessage(`这是一个独立Bug记录: ${bug.description}`);
            return;
        }
        try {
            const document = await vscode.workspace.openTextDocument(bug.file);
            const editor = await vscode.window.showTextDocument(document);
            const position = new vscode.Position(bug.line, bug.column);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
        }
        catch (error) {
            vscode.window.showErrorMessage(`无法打开文件: ${bug.file}`);
        }
    });
    // 删除Bug命令
    const removeBugCommand = vscode.commands.registerCommand('bugtracker.removeBug', async (item) => {
        const result = await vscode.window.showWarningMessage(`确定要删除这个Bug记录吗？\n${item.bug.description}`, '删除', '取消');
        if (result === '删除') {
            await bugManager.removeBug(item.bug.id);
            vscode.window.showInformationMessage('Bug记录已删除');
        }
    });
    // 更新Bug状态命令
    const updateBugStatusCommand = vscode.commands.registerCommand('bugtracker.updateBugStatus', async (item) => {
        const status = await vscode.window.showQuickPick([
            { label: '🔴 Open', value: 'open' },
            { label: '🟡 In Progress', value: 'in-progress' },
            { label: '🟢 Resolved', value: 'resolved' },
            { label: '⚪ Closed', value: 'closed' }
        ], {
            placeHolder: '选择新的状态'
        });
        if (status) {
            await bugManager.updateBugStatus(item.bug.id, status.value);
            vscode.window.showInformationMessage(`Bug状态已更新为: ${status.label}`);
        }
    });
    // 显示Bug列表命令
    const showBugListCommand = vscode.commands.registerCommand('bugtracker.showBugList', () => {
        vscode.commands.executeCommand('bugTrackerView.focus');
    });
    // 监听活动编辑器变化，更新装饰器
    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(() => {
        bugManager.refreshDecorations();
    });
    context.subscriptions.push(testCommand, addBugCommand, addStandaloneBugCommand, exportMarkdownCommand, importMarkdownCommand, updateSolutionCommand, jumpToBugCommand, removeBugCommand, updateBugStatusCommand, showBugListCommand, onDidChangeActiveTextEditor, bugTreeProvider // 确保定时器在插件停用时被清理
    );
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map