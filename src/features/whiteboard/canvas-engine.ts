import {
  ActiveSelection, Canvas, Circle, Ellipse, FabricImage, Group, IText, Line, PencilBrush, Point, Rect, Textbox, Triangle,
  util, type FabricObject, type TMat2D, type TPointerEventInfo,
} from "fabric";
import { History } from "./history";
import type { Tool } from "./whiteboard-store";

type Obj = FabricObject & { id?: string; connector?: { from: string; to: string }; isNote?: boolean };
export interface Style { stroke: string; fill: string; strokeWidth: number; fontSize: number }
export interface EngineEvents {
  onChange(): void;
  onSelection(count: number): void;
  onHistory(canUndo: boolean, canRedo: boolean): void;
  onZoom(zoom: number): void;
  onTool(tool: Tool): void;
}
const PROPS = ["id", "connector", "isNote"];
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
export type Arrange = "forward" | "backward" | "front" | "back";

const center = (o: FabricObject) => { const m = o.calcTransformMatrix(); return new Point(m[4], m[5]); };

/** Wraps a Fabric canvas: tools, viewport, clipboard, history and (de)serialization. UI-framework agnostic. */
export class WhiteboardEngine {
  readonly canvas: Canvas;
  private tool: Tool = "select";
  private history = new History<string>();
  private restoring = false;
  private recordQueued = false;
  private disposed = false;
  private drawing: Obj | null = null;
  private origin = new Point(0, 0);
  private connectorStart?: Obj;
  private panning = false;
  private space = false;
  private erasing = false;
  private last = new Point(0, 0);
  private clipboard: Obj[] = [];

  constructor(el: HTMLCanvasElement, private ev: EngineEvents, private style: Style, private readOnly = false) {
    this.canvas = new Canvas(el, { preserveObjectStacking: true, fireRightClick: false, stopContextMenu: true });
    const c = this.canvas;
    c.on("mouse:down", (o) => this.down(o));
    c.on("mouse:move", (o) => this.move(o));
    c.on("mouse:up", (o) => void this.up(o));
    c.on("mouse:wheel", (o) => this.wheel(o));
    c.on("object:added", ({ target }) => { this.prepare(target as Obj); this.record(); });
    c.on("object:modified", () => this.record());
    c.on("object:removed", () => this.record());
    c.on("text:editing:exited", () => this.record());
    for (const e of ["object:moving", "object:scaling", "object:rotating"] as const) c.on(e, () => this.updateConnectors());
    for (const e of ["selection:created", "selection:updated", "selection:cleared"] as const)
      c.on(e, () => this.ev.onSelection(c.getActiveObjects().length));
    this.setTool("select");
  }

  // ---------- lifecycle & persistence ----------
  async load(json: string | null) {
    if (json) {
      this.restoring = true;
      await this.canvas.loadFromJSON(json);
      this.restoring = false;
    }
    if (this.disposed) return;
    this.applyInteractivity();
    this.canvas.requestRenderAll();
    this.history.reset(this.serialize());
    this.pushHistory();
  }
  serialize() { return JSON.stringify(this.canvas.toObject(PROPS)); }
  async dispose() { this.disposed = true; await this.canvas.dispose(); }
  resize(width: number, height: number) { this.canvas.setDimensions({ width, height }); }
  setReadOnly(ro: boolean) { this.readOnly = ro; this.setTool("select"); }

