import { describe, expect, it, vi } from "vitest";
import { MemoryStore } from "../db";
import { BoardRepository } from "../boardRepository";
import {
  createDefaultBoard,
  fromStoredBoard,
  toStoredBoard,
  type Board,
} from "../../types/board";

function makeRepo() {
  let t = 1000;
  const store = new MemoryStore();
  const onCorruptedRecord = vi.fn();
  const repo = new BoardRepository({ store, onCorruptedRecord, now: () => t++ });
  return { repo, store, onCorruptedRecord };
}

function boardWithContent(id: string, marker: string): Board {
  return {
    ...createDefaultBoard(`Board ${marker}`),
    id,
    elements: [{ id: `el-${marker}`, type: "rectangle", x: 1 }],
    files: { [`file-${marker}`]: { id: `file-${marker}` } },
  };
}

describe("BoardRepository", () => {
  it("creates a board with a title, timestamps, and a blank scene", async () => {
    const { repo } = makeRepo();
    const board = await repo.createBoard("My board");
    expect(board.id).toBeTruthy();
    expect(board.title).toBe("My board");
    expect(board.elements).toEqual([]);
    expect(board.files).toEqual({});
    expect(board.createdAt).toBeLessThanOrEqual(board.updatedAt);
  });

  it("renames a board and keeps its content", async () => {
    const { repo } = makeRepo();
    const board = await repo.createBoard("Old");
    await repo.saveBoard({ ...board, elements: [{ id: "e1", type: "ellipse" }] });
    const renamed = await repo.renameBoard(board.id, "New");
    expect(renamed?.title).toBe("New");
    expect(renamed?.elements).toEqual([{ id: "e1", type: "ellipse" }]);
    expect(await repo.renameBoard("missing", "X")).toBeNull();
  });

  it("ignores blank renames", async () => {
    const { repo } = makeRepo();
    const board = await repo.createBoard("Keep me");
    const renamed = await repo.renameBoard(board.id, "   ");
    expect(renamed?.title).toBe("Keep me");
  });

  it("deletes a board and returns null for missing boards", async () => {
    const { repo } = makeRepo();
    const board = await repo.createBoard("Gone");
    await repo.deleteBoard(board.id);
    expect(await repo.getBoard(board.id)).toBeNull();
    expect(await repo.getBoard("missing")).toBeNull();
  });

  it("saves and restores elements, files, and background", async () => {
    const { repo } = makeRepo();
    const board = await repo.createBoard("Scene");
    const next: Board = {
      ...board,
      elements: [{ id: "e1", type: "diamond" }],
      files: { f1: { id: "f1", dataURL: "data:image/png;base64,AAA" } },
      viewBackgroundColor: "#faeda7",
    };
    await repo.saveBoard(next);
    const restored = await repo.getBoard(board.id);
    expect(restored?.elements).toEqual(next.elements);
    expect(restored?.files).toEqual(next.files);
    expect(restored?.viewBackgroundColor).toBe("#faeda7");
  });

  it("lists boards most-recent-first", async () => {
    const { repo } = makeRepo();
    const a = await repo.createBoard("A");
    const b = await repo.createBoard("B");
    await repo.saveBoard(a); // touch A so it becomes most recent
    const list = await repo.listBoards();
    expect(list.map((x) => x.id)).toEqual([a.id, b.id]);
  });

  it("keeps two boards' content independent when switching", async () => {
    const { repo } = makeRepo();
    const a = await repo.createBoard("A");
    const b = await repo.createBoard("B");
    await repo.saveBoard({ ...a, elements: [{ id: "only-a", type: "text" }] });
    await repo.saveBoard({ ...b, elements: [{ id: "only-b", type: "arrow" }] });
    expect((await repo.getBoard(a.id))?.elements).toEqual([
      { id: "only-a", type: "text" },
    ]);
    expect((await repo.getBoard(b.id))?.elements).toEqual([
      { id: "only-b", type: "arrow" },
    ]);
  });

  it("quarantines corrupted records without losing healthy boards", async () => {
    const { repo, store, onCorruptedRecord } = makeRepo();
    const good = boardWithContent("good", "g");
    await store.put(good.id, toStoredBoard(good));
    await store.put("bad-1", { nope: true });
    await store.put("bad-2", {
      version: 2,
      id: "bad-2",
      title: "Bad",
      data: "not-json{{{",
      files: "{}",
      viewBackgroundColor: null,
      createdAt: 1,
      updatedAt: 2,
    });
    const list = await repo.listBoards();
    expect(list.map((b) => b.id)).toEqual(["good"]);
    expect(onCorruptedRecord).toHaveBeenCalledTimes(2);
    // Quarantined records are removed so they cannot break later reads.
    expect(await store.get("bad-1")).toBeUndefined();
    expect(await store.get("bad-2")).toBeUndefined();
  });

  it("repairs boards with malformed element entries", async () => {
    const { repo, store } = makeRepo();
    await store.put("wobbly", {
      version: 2,
      id: "wobbly",
      title: "Wobbly",
      data: JSON.stringify([{ id: "ok", type: "line" }, 42, null, { noId: true }]),
      files: "{}",
      viewBackgroundColor: null,
      createdAt: 1,
      updatedAt: 2,
    });
    const board = await repo.getBoard("wobbly");
    expect(board?.elements).toEqual([{ id: "ok", type: "line" }]);
  });

  it("reads v1 envelopes that stored the title as `name`", async () => {
    const { repo, store } = makeRepo();
    await store.put("v1", {
      version: 1,
      id: "v1",
      name: "Legacy title",
      data: JSON.stringify([{ id: "e", type: "rectangle" }]),
      createdAt: 1,
      updatedAt: 2,
    });
    const board = await repo.getBoard("v1");
    expect(board?.title).toBe("Legacy title");
    expect(board?.files).toEqual({});
    expect(board?.viewBackgroundColor).toBeNull();
  });

  it("round-trips serialization without loss", () => {
    const board = boardWithContent("rt", "r");
    const { board: parsed, corrupted } = fromStoredBoard(toStoredBoard(board));
    expect(corrupted).toBe(false);
    expect(parsed).toEqual(board);
  });

  it("creates a default board when the store is empty", async () => {
    const { repo } = makeRepo();
    const first = await repo.ensureDefaultBoard();
    expect(first.title).toBe("Untitled board");
    const again = await repo.ensureDefaultBoard();
    expect(again.id).toBe(first.id);
  });

  it("seeds only one default board under concurrent first-run calls", async () => {
    const { repo } = makeRepo();
    const [a, b] = await Promise.all([repo.ensureDefaultBoard(), repo.ensureDefaultBoard()]);
    expect(a.id).toBe(b.id);
    expect(await repo.listBoards()).toHaveLength(1);
  });
});
