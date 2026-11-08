import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import { Toaster } from "sonner";

import { ComposerProvider } from "./features/composer/ComposerProvider";
import { LandingPage } from "./features/landing/LandingPage";
import { ProfileProvider } from "./features/profile/ProfileProvider";
import { RoadmapPage } from "./features/roadmap/RoadmapPage";
import { AppShell } from "./layout/AppShell";
import { NotFound } from "./layout/NotFound";
import { createQueryClient } from "./lib/queryClient";

/** Providers that need the router (the composer links to ideas). */
function RoutedProviders() {
  return (
    <ComposerProvider>
      <Outlet />
    </ComposerProvider>
  );
}

const routes = [
  {
    element: <RoutedProviders />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <LandingPage /> },
          { path: "/i/:id", element: <LandingPage /> },
          { path: "/board", element: <LandingPage /> },
          { path: "/roadmap", element: <RoadmapPage /> },
          { path: "/roadmap/i/:id", element: <RoadmapPage /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(routes);
const queryClient = createQueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <ProfileProvider>
          <RouterProvider router={router} />
        </ProfileProvider>
        <Toaster
          position="bottom-center"
          toastOptions={{
            className:
              "!rounded-[6px] !text-[15px] !font-sans !bg-snow !text-night !border-0 !shadow-2xl",
          }}
        />
      </MotionConfig>
    </QueryClientProvider>
  );
}
