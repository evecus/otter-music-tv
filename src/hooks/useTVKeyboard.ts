/**
 * useTVKeyboard
 *
 * 全局 D-pad / 方向键焦点调度 + 媒体键处理。
 *
 * Android TV 遥控器 → MainActivity.dispatchKeyEvent → WebView → KeyboardEvent：
 *   ArrowUp / Down / Left / Right   方向键
 *   Enter                            确认键 (DPAD_CENTER)
 *   Escape                           返回键 (KEYCODE_BACK → WebView → Escape)
 *   MediaPlayPause                   播放暂停
 *   MediaNextTrack                   下一曲
 *   MediaPreviousTrack               上一曲
 */

import { useEffect } from "react";
import { useMusicStore } from "@/store/music-store";
import { useShallow } from "zustand/react/shallow";

const FOCUSABLE_SEL = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[data-tv-focusable]",
].join(", ");

/** 获取所有当前可见可聚焦元素 */
function getVisibleFocusables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SEL)).filter(
    (el) => {
      if (el.offsetParent === null) return false; // display:none
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
  );
}

/** 向某方向找最近的可聚焦元素（空间导航） */
function getNextFocusable(direction: "up" | "down" | "left" | "right"): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;

  const all = getVisibleFocusables();
  if (all.length === 0) return null;

  // 没有焦点时，聚焦第一个
  if (!active || active === document.body || !all.includes(active)) {
    return all[0];
  }

  const ar = active.getBoundingClientRect();
  const ax = ar.left + ar.width / 2;
  const ay = ar.top + ar.height / 2;

  // 按方向筛选候选元素（加 4px 容差防止同行元素误判方向）
  const TOLERANCE = 4;
  const candidates = all.filter((el) => {
    if (el === active) return false;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    switch (direction) {
      case "up":    return cy < ay - TOLERANCE;
      case "down":  return cy > ay + TOLERANCE;
      case "left":  return cx < ax - TOLERANCE;
      case "right": return cx > ax + TOLERANCE;
    }
  });

  if (candidates.length === 0) return null;

  // 加权距离：主轴距离权重 1，副轴权重 2.5（避免斜向跳跃）
  const CROSS_WEIGHT = 2.5;
  const score = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = Math.abs(cx - ax);
    const dy = Math.abs(cy - ay);
    return direction === "up" || direction === "down"
      ? dy + dx * CROSS_WEIGHT
      : dx + dy * CROSS_WEIGHT;
  };

  return candidates.reduce((best, el) => (score(el) < score(best) ? el : best));
}

export function useTVKeyboard(enabled: boolean) {
  const { togglePlay, setCurrentIndexAndPlay, queue, currentIndex } =
    useMusicStore(
      useShallow((s) => ({
        togglePlay: s.togglePlay,
        setCurrentIndexAndPlay: s.setCurrentIndexAndPlay,
        queue: s.queue,
        currentIndex: s.currentIndex,
      }))
    );

  useEffect(() => {
    if (!enabled) return;

    // 初始聚焦：500ms 后自动聚焦第一个元素，让遥控器立即可用
    const initTimer = setTimeout(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        getVisibleFocusables()[0]?.focus({ preventScroll: true });
      }
    }, 500);

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        // ─── 方向键：空间导航 ───────────────────────────────
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight": {
          // 如果当前焦点在 input 内，让原生行为处理（光标移动）
          const tag = (document.activeElement as HTMLElement)?.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA") break;

          e.preventDefault();
          const dir = e.key.replace("Arrow", "").toLowerCase() as
            "up" | "down" | "left" | "right";
          const next = getNextFocusable(dir);
          if (next) {
            next.focus({ preventScroll: false });
            next.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
          }
          break;
        }

        // ─── 确认键 ──────────────────────────────────────────
        case "Enter": {
          const active = document.activeElement as HTMLElement | null;
          // 对 button/a/input 等原生可交互元素不重复触发（浏览器默认处理 Enter）
          if (!active || ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(active.tagName)) break;
          // 对 div/li/[role=button] 等非原生元素触发点击
          active.click();
          break;
        }

        // ─── 媒体键 ───────────────────────────────────────────
        case "MediaPlayPause":
          e.preventDefault();
          togglePlay();
          break;

        case " ": {
          // 空格键当播放暂停，但不在输入框内时
          const tag2 = (document.activeElement as HTMLElement)?.tagName;
          if (tag2 !== "INPUT" && tag2 !== "TEXTAREA") {
            e.preventDefault();
            togglePlay();
          }
          break;
        }

        case "MediaNextTrack":
          e.preventDefault();
          if (queue.length > 0) {
            setCurrentIndexAndPlay((currentIndex + 1) % queue.length);
          }
          break;

        case "MediaPreviousTrack":
          e.preventDefault();
          if (queue.length > 0) {
            setCurrentIndexAndPlay((currentIndex - 1 + queue.length) % queue.length);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // capture phase，优先于其他监听
    return () => {
      clearTimeout(initTimer);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, togglePlay, setCurrentIndexAndPlay, queue, currentIndex]);
}
