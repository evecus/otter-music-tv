import { useEffect } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[role='button']:not([aria-disabled='true'])",
  "[role='tab']:not([aria-disabled='true'])",
  "[role='menuitem']:not([aria-disabled='true'])",
  "[data-tv-focusable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const DIRECTION_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

const CONFIRM_KEYS = new Set(["Enter", " ", "Spacebar", "NumpadEnter"]);

const isHTMLElement = (element: Element | null): element is HTMLElement =>
  element instanceof HTMLElement;

const isTextInput = (element: Element | null) => {
  if (!isHTMLElement(element)) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "textarea" ||
    tagName === "select" ||
    (tagName === "input" &&
      !["button", "checkbox", "radio", "range", "reset", "submit"].includes(
        (element as HTMLInputElement).type
      )) ||
    element.isContentEditable
  );
};

const isVisible = (element: HTMLElement) => {
  if (element.closest("[inert], [aria-hidden='true']")) return false;
  const style = window.getComputedStyle(element);
  if (style.visibility === "hidden" || style.display === "none") return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const getFocusableElements = () =>
  Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isVisible
  );

const getCenter = (rect: DOMRect) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

const getDirectionScore = (
  from: DOMRect,
  to: DOMRect,
  key: string
): number | null => {
  const a = getCenter(from);
  const b = getCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (key === "ArrowUp" && dy >= -2) return null;
  if (key === "ArrowDown" && dy <= 2) return null;
  if (key === "ArrowLeft" && dx >= -2) return null;
  if (key === "ArrowRight" && dx <= 2) return null;

  const primary =
    key === "ArrowUp" || key === "ArrowDown" ? Math.abs(dy) : Math.abs(dx);
  const secondary =
    key === "ArrowUp" || key === "ArrowDown" ? Math.abs(dx) : Math.abs(dy);

  return primary * 1000 + secondary * 3;
};

const focusElement = (element: HTMLElement) => {
  element.focus({ preventScroll: true });
  element.scrollIntoView?.({ block: "nearest", inline: "nearest" });
};

const focusFirstElement = () => {
  const first = getFocusableElements()[0];
  if (first) focusElement(first);
  return Boolean(first);
};

const moveFocus = (key: string) => {
  const elements = getFocusableElements();
  if (elements.length === 0) return false;

  const active = isHTMLElement(document.activeElement)
    ? document.activeElement
    : null;

  if (!active || !elements.includes(active)) {
    focusElement(elements[0]);
    return true;
  }

  const activeRect = active.getBoundingClientRect();
  const next = elements
    .filter((element) => element !== active)
    .map((element) => ({
      element,
      score: getDirectionScore(
        activeRect,
        element.getBoundingClientRect(),
        key
      ),
    }))
    .filter(
      (item): item is { element: HTMLElement; score: number } =>
        item.score !== null
    )
    .sort((a, b) => a.score - b.score)[0]?.element;

  if (!next) return false;
  focusElement(next);
  return true;
};

export function useTvRemoteNavigation() {
  useEffect(() => {
    const onPointerDown = () =>
      document.documentElement.classList.remove("tv-remote-mode");
    const onKeyDown = (event: KeyboardEvent) => {
      const eventTarget = event.target instanceof Element ? event.target : null;
      const target = isTextInput(eventTarget)
        ? eventTarget
        : document.activeElement;

      if (DIRECTION_KEYS.has(event.key)) {
        if (isTextInput(target)) return;
        const handled = moveFocus(event.key);
        if (handled) {
          document.documentElement.classList.add("tv-remote-mode");
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (CONFIRM_KEYS.has(event.key)) {
        if (isTextInput(target)) return;
        const active = document.activeElement;
        if (isHTMLElement(active) && active.matches(FOCUSABLE_SELECTOR)) {
          document.documentElement.classList.add("tv-remote-mode");
          active.click();
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);

    const timer = window.setTimeout(() => {
      if (!isTextInput(document.activeElement)) focusFirstElement();
    }, 250);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);
}
