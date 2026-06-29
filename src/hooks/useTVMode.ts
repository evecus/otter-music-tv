/**
 * useTVMode
 *
 * 检测当前运行环境是否为 Android TV / 大屏设备。
 *
 * 判断优先级（从高到低）：
 *  1. URL ?tv=0  → 强制手机模式（调试用）
 *  2. URL ?tv=1  → 强制 TV 模式（调试用）
 *  3. localStorage "tv_mode" = "1" / "0" → 用户手动切换
 *  4. User-Agent 含 TV 关键字 → TV 模式
 *  5. 大屏 + 横屏（宽度 ≥ 960px 且宽 > 高）→ TV 模式
 *
 * 说明：Android TV 上的 WebView 有时 `pointer: coarse` 返回 true
 * （因为系统级触屏能力存在），所以不能仅靠指针类型判断，
 * 主要依赖屏幕尺寸 + UA 双保险。
 */

import { useEffect, useState } from "react";

function detectTV(): boolean {
  if (typeof window === "undefined") return false;

  // 1 & 2. URL 强制开关（调试用，优先级最高）
  const urlParam = new URLSearchParams(window.location.search).get("tv");
  if (urlParam === "1") return true;
  if (urlParam === "0") return false;

  // 3. localStorage 用户开关
  const stored = localStorage.getItem("tv_mode");
  if (stored === "1") return true;
  if (stored === "0") return false;

  // 4. User-Agent TV 关键字（Android TV / Google TV / 盒子厂商字符串）
  const ua = navigator.userAgent;
  if (/Android TV|Google TV|SMART-TV|SmartTV|HbbTV|googletv|Chromecast/i.test(ua)) {
    return true;
  }

  // 5. 屏幕尺寸：大屏横屏
  const w = window.screen.width;  // 用 screen.width 而非 innerWidth，避免缩放影响
  const h = window.screen.height;
  return w >= 960 && w > h;
}

export function useTVMode(): boolean {
  const [isTV, setIsTV] = useState<boolean>(() => detectTV());

  useEffect(() => {
    // 监听窗口尺寸变化（旋转屏幕等场景）
    const handler = () => setIsTV(detectTV());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isTV;
}

/** 在组件树外部同步判断（无响应性） */
export const isTVMode = (): boolean => detectTV();
