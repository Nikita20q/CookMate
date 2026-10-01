export interface NavigationItem {
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}
