"use client";

import { Analytics } from "@vercel/analytics/next";

export default function AppAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (event.url.includes("/adm")) {
          return null;
        }
        return event;
      }}
    />
  );
}
