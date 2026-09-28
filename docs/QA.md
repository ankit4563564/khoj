# Build verification

## Functional checks

- Production Next.js build and TypeScript checks passed.
- Eight Node test cases passed, including an integrated PGlite database test with allow/deny assertions across roles and recovery states.
- In-app browser: registered an item with two photos, validated missing-photo errors, searched it, marked it lost, submitted an anonymous found report, checked restricted board content, submitted/rejected a manual claim, and completed the seeded verified recovery with payment skipped. Reload retained the completed return.
- The in-app browser's native JavaScript confirmation dialog stalled its input handling. Replaced reset with an in-page two-step control. A separate Playwright Chromium session verified reset, the recovery loop, persistence, mobile navigation, and console health. No app runtime errors were recorded.
- HTTP checks: invalid-domain email 400, malformed input 400, cross-origin request 403, unconfigured live endpoints 503 with private no-store responses.
- Real Supabase network integration remains untested because no project credentials are configured.

## Visual comparison

Design reference: `design-concept.png`. Primary comparison viewport: 1505 × 1045, matching the generated reference dimensions. Playwright captured full-page screenshots with reduced motion enabled; mobile was checked at 390 × 844. The reference and latest desktop/mobile renders were inspected with `view_image` in the same QA pass. Login was also inspected at 1440 × 1000 and 390 × 844.

Comparison points:

1. **Layout** — sidebar, heading, candidate panel, three-item row and privacy band preserve the reference hierarchy. Corrected sidebar width and excessive space above the candidate panel.
2. **Palette** — graphite background, muted green surfaces and coral controls match the reference system; no new gradients or colour overlays.
3. **Typography** — editorial serif headings and neutral sans-serif controls consistently applied across dashboard, modals, finder and college sign-in. The selected webfont is lighter than the generated raster lettering; this is an intentional implementation choice.
4. **Assets** — generated a separate product triptych, then regenerated with extra crop room to prevent bottle/backpack clipping. Subjects are smaller than the initial concept; all remain fully visible. Assets sit on matching dark surfaces with no tint overlay.
5. **Copy and controls** — core overview copy preserved. Intentional additions: sample-confidence disclosure, local storage note, recovery/reviewer navigation, RV University sign-in link, and footer. No unrelated marketing sections added.
6. **Responsive behavior** — mobile uses collapsed navigation, a stacked confidence panel, and one-column belongings. Measured document width equals viewport width (390 px); no horizontal overflow.
7. **Interaction/accessibility** — semantic controls, labelled forms/dialogs, focus outlines, keyboard-dismissable dialogs and reduced-motion rules. Fixed reset to avoid native browser dialog dependence.

The implementation was visually verified against the design reference for hierarchy, palette, typography, content and controls. It is not a pixel-identical reproduction: standalone photography, the lighter serif, smaller subject scale, and necessary demo/campus disclosures are intentional differences. No clipped primary content or mobile overflow remained in the inspected screens. Campus downstream states extend the same visual system; live service-backed states still need testing against a configured project.

Image Gen was used for `design-concept.png` and `public/belongings-v2.png`; prompts and tokens are summarized in `DESIGN.md`. Final screenshot deliverables are `preview-desktop.png`, `preview-mobile.png`, and `preview-login.png` in this folder. Temporary QA scripts and intermediate screenshots were removed after verification.
