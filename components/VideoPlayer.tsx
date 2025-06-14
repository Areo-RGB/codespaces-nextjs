import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './VideoPlayer.module.css';

interface Video {
  id: number;
  title: string;
  src: string;
  poster?: string;
}

interface VideoPlayerProps {
  videos: Video[];
  currentIndex: number;
  onVideoChange: (index: number) => void;
}

export default function VideoPlayer({
  videos = [],
  currentIndex = 0,
  onVideoChange,
}: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDualMode, setIsDualMode] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [showVideoSelection, setShowVideoSelection] = useState(false);
  const [showTitleOverlay, setShowTitleOverlay] = useState(false);
  const [extractedThumbnails, setExtractedThumbnails] = useState<
    Record<string, string>
  >({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentVideo = videos[currentIndex];
  const secondVideo =
    currentIndex < videos.length - 1 ? videos[currentIndex + 1] : videos[0];
  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const updateDuration = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [currentVideo]);

  useEffect(() => {
    // Show title overlay on initial load
    showTitleTemporarily();
  }, []);

  const extractThumbnail = useCallback(
    (videoSrc: string) => {
      return new Promise<string | null>(resolve => {
        if (typeof document === 'undefined') {
          resolve(null);
          return;
        }

        if (extractedThumbnails[videoSrc]) {
          resolve(extractedThumbnails[videoSrc]);
          return;
        }

        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;

        video.onloadedmetadata = () => {
          // Seek to frame 5 (assuming 30fps, frame 5 = ~0.167 seconds)
          video.currentTime = 0.167;
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              resolve(null);
              return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);

            setExtractedThumbnails(prev => ({
              ...prev,
              [videoSrc]: thumbnailUrl,
            }));

            resolve(thumbnailUrl);
          } catch (error) {
            console.log('Could not extract thumbnail:', error);
            resolve(null);
          }
        };

        video.onerror = () => {
          console.log('Error loading video for thumbnail extraction');
          resolve(null);
        };

        video.src = videoSrc;
      });
    },
    [extractedThumbnails]
  );

  useEffect(() => {
    // Extract thumbnails for videos without posters
    videos.forEach(video => {
      if (!video.poster && !extractedThumbnails[video.src]) {
        extractThumbnail(video.src);
      }
    });
  }, [videos, extractedThumbnails, extractThumbnail]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const togglePlay = () => {
    const video1 = videoRef.current;
    const video2 = videoRef2.current;

    if (isPlaying) {
      video1?.pause();
      if (isDualMode) video2?.pause();
      stopTimer();
    } else {
      video1?.play();
      if (isDualMode) video2?.play();
      if (showTimer && !timerActive) {
        startTimer();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const nextVideo = () => {
    const nextIndex = currentIndex < videos.length - 1 ? currentIndex + 1 : 0;
    onVideoChange?.(nextIndex);
    showTitleTemporarily();
  };

  const prevVideo = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : videos.length - 1;
    onVideoChange?.(prevIndex);
    showTitleTemporarily();
  };

  const handleVideoEnd = () => {
    if (!isDualMode) {
      nextVideo();
    }
  };

  const toggleDualMode = () => {
    setIsDualMode(!isDualMode);
    setIsPlaying(false);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    if (isDualMode && videoRef2.current) {
      videoRef2.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video1 = videoRef.current;
    const video2 = videoRef2.current;
    if (!video1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * video1.duration;
    video1.currentTime = newTime;
    if (isDualMode && video2) {
      video2.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const createPlaceholderImage = (text: string, color = '#333333') => {
    if (typeof document === 'undefined') {
      return null; // Return null during SSR
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    canvas.width = 1920;
    canvas.height = 1080;

    // Fill background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxWidth = canvas.width - 100;
    let fontSize = 72;

    // Adjust font size to fit
    do {
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      fontSize -= 2;
    } while (ctx.measureText(text).width > maxWidth && fontSize > 20);

    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const getThumbnail = (video: Video) => {
    if (video.poster) {
      return video.poster;
    }

    if (extractedThumbnails[video.src]) {
      return extractedThumbnails[video.src];
    }

    // Return empty string for consistent SSR/client rendering
    return '';
  };

  const toggleTimer = () => {
    if (showTimer) {
      setShowTimer(false);
      stopTimer();
    } else {
      setShowTimer(true);
      setTimerSeconds(30);
    }
  };

  const startTimer = () => {
    if (timerIntervalRef.current) return;

    setTimerActive(true);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimerActive(false);
  };

  const resetTimer = () => {
    stopTimer();
    setTimerSeconds(30);
  };

  const addTime = () => {
    setTimerSeconds(prev => prev + 5);
  };

  const subtractTime = () => {
    setTimerSeconds(prev => Math.max(0, prev - 5));
  };

  const toggleVideoSelection = () => {
    setShowVideoSelection(!showVideoSelection);
  };

  const selectVideo = (index: number) => {
    onVideoChange?.(index);
    setShowVideoSelection(false);
    showTitleTemporarily();
  };

  const showTitleTemporarily = () => {
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    setShowTitleOverlay(true);
    titleTimeoutRef.current = setTimeout(() => {
      setShowTitleOverlay(false);
    }, 3000);
  };

  if (!currentVideo) {
    return <div className={styles.noVideo}>No video available</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''} ${isDualMode ? styles.dualMode : ''}`}
    >
      <div
        className={
          isDualMode ? styles.videoContainer : styles.singleVideoContainer
        }
      >
        <video
          ref={videoRef}
          src={currentVideo.src}
          className={styles.video}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleVideoEnd}
          poster={getThumbnail(currentVideo)}
          playsInline
        />

        {isDualMode && (
          <video
            ref={videoRef2}
            src={secondVideo.src}
            className={styles.video}
            poster={getThumbnail(secondVideo)}
            playsInline
          />
        )}
      </div>

      <div className={styles.customControls}>
        <div className={styles.progressContainer}>
          <div className={styles.progressBar} onClick={handleSeek}>
            <div
              className={styles.progressFilled}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={styles.timeDisplay}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className={styles.controlButtons}>
          {/* Playback Controls Section */}
          <div className={styles.controlSection}>
            <button onClick={prevVideo} className={styles.controlButton}>
              <i className="fas fa-step-backward"></i>
            </button>

            <button onClick={togglePlay} className={styles.controlButton}>
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            </button>

            <button onClick={nextVideo} className={styles.controlButton}>
              <i className="fas fa-step-forward"></i>
            </button>
          </div>

          {/* View Controls Section */}
          <div className={styles.controlSection}>
            <button onClick={toggleDualMode} className={styles.controlButton}>
              <i
                className={`fas ${isDualMode ? 'fa-square' : 'fa-th-large'}`}
              ></i>
            </button>

            <button
              onClick={toggleVideoSelection}
              className={styles.controlButton}
            >
              <i className="fas fa-film"></i>
            </button>

            <div className={styles.speedControl}>
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={styles.controlButton}
              >
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <div className={styles.speedMenu}>
                  {speedOptions.map(speed => (
                    <button
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`${styles.speedOption} ${speed === playbackSpeed ? styles.active : ''}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timer Section */}
          <div className={styles.timerSection}>
            <button onClick={toggleTimer} className={styles.controlButton}>
              <i className="fas fa-stopwatch"></i>
            </button>
          </div>

          {/* Fullscreen Section */}
          <div className={styles.controlSection}>
            <button onClick={toggleFullscreen} className={styles.controlButton}>
              <i
                className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}
              ></i>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.info}>
        <h3>{currentVideo.title}</h3>
        {isDualMode && <h4>{secondVideo.title}</h4>}
        <p>
          {isDualMode ? 'Dual Mode' : `${currentIndex + 1} / ${videos.length}`}
        </p>
      </div>

      {showTimer && (
        <div className={styles.timerOverlay}>
          <button onClick={toggleTimer} className={styles.closeButton}>
            <i className="fas fa-times"></i>
          </button>
          <div className={styles.timerContainer}>
            <div className={styles.timerDisplay}>
              <button
                onClick={subtractTime}
                className={styles.timeAdjustButton}
                disabled={timerActive}
              >
                <i className="fas fa-minus"></i>
              </button>
              <span className={styles.timeNumber}>{timerSeconds}</span>
              <button
                onClick={addTime}
                className={styles.timeAdjustButton}
                disabled={timerActive}
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
            <div className={styles.timerControls}>
              <button onClick={resetTimer} className={styles.timerButton}>
                Reset
              </button>
              <button
                onClick={timerActive ? stopTimer : startTimer}
                className={styles.timerButton}
              >
                {timerActive ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVideoSelection && (
        <div className={styles.videoSelectionOverlay}>
          <button onClick={toggleVideoSelection} className={styles.closeButton}>
            <i className="fas fa-times"></i>
          </button>
          <div className={styles.videoSelectionContainer}>
            <h2 className={styles.selectionTitle}>Select Video</h2>
            <div className={styles.videoGrid}>
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  onClick={() => selectVideo(index)}
                  className={`${styles.videoCard} ${index === currentIndex ? styles.activeCard : ''}`}
                >
                  <div className={styles.videoThumbnail}>
                    {video.poster || extractedThumbnails[video.src] ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getThumbnail(video)} alt={video.title} />
                      </>
                    ) : (
                      <div className={styles.defaultThumbnail}>
                        <i className="fas fa-video"></i>
                      </div>
                    )}
                  </div>
                  <div className={styles.videoInfo}>
                    <h3>{video.title}</h3>
                    <p>Video {index + 1}</p>
                  </div>
                  {index === currentIndex && (
                    <div className={styles.playingIndicator}>
                      <i className="fas fa-play"></i> Playing
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTitleOverlay && (
        <div className={styles.titleOverlay}>
          <div className={styles.titleContainer}>
            <h1 className={styles.largeTitle}>{currentVideo.title}</h1>
            <p className={styles.videoNumber}>
              {currentIndex + 1} / {videos.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
