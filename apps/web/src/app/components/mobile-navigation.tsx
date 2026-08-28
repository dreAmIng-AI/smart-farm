export type AppSection = "home" | "record" | "information" | "farm";

type MobileNavigationProps = {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
};

const navigationItems: Array<{ label: string; section: AppSection }> = [
  { label: "오늘", section: "home" },
  { label: "기록", section: "record" },
  { label: "정보", section: "information" },
  { label: "농장", section: "farm" },
];

export function MobileNavigation({ activeSection, onNavigate }: MobileNavigationProps) {
  return (
    <nav className="mobile-navigation" aria-label="주요 메뉴">
      {navigationItems.map((item) => (
        <button
          aria-current={activeSection === item.section ? "page" : undefined}
          className={activeSection === item.section ? "mobile-navigation-active" : undefined}
          key={item.section}
          onClick={() => onNavigate(item.section)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
