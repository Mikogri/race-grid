import { createBrowserRouter } from "react-router";
import { AppLayout } from "../components/layout/AppLayout";
import { NotFoundPage, RouteErrorPage } from "./RouteErrorPage";

// Each feature is a separate chunk; heavy screens (replay, compare) load only when opened.
export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import("../features/dashboard/DashboardPage"))
            .DashboardPage,
        }),
      },
      {
        path: "calendar",
        lazy: async () => ({
          Component: (await import("../features/calendar/CalendarPage"))
            .CalendarPage,
        }),
      },
      {
        path: "rounds/:meetingKey",
        lazy: async () => ({
          Component: (await import("../features/round/RoundPage")).RoundPage,
        }),
      },
      {
        path: "standings",
        lazy: async () => ({
          Component: (await import("../features/standings/StandingsPage"))
            .StandingsPage,
        }),
      },
      {
        path: "drivers",
        lazy: async () => ({
          Component: (await import("../features/driver/DriversPage"))
            .DriversPage,
        }),
      },
      {
        path: "drivers/:year/:driverNumber",
        lazy: async () => ({
          Component: (await import("../features/driver/DriverPage")).DriverPage,
        }),
      },
      {
        path: "constructors",
        lazy: async () => ({
          Component: (await import("../features/constructor/ConstructorsPage"))
            .ConstructorsPage,
        }),
      },
      {
        path: "constructors/:year/:teamSlug",
        lazy: async () => ({
          Component: (await import("../features/constructor/ConstructorPage"))
            .ConstructorPage,
        }),
      },
      {
        path: "tracks",
        lazy: async () => ({
          Component: (await import("../features/tracks/TracksPage")).TracksPage,
        }),
      },
      {
        path: "tracks/:slug",
        lazy: async () => ({
          Component: (await import("../features/tracks/TrackDetailsPage"))
            .TrackDetailsPage,
        }),
      },
      {
        path: "replay",
        lazy: async () => ({
          Component: (await import("../features/replay/ReplayPickerPage"))
            .ReplayPickerPage,
        }),
      },
      {
        path: "replay/:sessionKey",
        lazy: async () => ({
          Component: (await import("../features/replay/ReplayPage")).ReplayPage,
        }),
      },
      {
        path: "compare",
        lazy: async () => ({
          Component: (await import("../features/compare/ComparePage"))
            .ComparePage,
        }),
      },
      {
        path: "compare/laps",
        lazy: async () => ({
          Component: (await import("../features/compare/ComparePage"))
            .LapComparisonPage,
        }),
      },
      {
        path: "performance",
        lazy: async () => ({
          Component: (await import("../features/performance/PerformancePage"))
            .PerformancePage,
        }),
      },
      {
        path: "trends",
        lazy: async () => ({
          Component: (await import("../features/trends/TrendsPage")).TrendsPage,
        }),
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
