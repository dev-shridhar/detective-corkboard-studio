/**
 * history.js — Undo/Redo command stack (Command Pattern).
 * Every user action (add tile, move tile, delete, connect string) is a
 * Command object with do() and undo() methods. This module manages the stack.
 *
 * Phase 7 will wire all board mutations to command objects.
 */

class Command {
    async execute() { throw new Error('Command.execute() not implemented'); }
    async undo() { throw new Error('Command.undo() not implemented'); }
}

class HistoryManager {
    constructor(maxSize = 100) {
        this._undoStack = [];
        this._redoStack = [];
        this._maxSize = maxSize;
        this._bindKeyboard();
    }

    async execute(command) {
        await command.execute();
        this._undoStack.push(command);
        if (this._undoStack.length > this._maxSize) {
            this._undoStack.shift(); // Drop oldest if over limit
        }
        this._redoStack = []; // Any new action clears the redo stack
    }

    async undo() {
        const command = this._undoStack.pop();
        if (!command) return;
        await command.undo();
        this._redoStack.push(command);
    }

    async redo() {
        const command = this._redoStack.pop();
        if (!command) return;
        await command.execute();
        this._undoStack.push(command);
    }

    clear() {
        this._undoStack = [];
        this._redoStack = [];
    }

    _bindKeyboard() {
        document.addEventListener('keydown', async (e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (ctrl && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                await this.undo();
            }
            if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                await this.redo();
            }
        });
    }
}

window.history_manager = new HistoryManager();
