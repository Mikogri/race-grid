import { createContext, useContext } from "react";

/**
 * Where a component is rendered:
 * - 'page': directly on the app background (a Card becomes a panel)
 * - 'panel': inside a Panel or Card (a Card becomes a hairline group; never a panel inside a panel)
 */
export type Surface = "page" | "panel";

export const SurfaceContext = createContext<Surface>("page");

export const useSurface = () => useContext(SurfaceContext);

/** State views render as their own panel only when nothing around them is one. */
export const useInCard = () => useContext(SurfaceContext) !== "page";
