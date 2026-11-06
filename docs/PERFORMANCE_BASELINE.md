# Performance baseline

Measured in this Cloud Agent Chrome session on 6 November 2026 (Africa/Cairo).

The HUD renderer string was:

`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`

That is software WebGL, not a desktop GPU.

The previous gameplay report, on the same class of environment, recorded about 20 fps and 33,970 triangles in the small hall.

This session's HUD, after the larger Ashgate layout was on screen, read about 20 fps at the sample, average 41, minimum 20, 26 draw calls, and 14,478 triangles. The average is the mean of the half-second samples taken while the page was open. It is not a 60 fps claim.

Movement felt stepwise because each tile was its own GSAP tween of 0.45 seconds and each tween restarted the walk clip with `stopAllAction`.
