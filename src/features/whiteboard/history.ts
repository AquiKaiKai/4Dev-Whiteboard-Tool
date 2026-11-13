/** Snapshot-based undo/redo stack. Pure logic so it can be tested without a canvas. */
export class History<T> {
  private stack: T[] = [];
  private index = -1;
  constructor(private limit = 100) {}

  reset(state: T) {
    this.stack = [state];
    this.index = 0;
  }
  push(state: T) {
    if (this.stack[this.index] === state) return;
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(state);
    if (this.stack.length > this.limit) this.stack.shift();
    this.index = this.stack.length - 1;
  }
  get canUndo() { return this.index > 0; }
  get canRedo() { return this.index < this.stack.length - 1; }
  undo(): T | undefined {
    if (!this.canUndo) return undefined;
    this.index -= 1;
    return this.stack[this.index];
  }
  redo(): T | undefined {
    if (!this.canRedo) return undefined;
    this.index += 1;
    return this.stack[this.index];
  }
}
