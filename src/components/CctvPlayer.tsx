import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import type { Camera } from "../lib/types";
import { playUrl } from "../lib/cameras";

export function CctvPlayer({ cam }: { cam: Camera }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setError(false);
    const url = playUrl(cam);
    if (cam.streamType === "embed" || !url) return;

    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    let native = false;

    // hls.js di-import dinamis agar tidak membebani bundle awal halaman.
    (async () => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        native = true;
        video.src = url;
        video.play().catch(() => {});
        return;
      }
      const { default: HlsCtor } = await import("hls.js");
      if (!HlsCtor.isSupported()) {
        setError(true);
        return;
      }
      hls = new HlsCtor({ manifestLoadingTimeOut: 10_000, fragLoadingTimeOut: 15_000 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(HlsCtor.Events.ERROR, (_evt, data) => {
        if (data.fatal) setError(true);
      });
    })();

    return () => {
      hls?.destroy();
      if (native) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [cam, attempt]);

  if (cam.streamType === "embed") {
    return (
      <iframe
        className="player-embed"
        src={playUrl(cam)}
        title={cam.name}
        allowFullScreen
        allow="autoplay; fullscreen"
      />
    );
  }

  return (
    <div className="player">
      <video ref={videoRef} autoPlay muted playsInline controls />
      <span className="live" aria-hidden>
        LIVE
      </span>
      {error && (
        <div className="player-error">
          <p>Kamera tidak tersedia</p>
          <button onClick={() => setAttempt((a) => a + 1)}>Coba lagi</button>
        </div>
      )}
    </div>
  );
}
