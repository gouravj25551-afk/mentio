// A template re-mounts on every navigation, so this gives each page a short, CSS-only entrance.
// Reduced motion is handled by the global media query in globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
