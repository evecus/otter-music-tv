/**
 * TVPlayerBar — Android TV 底部播放控制栏
 *
 * 替代手机端的 MusicNowPlayingBar。
 * 提供：封面 / 歌名歌手 / 上一首 / 播放暂停 / 下一首 / 进度条 / 播放列表按钮。
 * 所有交互元素都有 tabIndex=0，可通过遥控器方向键 + Enter 操控。
 */

import { SkipBack, SkipForward, Play, Pause, ListVideo } from "lucide-react";
import { useMusicStore } from "@/store/music-store";
import { useShallow } from "zustand/react/shallow";
import { MusicCover } from "@/components/MusicCover";
import { PlayerQueueDrawer } from "@/components/PlayerQueueDrawer";
import { formatTime } from "@/lib/utils/time";
import { useCallback } from "react";
import toast from "react-hot-toast";
import type { MusicTrack } from "@/types/music";

interface TVPlayerBarProps {
  onOpenFullScreen?: () => void;
}

export function TVPlayerBar({ onOpenFullScreen }: TVPlayerBarProps) {
  const {
    isPlaying,
    currentAudioTime,
    duration,
    isShuffle,
    queue,
    currentIndex,
    coverUrl,
    togglePlay,
    setCurrentIndexAndPlay,
    clearQueue,
    reshuffle,
    removeFromQueue,
    playTrackAsNext,
  } = useMusicStore(
    useShallow((state) => ({
      isPlaying: state.isPlaying,
      currentAudioTime: state.currentAudioTime,
      duration: state.duration,
      isShuffle: state.isShuffle,
      queue: state.queue,
      currentIndex: state.currentIndex,
      coverUrl: state.coverUrl,
      togglePlay: state.togglePlay,
      setCurrentIndexAndPlay: state.setCurrentIndexAndPlay,
      clearQueue: state.clearQueue,
      reshuffle: state.reshuffle,
      removeFromQueue: state.removeFromQueue,
      playTrackAsNext: state.playTrackAsNext,
    }))
  );

  const currentTrack = queue[currentIndex] ?? null;

  const handlePrev = () => {
    if (!queue.length) return;
    setCurrentIndexAndPlay((currentIndex - 1 + queue.length) % queue.length);
  };

  const handleNext = () => {
    if (!queue.length) return;
    setCurrentIndexAndPlay((currentIndex + 1) % queue.length);
  };

  const handleClearQueue = () => {
    if (confirm("确定要清空播放列表吗？")) {
      clearQueue();
      toast.success("播放列表已清空");
    }
  };

  const handleRemoveFromQueue = useCallback(
    (track: MusicTrack) => removeFromQueue(track.id),
    [removeFromQueue]
  );

  const progress = duration > 0 ? (currentAudioTime / duration) * 100 : 0;

  if (!currentTrack) {
    return (
      <div className="tv-player-bar">
        <span className="text-muted-foreground text-sm">暂无播放内容</span>
      </div>
    );
  }

  return (
    <div className="tv-player-bar">
      {/* 封面 */}
      <button
        className="tv-player-bar__cover focus:outline-none"
        tabIndex={0}
        onClick={() => onOpenFullScreen?.()}
        aria-label="打开全屏播放器"
        data-tv-focusable
      >
        <MusicCover
          src={coverUrl}
          alt={currentTrack.name}
          className="w-full h-full"
          iconClassName="h-6 w-6"
        />
      </button>

      {/* 歌曲信息 */}
      <div
        className="tv-player-bar__info cursor-pointer"
        onClick={() => onOpenFullScreen?.()}
      >
        <div className="tv-player-bar__title">{currentTrack.name}</div>
        <div className="tv-player-bar__artist">
          {currentTrack.artist?.join(", ")}
        </div>
      </div>

      {/* 进度条 + 时间 */}
      <div className="tv-progress-wrap">
        <div className="tv-progress-bar">
          <div
            className="tv-progress-bar__fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="tv-progress-time">
          <span>{formatTime(currentAudioTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 控制按钮组 */}
      <div className="tv-player-bar__controls">
        <button
          className="tv-ctrl-btn"
          tabIndex={0}
          onClick={handlePrev}
          aria-label="上一首"
          data-tv-focusable
        >
          <SkipBack size={22} className="fill-current" />
        </button>

        <button
          className="tv-ctrl-btn tv-ctrl-btn--primary"
          tabIndex={0}
          onClick={togglePlay}
          aria-label={isPlaying ? "暂停" : "播放"}
          data-tv-focusable
        >
          {isPlaying ? (
            <Pause size={26} className="fill-current" />
          ) : (
            <Play size={26} className="fill-current ml-0.5" />
          )}
        </button>

        <button
          className="tv-ctrl-btn"
          tabIndex={0}
          onClick={handleNext}
          aria-label="下一首"
          data-tv-focusable
        >
          <SkipForward size={22} className="fill-current" />
        </button>

        <PlayerQueueDrawer
          queue={queue}
          currentIndex={currentIndex}
          isPlaying={isPlaying}
          isShuffle={isShuffle}
          onPlay={(i) => setCurrentIndexAndPlay(i)}
          onClear={handleClearQueue}
          onReshuffle={reshuffle}
          onRemove={handleRemoveFromQueue}
          onPlayTrack={playTrackAsNext}
          trigger={
            <button
              className="tv-ctrl-btn"
              tabIndex={0}
              aria-label="播放列表"
              data-tv-focusable
            >
              <ListVideo size={22} />
            </button>
          }
        />
      </div>
    </div>
  );
}
