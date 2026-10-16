import { describe, expect, it } from "vitest";
import {
  buildSceneFileText,
  parseSceneFileText,
  SceneFileError,
  slugify,
} from "../export";

describe("scene file helpers", () => {
  it("round-trips elements and files through the Excalidraw file shape", () => {
    const elements = [{ id: "e1", type: "rectangle", x: 10 }];
    const files = { f1: { id: "f1", dataURL: "data:image/png;base64,AAA" } };
    const text = buildSceneFileText(elements, files);
    const parsed = JSON.parse(text);
    expect(parsed.type).toBe("excalidraw");
    expect(parsed.version).toBe(2);
    expect(parseSceneFileText(text)).toEqual({ elements, files });
  });

  it("defaults missing files to an empty record", () => {
    const parsed = parseSceneFileText(JSON.stringify({ type: "excalidraw", elements: [] }));
    expect(parsed).toEqual({ elements: [], files: {} });
  });

  it("drops non-object element entries instead of failing", () => {
    const parsed = parseSceneFileText(
      JSON.stringify({ elements: [{ id: "ok", type: "line" }, 7, "nope", null] }),
    );
    expect(parsed.elements).toEqual([{ id: "ok", type: "line" }]);
  });

  it("rejects invalid scene files with a clear error", () => {
    expect(() => parseSceneFileText("{{{")).toThrow(SceneFileError);
    expect(() => parseSceneFileText("[1,2]")).toThrow(SceneFileError);
    expect(() =>
      parseSceneFileText(JSON.stringify({ type: "something-else", elements: [] })),
    ).toThrow(SceneFileError);
    expect(() => parseSceneFileText(JSON.stringify({ type: "excalidraw" }))).toThrow(
      SceneFileError,
    );
  });
});

describe("slugify", () => {
  it("builds safe download basenames", () => {
    expect(slugify("My Board #1!")).toBe("my-board-1");
    expect(slugify("  ")).toBe("board");
    expect(slugify("Ünïcodé tïtle")).toBe("n-cod-t-tle");
  });
});
