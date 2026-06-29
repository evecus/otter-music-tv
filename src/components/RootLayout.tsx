import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { MusicLayout } from "@/components/MusicLayout";
import { MusicNowPlayingBar } from "@/components/MusicNowPlayingBar";
import { MusicTabBar } from "@/components/MusicTabBar";
import { GlobalMusicPlayer } from "@/components/GlobalMusicPlayer";
import { useMusicStore } from "@/store/music-store";
import { useShallow } from "zustand/react/shallow";
import { useExitLayer } from "@/hooks/useExitLayer";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useTVMode } from "@/hooks/useTVMode";
import { TVLayout } from "@/components/tv/TVLayout";

const FullScreenPlayer = lazy(() =>
  import("@/components/FullScreenPlayer").then((m) => ({
    default: m.FullScreenPlayer,
  }))
);

const ROOT_TAB_PATHS = ["/", "/search", "/favorites", "/mine"] as const;

export function RootLayout() {
  const isTV = useTVMode();
  const location = useLocation();
  const navigate = useNavigate();
  const { isFullScreenPlayer, setIsFullScreenPlayer: setStoreFullScreen } =
    useMusicStore(
      useShallow((state) => ({
        isFullScreenPlayer: state.isFullScreenPlayer,
        setIsFullScreenPlayer: state.setIsFullScreenPlayer,
      }))
    );
  const { handleExit: handleExitLayer, push, pop } = useExitLayer();

  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!isFullScreenPlayer) return;
    const id = push({ close: () => setStoreFullScreen(false) });
    return () => { pop(id); };
  }, [isFullScreenPlayer, setStoreFullScreen, push, pop]);

  const isRootTabPath = useCallback((path: string) => {
    return ROOT_TAB_PATHS.includes(path as (typeof ROOT_TAB_PATHS)[number]);
  }, []);

  const handleBackAction = useCallback(async () => {
    if (handleExitLayer()) return;
    const path = locationRef.current.pathname;
    if (isRootTabPath(path)) {
      if (Capacitor.isNativePlatform()) await CapacitorApp.minimizeApp();
      return;
    }
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }
    navigate("/search", { replace: true });
  }, [handleExitLayer, isRootTabPath, navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapacitorApp.addListener("backButton", handleBackAction);
    return () => { listener.then((l) => l.remove()); };
  }, [handleBackAction]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const handled = handleExitLayer();
      if (handled) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleExitLayer]);

  const hasCurrentTrack = useMusicStore(
    (s) => s.queue.length > 0 && s.currentIndex >= 0
  );

  const isTab = isRootTabPath(location.pathname);

  // ── TV 模式：侧边栏布局 + 遥控器焦点 ──────────────────────
  if (isTV) {
    return (
      <>
        <TVLayout onOpenFullScreen={() => setStoreFullScreen(true)}>
          <Outlet />
        </TVLayout>

        {/* 全屏播放器在 TV 上同样可用（可用方向键关闭） */}
        <Suspense fallback={null}>
          <FullScreenPlayer
            isFullScreen={isFullScreenPlayer}
            onClose={() => setStoreFullScreen(false)}
          />
        </Suspense>
      </>
    );
  }

  // ── 手机 / 平板模式（原有逻辑不变） ─────────────────────────
  return (
    <>
      <MusicLayout
        hidePlayer={isFullScreenPlayer || !hasCurrentTrack}
        isTab={isTab}
        player={
          <MusicNowPlayingBar
            onOpenFullScreen={() => setStoreFullScreen(true)}
            isTab={isTab}
          />
        }
        tabBar={<MusicTabBar />}
      >
        <Outlet />
      </MusicLayout>

      <GlobalMusicPlayer />

      <Suspense fallback={null}>
        <FullScreenPlayer
          isFullScreen={isFullScreenPlayer}
          onClose={() => setStoreFullScreen(false)}
        />
      </Suspense>
    </>
  );
}