  // ---------- tools & style ----------
  setTool(tool: Tool) {
    this.tool = this.readOnly ? "select" : tool;
    const c = this.canvas;
    c.discardActiveObject();
    c.isDrawingMode = this.tool === "pen";
    if (this.tool === "pen") this.syncBrush();
    this.applyInteractivity();
    c.defaultCursor = this.tool === "hand" ? "grab" : this.tool === "select" ? "default" : "crosshair";
    c.requestRenderAll();
  }
  setStyle(patch: Partial<Style>) {
    this.style = { ...this.style, ...patch };
    if (this.tool === "pen") this.syncBrush();
    const targets = this.canvas.getActiveObjects() as Obj[];
    if (!targets.length) return;
    targets.forEach((o) => this.styleObject(o, patch));
    this.canvas.requestRenderAll();
    this.record();
  }
  private syncBrush() {
    const b = new PencilBrush(this.canvas);
    b.color = this.style.stroke;
    b.width = this.style.strokeWidth;
    this.canvas.freeDrawingBrush = b;
  }
  private styleObject(o: Obj, p: Partial<Style>) {
    if (o instanceof Group) { o.getObjects().forEach((x) => this.styleObject(x as Obj, p)); return; }
    if (o instanceof IText) {
      if (p.stroke) o.set("fill", p.stroke);
      if (p.fontSize) o.set("fontSize", p.fontSize);
      if (p.fill && (o as IText & Obj).isNote) o.set("backgroundColor", p.fill);
    } else if (o instanceof Line) {
      if (p.stroke) o.set("stroke", p.stroke);
      if (p.strokeWidth) o.set("strokeWidth", p.strokeWidth);
    } else if (o instanceof Triangle) {
      if (p.stroke) o.set("fill", p.stroke);
    } else {
      if (p.stroke) o.set("stroke", p.stroke);
      if (p.strokeWidth) o.set("strokeWidth", p.strokeWidth);
      if (p.fill) o.set("fill", p.fill);
    }
    o.dirty = true;
  }
  private get interactive() { return this.tool === "select" && !this.readOnly; }
  private get pickable() { return this.interactive || this.tool === "eraser" || this.tool === "connector"; }
  private applyInteractivity() {
    this.canvas.skipTargetFind = !this.pickable;
    this.canvas.selection = this.interactive;
    this.canvas.forEachObject((o) => this.prepare(o as Obj));
  }
  private prepare(o: Obj) {
    o.id ??= crypto.randomUUID();
    if (o === this.drawing) return;
    o.selectable = this.interactive;
    o.evented = this.pickable;
  }

  get currentTool() { return this.tool; }
  /** Switches back to select after a one-shot tool without discarding the new object (keeps text editing alive). */
  private autoSelect() {
    this.tool = "select";
    this.canvas.isDrawingMode = false;
    this.applyInteractivity();
    this.canvas.defaultCursor = "default";
    this.ev.onTool("select");
  }

