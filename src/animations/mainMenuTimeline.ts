import gsap from "gsap";

export function playMenuIntro(root: HTMLElement, onDone: () => void) {
  const ctx = gsap.context(() => {
    gsap.fromTo(
      ".menu-bit",
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.05, delay: 0.2, ease: "power2.out", onComplete: onDone },
    );
  }, root);
  return () => ctx.revert();
}

export function liftButton(target: HTMLElement, up: boolean) {
  gsap.to(target, { y: up ? -4 : 0, scale: up ? 1.03 : 1, duration: 0.18, overwrite: "auto" });
}
