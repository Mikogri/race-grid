# thinking-orbs (vendored engine)

Canvas animation engine copied from https://github.com/RareFormLabs/thinking-orbs
(MIT License, Copyright (c) 2026 Jakub Antalik — see `LICENSE`).

Copied unchanged: `engine/*.ts`, `presets.ts`.
Replaced: the Vue component and theme composables are re-implemented in React in
`src/components/ui/ThinkingOrb.tsx`; `types.ts` keeps only the framework-free types.
RaceGrid is always dark, so the ancestor/system theme detection is not ported.