  // ---------- pointer handling ----------
  private down(opt: TPointerEventInfo) {
    const e = opt.e as MouseEvent;
    const p = opt.scenePoint;
    if (this.tool === "hand" || this.space || e.button === 1) {
      this.panning = true;
      this.last = new Point(e.clientX, e.clientY);
      this.canvas.setCursor("grabbing");
      return;
    }
    if (this.readOnly) return;
    const s = this.style;
    switch (this.tool) {
      case "eraser":
        this.erasing = true;
        if (opt.target) this.canvas.remove(opt.target);
        return;
      case "text":
      case "note": {
        const note = this.tool === "note";
        const t: Obj = note
          ? new Textbox("Note", { left: p.x, top: p.y, width: 180, fontSize: 16, fill: "#1f2937", backgroundColor: "#fde68a", padding: 12 })
          : new IText("Text", { left: p.x, top: p.y, fontSize: s.fontSize, fill: s.stroke });
        t.isNote = note;
        this.canvas.add(t);
        this.canvas.setActiveObject(t);
        (t as IText).enterEditing();
        (t as IText).selectAll();
        this.autoSelect();
        return;
      }
      case "connector":
        if (!opt.target) return;
        this.connectorStart = opt.target as Obj;
        this.begin(new Line([p.x, p.y, p.x, p.y], { stroke: s.stroke, strokeWidth: s.strokeWidth, strokeLineCap: "round" }), p);
        return;
      case "line":
      case "arrow":
        this.begin(new Line([p.x, p.y, p.x, p.y], { stroke: s.stroke, strokeWidth: s.strokeWidth, strokeLineCap: "round" }), p);
        return;
      case "rect":
        return this.begin(new Rect({ left: p.x, top: p.y, width: 0, height: 0, fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth, rx: 4, ry: 4 }), p);
      case "circle":
        return this.begin(new Circle({ left: p.x, top: p.y, radius: 0, fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth }), p);
      case "ellipse":
        return this.begin(new Ellipse({ left: p.x, top: p.y, rx: 0, ry: 0, fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth }), p);
    }
  }
  private begin(o: Obj, p: Point) {
    this.drawing = o;
    this.origin = p;
    this.canvas.add(o);
    o.selectable = false;
    o.evented = false;
  }
  private move(opt: TPointerEventInfo) {
    const e = opt.e as MouseEvent;
    if (this.panning) {
      this.canvas.relativePan(new Point(e.clientX - this.last.x, e.clientY - this.last.y));
      this.last = new Point(e.clientX, e.clientY);
      return;
    }
    if (this.erasing) {
      const t = this.canvas.findTarget(opt.e);
      if (t) this.canvas.remove(t);
      return;
    }
    const d = this.drawing;
    if (!d) return;
    const p = opt.scenePoint;
    const o = this.origin;
    const w = Math.abs(p.x - o.x);
    const h = Math.abs(p.y - o.y);
    const left = Math.min(p.x, o.x);
    const top = Math.min(p.y, o.y);
    if (d instanceof Line) d.set({ x2: p.x, y2: p.y });
    else if (d instanceof Circle) d.set({ left, top, radius: Math.max(w, h) / 2 });
    else if (d instanceof Ellipse) d.set({ left, top, rx: w / 2, ry: h / 2 });
    else d.set({ left, top, width: w, height: h });
    d.setCoords();
    this.canvas.requestRenderAll();
  }
  private async up(opt: TPointerEventInfo) {
    this.panning = false;
    this.erasing = false;
    this.canvas.setCursor(this.tool === "hand" ? "grab" : this.canvas.defaultCursor);
    const d = this.drawing;
    if (!d) return;
    this.drawing = null;
    const tool = this.tool;
    const size = d instanceof Line ? Math.hypot(d.x2 - d.x1, d.y2 - d.y1) : Math.max(d.getScaledWidth(), d.getScaledHeight());
    if (size < 4) { this.canvas.remove(d); return; }
    if (tool === "connector") {
      const end = this.canvas.findTarget(opt.e) as Obj | undefined;
      const start = this.connectorStart;
      this.connectorStart = undefined;
      if (!end || !start || end === d || end === start || !start.id || !end.id) { this.canvas.remove(d); return; }
      (d as Obj).connector = { from: start.id, to: end.id };
      this.updateConnectors();
    } else if (tool === "arrow" && d instanceof Line) {
      this.canvas.remove(d);
      const head = new Triangle({
        width: 10 + this.style.strokeWidth * 2, height: 10 + this.style.strokeWidth * 2, fill: this.style.stroke,
        left: d.x2, top: d.y2, originX: "center", originY: "center",
        angle: (Math.atan2(d.y2 - d.y1, d.x2 - d.x1) * 180) / Math.PI + 90,
      });
      this.canvas.add(new Group([d, head]));
    }
    this.applyInteractivity();
    this.canvas.requestRenderAll();
    this.record();
    this.autoSelect();
  }
  private wheel(opt: TPointerEventInfo<WheelEvent>) {
    const e = opt.e;
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) this.zoomTo(this.canvas.getZoom() * 0.999 ** e.deltaY, new Point(e.offsetX, e.offsetY));
    else this.canvas.relativePan(new Point(-e.deltaX, -e.deltaY));
  }
  setSpace(down: boolean) {
    this.space = down;
    if (this.tool === "select") this.canvas.selection = !down && this.interactive;
    this.canvas.setCursor(down ? "grab" : this.canvas.defaultCursor);
  }

  // ---------- viewport ----------
  zoomTo(z: number, at?: Point) {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    this.canvas.zoomToPoint(at ?? new Point(this.canvas.getWidth() / 2, this.canvas.getHeight() / 2), zoom);
    this.ev.onZoom(zoom);
  }
  zoomBy(factor: number) { this.zoomTo(this.canvas.getZoom() * factor); }
  resetView() { this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); this.ev.onZoom(1); this.canvas.requestRenderAll(); }

  // ---------- history ----------
  private record() {
    if (this.restoring || this.drawing || this.recordQueued || this.disposed) return;
    this.recordQueued = true;
    queueMicrotask(() => {
      this.recordQueued = false;
      if (this.disposed || this.restoring) return;
      this.history.push(this.serialize());
      this.pushHistory();
      this.ev.onChange();
    });
  }
  private pushHistory() { this.ev.onHistory(this.history.canUndo, this.history.canRedo); }
  async undo() { const s = this.history.undo(); if (s) await this.restore(s); }
  async redo() { const s = this.history.redo(); if (s) await this.restore(s); }
  private async restore(json: string) {
    this.restoring = true;
    const vpt = [...this.canvas.viewportTransform] as TMat2D;
    await this.canvas.loadFromJSON(json);
    this.canvas.setViewportTransform(vpt);
    this.restoring = false;
    this.applyInteractivity();
    this.canvas.requestRenderAll();
    this.pushHistory();
    this.ev.onSelection(0);
    this.ev.onChange();
  }

  // ---------- object commands ----------
  private updateConnectors() {
    const byId = new Map(this.canvas.getObjects().map((o) => [(o as Obj).id, o]));
    for (const obj of this.canvas.getObjects()) {
      const o = obj as Line & Obj;
      if (!(obj instanceof Line) || !o.connector) continue;
      const a = byId.get(o.connector.from);
      const b = byId.get(o.connector.to);
      if (!a || !b) continue;
      const p = center(a);
      const q = center(b);
      o.set({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
      o.setCoords();
    }
  }
  deleteSelected() {
    const objs = this.canvas.getActiveObjects() as Obj[];
    if (!objs.length) return;
    const ids = new Set(objs.map((o) => o.id));
    this.canvas.discardActiveObject();
    objs.forEach((o) => this.canvas.remove(o));
    (this.canvas.getObjects() as Obj[]).filter((o) => o.connector && (ids.has(o.connector.from) || ids.has(o.connector.to)))
      .forEach((o) => this.canvas.remove(o));
    this.ev.onSelection(0);
  }
  async copy() {
    const objs = this.canvas.getActiveObjects() as Obj[];
    if (!objs.length) return;
    this.canvas.discardActiveObject(); // objects report absolute positions only outside a selection
    this.clipboard = (await Promise.all(objs.map((o) => o.clone(PROPS)))) as Obj[];
    this.canvas.setActiveObject(objs.length > 1 ? new ActiveSelection(objs, { canvas: this.canvas }) : (objs[0] as FabricObject));
  }
  async paste() {
    if (!this.clipboard.length) return;
    const clones = (await Promise.all(this.clipboard.map((o) => o.clone(PROPS)))) as Obj[];
    this.canvas.discardActiveObject();
    clones.forEach((c) => {
      c.set({ left: (c.left ?? 0) + 16, top: (c.top ?? 0) + 16 });
      c.id = crypto.randomUUID();
      c.connector = undefined;
      this.canvas.add(c);
    });
    this.clipboard = clones;
    this.canvas.setActiveObject(clones.length > 1 ? new ActiveSelection(clones, { canvas: this.canvas }) : (clones[0] as FabricObject));
    this.canvas.requestRenderAll();
  }
  async duplicate() { await this.copy(); await this.paste(); }
  group() {
    const a = this.canvas.getActiveObject();
    if (!(a instanceof ActiveSelection)) return;
    const objs = this.canvas.getActiveObjects();
    this.canvas.discardActiveObject();
    objs.forEach((o) => this.canvas.remove(o));
    const g = new Group(objs);
    this.canvas.add(g);
    this.canvas.setActiveObject(g);
    this.finish();
  }
  ungroup() {
    const a = this.canvas.getActiveObject();
    if (!(a instanceof Group) || a instanceof ActiveSelection) return;
    this.canvas.discardActiveObject();
    const items = a.removeAll(); // leaving a group applies the group's transform to each item
    this.canvas.remove(a);
    items.forEach((o) => this.canvas.add(o));
    this.canvas.setActiveObject(new ActiveSelection(items, { canvas: this.canvas }));
    this.finish();
  }
  arrange(op: Arrange) {
    const c = this.canvas;
    for (const o of c.getActiveObjects()) {
      if (op === "forward") c.bringObjectForward(o);
      else if (op === "backward") c.sendObjectBackwards(o);
      else if (op === "front") c.bringObjectToFront(o);
      else c.sendObjectToBack(o);
    }
    this.finish();
  }
  async insertImage(dataUrl: string) {
    const img = await FabricImage.fromURL(dataUrl);
    if (img.width > 400) img.scaleToWidth(400);
    const at = util.transformPoint(new Point(this.canvas.getWidth() / 2, this.canvas.getHeight() / 2), util.invertTransform(this.canvas.viewportTransform));
    img.set({ left: at.x - img.getScaledWidth() / 2, top: at.y - img.getScaledHeight() / 2 });
    this.canvas.add(img);
    this.canvas.setActiveObject(img);
  }
  private finish() { this.canvas.requestRenderAll(); this.record(); this.ev.onSelection(this.canvas.getActiveObjects().length); }
  get editingText() { return !!(this.canvas.getActiveObject() as IText | undefined)?.isEditing; }
}
