import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { useTvRemoteNavigation } from "./useTvRemoteNavigation";

function TestComponent() {
  useTvRemoteNavigation();
  return null;
}

const renderHook = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(<TestComponent />);
  });
  return () => {
    act(() => root.unmount());
    container.remove();
  };
};

const setRect = (element: HTMLElement, rect: Partial<DOMRect>) => {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: rect.left ?? 0,
    y: rect.top ?? 0,
    left: rect.left ?? 0,
    top: rect.top ?? 0,
    right: (rect.left ?? 0) + (rect.width ?? 40),
    bottom: (rect.top ?? 0) + (rect.height ?? 40),
    width: rect.width ?? 40,
    height: rect.height ?? 40,
    toJSON: () => ({}),
  } as DOMRect);
};

describe("useTvRemoteNavigation", () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("tv-remote-mode");
    vi.restoreAllMocks();
  });

  it("moves focus spatially with direction keys", () => {
    document.body.innerHTML = `
      <button id="left">Left</button>
      <button id="right">Right</button>
      <button id="down">Down</button>
    `;
    const left = document.getElementById("left") as HTMLButtonElement;
    const right = document.getElementById("right") as HTMLButtonElement;
    const down = document.getElementById("down") as HTMLButtonElement;

    setRect(left, { left: 0, top: 0 });
    setRect(right, { left: 120, top: 0 });
    setRect(down, { left: 0, top: 120 });

    const cleanup = renderHook();

    left.focus();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(document.activeElement).toBe(right);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(document.activeElement).toBe(down);
    expect(document.documentElement).toHaveClass("tv-remote-mode");
    cleanup();
  });

  it("clicks the focused control when the confirm key is pressed", () => {
    document.body.innerHTML = `<button id="play">Play</button>`;
    const play = document.getElementById("play") as HTMLButtonElement;
    setRect(play, { left: 0, top: 0 });
    const onClick = vi.fn();
    play.addEventListener("click", onClick);

    const cleanup = renderHook();

    play.focus();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("does not hijack arrow keys while typing in text inputs", () => {
    document.body.innerHTML = `<input id="search" /><button id="next">Next</button>`;
    const search = document.getElementById("search") as HTMLInputElement;
    const next = document.getElementById("next") as HTMLButtonElement;
    setRect(search, { left: 0, top: 0 });
    setRect(next, { left: 120, top: 0 });

    const cleanup = renderHook();

    search.focus();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(document.activeElement).toBe(search);
    cleanup();
  });
});
