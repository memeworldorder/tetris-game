export type NavigationTab = "game" | "stats" | "leaderboard" | "profile"

export interface NavigationState {
  activeTab: NavigationTab
  setActiveTab: (tab: NavigationTab) => void
}
