import { createBrowserRouter } from "react-router";
import { AppLayout } from "../components/layout/AppLayout";
import { NotFoundPage, RouteErrorPage } from "./RouteErrorPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { RoundPage } from "../features/round/RoundPage";
import { StandingsPage } from "../features/standings/StandingsPage";
import { DriversPage } from "../features/driver/DriversPage";
import { DriverPage } from "../features/driver/DriverPage";
import { ConstructorsPage } from "../features/constructor/ConstructorsPage";
import { ConstructorPage } from "../features/constructor/ConstructorPage";
import { TracksPage } from "../features/tracks/TracksPage";
import { TrackDetailsPage } from "../features/tracks/TrackDetailsPage";
import { ReplayPickerPage } from "../features/replay/ReplayPickerPage";
import { ReplayPage } from "../features/replay/ReplayPage";
import {
  ComparePage,
  LapComparisonPage,
} from "../features/compare/ComparePage";
import { PerformancePage } from "../features/performance/PerformancePage";
import { TrendsPage } from "../features/trends/TrendsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        index: true,
        Component: DashboardPage,
      },
      {
        path: "calendar",
        Component: CalendarPage,
      },
      {
        path: "rounds/:meetingKey",
        Component: RoundPage,
      },
      {
        path: "standings",
        Component: StandingsPage,
      },
      {
        path: "drivers",
        Component: DriversPage,
      },
      {
        path: "drivers/:year/:driverNumber",
        Component: DriverPage,
      },
      {
        path: "constructors",
        Component: ConstructorsPage,
      },
      {
        path: "constructors/:year/:teamSlug",
        Component: ConstructorPage,
      },
      {
        path: "tracks",
        Component: TracksPage,
      },
      {
        path: "tracks/:slug",
        Component: TrackDetailsPage,
      },
      {
        path: "replay",
        Component: ReplayPickerPage,
      },
      {
        path: "replay/:sessionKey",
        Component: ReplayPage,
      },
      {
        path: "compare",
        Component: ComparePage,
      },
      {
        path: "compare/laps",
        Component: LapComparisonPage,
      },
      {
        path: "performance",
        Component: PerformancePage,
      },
      {
        path: "trends",
        Component: TrendsPage,
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
