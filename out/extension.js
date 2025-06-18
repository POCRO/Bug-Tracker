"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
class BugManager {
    constructor(context) {
        this.bugs = [];
        this.storageUri = vscode.Uri.joinPath(context.globalStorageUri, 'bugs.json');
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
    async addBug(file, line, column, description, severity) {
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
            code: await this.getLineCode(file, line)
        };
        this.bugs.push(bug);
        await this.saveBugs();
        this.updateDecorations();
        bugTreeProvider.refresh();
    }
    async removeBug(bugId) {
        this.bugs = this.bugs.filter(bug => bug.id !== bugId);
        await this.saveBugs();
        this.updateDecorations();
        bugTreeProvider.refresh();
    }
    async updateBugStatus(bugId, status) {
        const bug = this.bugs.find(b => b.id === bugId);
        if (bug) {
            bug.status = status;
            bug.updatedAt = new Date();
            await this.saveBugs();
            bugTreeProvider.refresh();
        }
    }
    getBugs() {
        return this.bugs;
    }
    getBugsForFile(file) {
        return this.bugs.filter(bug => bug.file === file);
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
        const decorations = fileBugs.map(bug => ({
            range: new vscode.Range(bug.line, bug.column, bug.line, bug.column + 1),
            hoverMessage: `🐛 ${bug.description}\n严重程度: ${bug.severity}\n状态: ${bug.status}`
        }));
        activeEditor.setDecorations(this.decorationType, decorations);
    }
    refreshDecorations() {
        this.updateDecorations();
    }
}
class BugTreeItem extends vscode.TreeItem {
    constructor(bug, collapsibleState) {
        super(`${bug.description}`, collapsibleState);
        this.bug = bug;
        this.collapsibleState = collapsibleState;
        const severityIcon = this.getSeverityIcon(bug.severity);
        const statusIcon = this.getStatusIcon(bug.status);
        this.tooltip = `文件: ${path.basename(bug.file)}\n行: ${bug.line + 1}\n严重程度: ${bug.severity}\n状态: ${bug.status}\n描述: ${bug.description}\n代码: ${bug.code}`;
        this.description = `${path.basename(bug.file)}:${bug.line + 1} [${bug.severity}] [${bug.status}]`;
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
}
class BugTreeProvider {
    constructor(bugManager) {
        this.bugManager = bugManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
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
            return Promise.resolve(bugs.map(bug => new BugTreeItem(bug, vscode.TreeItemCollapsibleState.None)));
        }
        return Promise.resolve([]);
    }
}
let bugManager;
let bugTreeProvider;
function activate(context) {
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
    // 跳转到Bug位置命令
    const jumpToBugCommand = vscode.commands.registerCommand('bugtracker.jumpToBug', async (bug) => {
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
    context.subscriptions.push(addBugCommand, jumpToBugCommand, removeBugCommand, updateBugStatusCommand, showBugListCommand, onDidChangeActiveTextEditor);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map