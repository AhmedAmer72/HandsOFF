import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";
import { SealButton } from "../../ui/forge/controls";

const HERO = "/hero/underrealm-hands-off.jpg";

type HeroProps = {
  onStart: () => void;
  onConnect: () => void;
  continueReady: boolean;
};

export function ParallaxComponent({ onStart, onConnect, continueReady }: HeroProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = parallaxRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || Boolean(root?.closest(".motion-reduce"));
    const scroller = root?.closest("main");
    const content = scroller?.querySelector<HTMLElement>("[data-testid=landing]") ?? undefined;
    const triggerElement = root?.querySelector<HTMLElement>("[data-parallax-layers]");
    if (reduce || !triggerElement) return;

    gsap.registerPlugin(ScrollTrigger);
    const layers = [
      { layer: "1", yPercent: 18 },
      { layer: "2", yPercent: 12 },
      { layer: "3", yPercent: 4 },
      { layer: "4", yPercent: 0 },
    ];
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: triggerElement,
        scroller: scroller ?? undefined,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
    layers.forEach((layerObj, index) => {
      timeline.to(
        triggerElement.querySelectorAll(`[data-parallax-layer="${layerObj.layer}"]`),
        { yPercent: layerObj.yPercent, ease: "none" },
        index === 0 ? undefined : "<",
      );
    });

    const lenis = new Lenis({
      wrapper: scroller ?? window,
      content,
    });
    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="parallax" ref={parallaxRef}>
      <section className="parallax__header">
        <h1 className="sr-only">Underrealm. Your dungeon. Their money. Your rules.</h1>
        <div className="parallax__visuals">
          <div data-parallax-layers className="parallax__layers">
            <img src={HERO} data-parallax-layer="1" alt="" width="1600" height="900" className="parallax__layer-img" />
            <img src={HERO} data-parallax-layer="2" alt="" width="1600" height="900" className="parallax__layer-img parallax__layer-img--front" />
            <div data-parallax-layer="3" className="parallax__layer-title">
              <div className="parallax__actions">
                <SealButton data-testid="get-started" onClick={onStart}>Get Started</SealButton>
                <SealButton tone="ghost" data-testid="connect-wallet" onClick={onConnect}>Connect Wallet</SealButton>
                {continueReady && <p className="basis-full text-center text-sm text-parchment">A guest hall is already saved on this device. Get Started opens it.</p>}
              </div>
            </div>
            <div data-parallax-layer="4" className="parallax__fade" />
          </div>
        </div>
      </section>
    </div>
  );
}
