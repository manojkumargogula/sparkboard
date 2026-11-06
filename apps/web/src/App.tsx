import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Toaster } from "sonner";

import { createQueryClient } from "./lib/queryClient";
import { FeedPage } from "./features/feed/FeedPage";
import { ProfileProvider } from "./features/profile/ProfileProvider";
import { RoadmapPage } from "./features/roadmap/RoadmapPage";
import { AppShell } from "./layout/AppShell";
import { NotFound } from "./layout/NotFound";

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <FeedPage /> },
      { path: "/i/:id", element: <FeedPage /> },
      { path: "/roadmap", element: <RoadmapPage /> },
      { path: "/roadmap/i/:id", element: <RoadmapPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

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
            className: "!rounded-2xl !text-base !font-sans !bg-ink !text-canvas !border-0",
          }}
          offset={96}
        />
      </MotionConfig>
    </QueryClientProvider>
  );
}
