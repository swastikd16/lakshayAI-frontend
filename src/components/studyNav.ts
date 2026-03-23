export type StudyRouteKey =
  | "dashboard"
  | "planner"
  | "adaptive-practice"
  | "video-notes"
  | "doubt-solver"
  | "revision"
  | "analytics"
  | "profile"
  | "adaptive-review";

export type StudyNavItem = {
  key: StudyRouteKey;
  label: string;
  icon: string;
  href: string;
  mobile?: boolean;
};

export const studyNavItems: StudyNavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", href: "#/dashboard", mobile: true },
  { key: "planner", label: "Study Planner", icon: "calendar_today", href: "#/planner", mobile: true },
  { key: "adaptive-practice", label: "Adaptive Practice", icon: "fitness_center", href: "#/adaptive-practice", mobile: true },
  { key: "video-notes", label: "Video Notes", icon: "play_lesson", href: "#/video-notes", mobile: true },
  { key: "doubt-solver", label: "Doubt Solver", icon: "quiz", href: "#/doubt-solver", mobile: true },
  { key: "revision", label: "Revision", icon: "history", href: "#/revision", mobile: false },
  { key: "analytics", label: "Analytics", icon: "insights", href: "#/analytics", mobile: true },
  { key: "profile", label: "Profile", icon: "person", href: "#/profile", mobile: true },
  { key: "adaptive-review", label: "Adaptive Review", icon: "fact_check", href: "#/adaptive-review", mobile: false }
];

export const studyPrimaryRoutes = studyNavItems.filter((item) => item.mobile !== false && item.key !== "adaptive-review");
