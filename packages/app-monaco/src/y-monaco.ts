import type { Text, Doc, YTextEvent } from "yjs";
import { createRelativePositionFromTypeIndex, applyUpdate } from "yjs";
import { Selection } from "monaco-editor";
import type { editor } from "monaco-editor";
import { createMutex } from "lib0/mutex.js";
import { fromUint8Array, toUint8Array } from "js-base64";
import type { AppContext, ReadonlyTeleBox } from "@netless/window-manager";
import type { DisplayerState, Event as WhiteEvent } from "white-web-sdk";
import { SideEffectManager } from "../../app-shared/dist/SideEffectManager";
import type { NetlessAppMonacoAttributes } from "./typings";
import { Decoration } from "./Decorations";

export class YMonaco {
  public monacoModel: editor.ITextModel;
  public authorId: string;

  public constructor(
    public context: AppContext<NetlessAppMonacoAttributes>,
    public attrs: NetlessAppMonacoAttributes,
    public box: ReadonlyTeleBox,
    public monacoEditor: editor.IStandaloneCodeEditor,
    public doc: Doc,
    public yText: Text
  ) {
    const monacoModel = monacoEditor.getModel();
    this.authorId = String(this.context.getDisplayer().observerId);

    if (!monacoModel) {
      throw new Error("[NetlessAppMonaco] No Monaco Model");
    }

    this.monacoModel = monacoModel;

    this.sideEffect = new SideEffectManager();

    this.observerId = String(context.getDisplayer().observerId);

    this.broadcastCursors();
    this.broadcastSelections();

    this.setupAttrsUpdate();
    this.setupDocUpdate();
    this.setupYText();
    this.setupMembers();
  }

  public destroy(): void {
    this.sideEffect.flush();
    this.decorations.forEach(decoration => decoration.destroy());
    this.decorations.clear();
    this.context.updateAttributes(["cursors", this.observerId], undefined);
    this.context.updateAttributes(["selections", this.observerId], undefined);
  }

  private setupYText(): void {
    this.sideEffect.add(() => {
      const yTextObserver = (event: YTextEvent) => {
        this.mux(() => {
          let index = 0;
          event.delta.forEach(op => {
            if (op.retain != null) {
              index += op.retain;
            } else if (op.insert != null) {
              const pos = this.monacoModel.getPositionAt(index);
              const range = new Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
              this.monacoModel.applyEdits([
                { range, text: String(op.insert), forceMoveMarkers: true },
              ]);
              index += op.insert.length;
            } else if (op.delete != null) {
              const pos = this.monacoModel.getPositionAt(index);
              const endPos = this.monacoModel.getPositionAt(index + op.delete);
              const range = new Selection(
                pos.lineNumber,
                pos.column,
                endPos.lineNumber,
                endPos.column
              );
              this.monacoModel.applyEdits([{ range, text: "" }]);
            } else {
              console.error("Unexpected yText Observer");
            }
          });
        });
      };
      this.yText.observe(yTextObserver);
      return () => this.yText.unobserve(yTextObserver);
    });

    this.monacoModel.setValue(this.yText.toString());

    this.sideEffect.add(() => {
      const disposer = this.monacoModel.onDidChangeContent(event => {
        // apply changes from right to left
        this.mux(() => {
          this.doc.transact(() => {
            event.changes
              .sort((change1, change2) => change2.rangeOffset - change1.rangeOffset)
              .forEach(change => {
                this.yText.delete(change.rangeOffset, change.rangeLength);
                this.yText.insert(change.rangeOffset, change.text);
              });
          }, this);
        });
      });
      return () => disposer.dispose();
    });
  }

  private setupDocUpdate(): void {
    //   this.sideEffect.add(() => {
    //     const displayer = this.context.getDisplayer();
    //     const handleUpdate = (event: WhiteEvent) => {
    //       if (event.authorId !== displayer.observerId) {
    //         this.decorations.get(String(event.authorId))?.rerender();
    //       }
    //     };
    //     displayer.addMagixEventListener("AppMonacoDoc", handleUpdate);
    //     return () => displayer.removeMagixEventListener("AppMonacoDoc", handleUpdate);
    //   });
    const displayer = this.context.getDisplayer();

    this.sideEffect.add(() => {
      const handleUpdate = (event: WhiteEvent) => {
        this.authorId = String(event.authorId);
        if (event.authorId !== displayer.observerId) {
          try {
            applyUpdate(this.doc, toUint8Array(event.payload), "_remote_edit_");
          } catch (e) {
            console.warn(e);
          }
        }
      };
      displayer.addMagixEventListener("AppMonacoDoc", handleUpdate);
      return () => displayer.removeMagixEventListener("AppMonacoDoc", handleUpdate);
    });

    this.sideEffect.add(() => {
      const handleUpdate = (update: Uint8Array, origin: unknown) => {
        if (origin !== "_remote_edit_" && this.context.getIsWritable()) {
          const room = this.context.getRoom();
          if (room) {
            this.authorId = String(displayer.observerId);
            room.dispatchMagixEvent("AppMonacoDoc", fromUint8Array(update));
          }
        }
      };
      this.doc.on("update", handleUpdate);
      return () => this.doc.off("update", handleUpdate);
    });
  }

