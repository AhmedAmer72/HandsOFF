import { useEffect, useRef, useState } from "react";
import { playMenuIntro } from "../../animations/mainMenuTimeline";
import { setScreen, useGame } from "../../game/store";
import { mountMainMenu, type MainMenuHandle } from "../../three/scenes/MainMenuScene";
import { MainMenuBanner } from "../main-menu/MainMenuBanner";
import { MainMenuFeatures } from "../main-menu/MainMenuFeatures";
import { MainMenuHero } from "../main-menu/MainMenuHero";
import { MainMenuNavigation } from "../main-menu/MainMenuNavigation";
import { MainMenuStats } from "../main-menu/MainMenuStats";
import { sfx } from "../../game/audio";

export function MainMenu() {
  const game = useGame();
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene = useRef<MainMenuHandle | null>(null);
  const [trailer, setTrailer] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = root.current;
    if (!canvas || !host) return;
    const mounted = mountMainMenu(canvas, game.quality);
    scene.current = mounted;
    const stopIntro = playMenuIntro(host, () => setIntroDone(true));
    void mounted.ready.then(() => {
      if (mounted.failed) setFallback(true);
    });
    const onResize = () => mounted.resize();
    window.addEventListener("resize", onResize);
    return () => {
      stopIntro();
      window.removeEventListener("resize", onResize);
      mounted.dispose();
    };
  }, [game.quality]);

  function skipIntro() {
    setIntroDone(true);
    root.current?.querySelectorAll<HTMLElement>(".menu-bit").forEach((node) => {
      node.style.opacity = "1";
      node.style.visibility = "visible";
      node.style.transform = "none";
    });
  }

  return (
    <div ref={root} className="relative h-full min-h-[640px] overflow-hidden bg-ink text-parchment">
      <canvas ref={canvasRef} className="view absolute inset-0 h-full w-full" />
      {fallback && <div className="absolute inset-0 bg-gradient-to-b from-stone to-ink" />}
      <div className="relative flex h-full min-h-[640px] flex-col">
        <MainMenuNavigation active="menu" continueReady={game.continueReady} />
        {!introDone && (
          <button className="absolute right-4 top-16 z-20 text-xs uppercase tracking-[0.16em] text-gold" onClick={skipIntro}>Skip intro</button>
        )}
        <div className="flex flex-1 flex-col justify-between gap-6 px-4 py-6 md:px-10">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <MainMenuHero continueReady={game.continueReady} onTrailer={() => { setTrailer(true); scene.current?.playTrailer(); }} />
            <MainMenuStats game={game} continueReady={game.continueReady} />
          </div>
          <div className="flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-end">
            <MainMenuFeatures />
            <MainMenuBanner />
          </div>
        </div>
      </div>
      {trailer && (
        <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2">
          <button className="rounded-full bg-gold px-4 py-2 text-ink" onClick={() => { scene.current?.skipTrailer(); setTrailer(false); }}>Close</button>
          <button className="rounded-full border border-gold/50 px-4 py-2 text-gold" onClick={() => scene.current?.skipTrailer()}>Skip</button>
          <button className="rounded-full border border-gold/50 px-4 py-2 text-gold" onClick={() => scene.current?.playTrailer()}>Replay</button>
          <button className="rounded-full border border-white/20 px-4 py-2" onClick={() => { sfx.ui(); setTrailer(false); scene.current?.skipTrailer(); setScreen("map"); }}>Enter the world</button>
        </div>
      )}
    </div>
  );
}
