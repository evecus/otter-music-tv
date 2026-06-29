/**
 * TVLayout — Android TV 根布局
 *
 * 结构：
 *   ┌──────────┬─────────────────────────┐
 *   │          │                         │
 *   │ TVSidebar│   页面内容（children）   │
 *   │  (220px) │                         │
 *   │          ├─────────────────────────┤
 *   │          │     TVPlayerBar (90px)  │
 *   └──────────┴─────────────────────────┘
 *
 * 职责：
 *  ① 给 <html> 加 tv-mode class，激活 tv.css 大屏样式
 *  ② 调用 useTVKeyboard，启用全局方向键 + 媒体键处理
 *  ③ 检测鼠标/遥控器模式，切换 html.using-mouse 来控制焦点环
 *  ④ 处理返回键（Escape）→ 通知父层（回退页面）
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useTVKeyboard } from "@/hooks/useTVKeyboard";
import { TVSidebar } from "./TVSidebar";
import { TVPlayerBar } from "./TVPlayerBar";
import { GlobalMusicPlayer } from "@/components/GlobalMusicPlayer";
import "@/assets/tv.css";

interface TVLayoutProps {
  children: ReactNode;
  onOpenFullScreen?: () => void;
}

export function TVLayout({ children, onOpenFullScreen }: TVLayoutProps) {
  useTVKeyboard(true);
  const firstFocusDone = useRef(false);

  // ① html.tv-mode — 激活 TV 样式
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("tv-mode");
    return () => html.classList.remove("tv-mode");
  }, []);

  // ② 检测输入设备：遥控器（键盘）↔ 鼠标
  //    鼠标移动时加 html.using-mouse，隐藏焦点环；
  //    键盘按下时移除，让焦点环重新显示
  useEffect(() => {
    const html = document.documentElement;

    const onMouse = () => html.classList.add("using-mouse");
    const onKey = (e: KeyboardEvent) => {
      if (
        ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter","Escape"].includes(e.key)
      ) {
        html.classList.remove("using-mouse");
      }
    };

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  // ③ 首次渲染后自动聚焦，让遥控器开箱即用
  useEffect(() => {
    if (firstFocusDone.current) return;
    firstFocusDone.current = true;
    const timer = setTimeout(() => {
      const FOCUSABLE = [
        "a[href]","button:not([disabled])",
        "[tabindex]:not([tabindex='-1'])","[data-tv-focusable]",
      ].join(", ");
      document.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="tv-main-layout">
      {/* 隐藏 audio 元素，保持全局播放逻辑 */}
      <GlobalMusicPlayer />

      {/* 左侧导航栏 */}
      <TVSidebar />

      {/* 右侧：页面内容 + 底部播放栏 */}
      <div className="tv-content-area">
        <div className="tv-page-scroll">
          {children}
        </div>
        <TVPlayerBar onOpenFullScreen={onOpenFullScreen} />
      </div>
    </div>
  );
}