  private broadcastCursors(): void {
    this.sideEffect.add(() => {
      const disposable = this.monacoEditor.onDidChangeCursorPosition(event => {
        try {
          const rawCursorStrList = [event.position, ...event.secondaryPositions].map(position =>
            JSON.stringify(
              createRelativePositionFromTypeIndex(
                this.yText,
                this.monacoModel.getOffsetAt(position)
              )
            )
          );
          this.context.updateAttributes(["cursors", this.observerId], rawCursorStrList);
        } catch (e) {
          console.warn(e);
        }
      });
      return () => disposable.dispose();
    });
  }

  private broadcastSelections(): void {
    this.sideEffect.add(() => {
      const disposable = this.monacoEditor.onDidChangeCursorSelection(() => {
        const selections = this.monacoEditor.getSelections();
        if (selections) {
          try {
            const rawSelectionsStr = JSON.stringify(
              selections
                .filter(selection => !Selection.isEmpty(selection))
                .map(selection => ({
                  start: createRelativePositionFromTypeIndex(
                    this.yText,
                    this.monacoModel.getOffsetAt(selection.getStartPosition())
                  ),
                  end: createRelativePositionFromTypeIndex(
                    this.yText,
                    this.monacoModel.getOffsetAt(selection.getEndPosition())
                  ),
                }))
            );
            this.context.updateAttributes(["selections", this.observerId], rawSelectionsStr);
          } catch (e) {
            console.warn(e);
          }
        }
      });
      return () => disposable.dispose();
    });
  }

  private setupAttrsUpdate(): void {
    this.sideEffect.add(() => {
      const handleAttrsUpdate = () => {
        this.context.getDisplayer().state.roomMembers.forEach(member => {
          const id = String(member.memberId);
          if (id !== this.observerId) {
            let decoration = this.decorations.get(id);
            if (!decoration) {
              decoration = new Decoration(
                this.doc,
                this.monacoEditor,
                this.monacoModel,
                id,
                member.payload?.cursorName || id
              );
              this.decorations.set(id, decoration);
            }
            decoration.setCursor(this.attrs.cursors?.[id]);
            decoration.setSelection(this.attrs.selections?.[id]);
            this.renderDecorations();
          }
        });
      };
      this.context.emitter.on("attributesUpdate", handleAttrsUpdate);
      return () => this.context.emitter.off("attributesUpdate", handleAttrsUpdate);
    });
  }

  private setupMembers(): void {
    this.sideEffect.add(() => {
      const handleStateChanged = (state: Partial<DisplayerState>) => {
        if (state.roomMembers) {
          const members = new Set(state.roomMembers.map(member => String(member.memberId)));
          this.decorations.forEach((decoration, memberId) => {
            if (!members.has(memberId)) {
              decoration.destroy();
              this.decorations.delete(memberId);
            }
          });
          if (this.attrs.cursors) {
            Object.keys(this.attrs.cursors).forEach(memberId => {
              if (!members.has(memberId)) {
                this.context.updateAttributes(["cursors", memberId], undefined);
              }
            });
          }
          if (this.attrs.selections) {
            Object.keys(this.attrs.selections).forEach(memberId => {
              if (!members.has(memberId)) {
                this.context.updateAttributes(["selections", memberId], undefined);
              }
            });
          }
        }
      };
      this.context.emitter.on("roomStateChange", handleStateChanged);
      return () => this.context.emitter.off("roomStateChange", handleStateChanged);
    });
  }

  private renderDecorations(): void {
    const deltaDecorations: editor.IModelDeltaDecoration[] = [];
    this.decorations.forEach(decoration => {
      deltaDecorations.push(...decoration.rerender(this.authorId));
    });
    this.deltaDecorations = this.monacoModel.deltaDecorations(
      this.deltaDecorations,
      deltaDecorations
    );
  }

  private sideEffect: SideEffectManager;

  private observerId: string;

  private decorations = new Map<string, Decoration>();

  private mux = createMutex();

  private deltaDecorations: string[] = [];
}
