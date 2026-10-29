'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { isSectionAvailable, modeForSection, NAV_SECTIONS, sectionFromPathname, type NavSectionId } from '@/lib/navSections';
import LogoMark from '@/components/LogoMark';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { capturePoster } from '@/lib/projectPoster';
import { preloadMockupProject } from '@/lib/mockupPreload';
import { AddIcon, BoardIcon, LibraryIcon, MockupIcon, ProjectsIcon, ThemeGlyph, ThreeDIcon, WebIcon } from './EditorIcons';

const ICONS: Record<NavSectionId, React.ReactNode> = {
  projects: <ProjectsIcon />,
  library: <LibraryIcon />,
  mockup: <MockupIcon />,
  '3d': <ThreeDIcon />,
  web: <WebIcon />,
  board: <BoardIcon />,
};

export default function IconRail() {
  // The URL owns the active section (EditorShell mirrors it into the store for
  // the panels). Reading the pathname here means back/forward and pasted links
  // light up the right rail item without a second source of truth.
  const pathname = usePathname();
  const isMedia = pathname === '/media';
  const active = sectionFromPathname(pathname);
  const router = useRouter();
  const theme = useUIStore((s) => s.theme);
  const setNav = useUIStore((s) => s.setNav);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const createProject = useProjectStore((s) => s.create);
  const projectCount = useProjectStore((s) => s.projects.length);

  // Library and Mockup own different project documents. Hydrate the destination
  // before swapping the panel/stage so Mockup mounts once with its real model,
  // rather than mounting empty and restarting after EditorShell's effect.
  const leaveSection = (next: NavSectionId) => {
    const projects = useProjectStore.getState();
    if (next === 'library' || next === 'mockup') {
      const wanted = modeForSection(next);
      const current = projects.projects.find((item) => item.id === projects.activeId);
      if (current?.mode !== wanted) {
        const destination = projects.projects.find((item) => item.mode === wanted);
        if (destination) projects.open(destination.id);
        else projects.create(`Project ${projects.projects.length + 1}`, wanted);
      }
    }
    // Posters only need to be current when the user is about to see the project
    // cards. Capturing on every rail hop forced a full synchronous render and
    // was the main Library → Mockup delay.
    if (next === 'projects' && next !== active) capturePoster(projects.activeId);
    setNav(next);
  };

  const warmMockup = () => {
    const project = useProjectStore.getState().projects.find((item) => item.mode === 'mockup');
    void preloadMockupProject(project?.id);
  };

  // An ACTION, not a nav section — so it never takes the active state. The +
  // icon at the top of the rail now creates what it looks like it creates.
  const newProject = () => {
    createProject(`Project ${projectCount + 1}`, modeForSection(active));
    setNav('projects');
    router.push('/projects');
  };

  return (
    <aside className="card rail">
      <div className="rail-top">
        <div className="rail-logo-wrap">
          <div className="rail-logo">
            <LogoMark />
          </div>
        </div>
        <button className="rail-item rail-action" onClick={newProject} title="Create a new project">
          <span className="rail-ico">
            <AddIcon />
          </span>
          <span className="rail-label">New</span>
        </button>
        {NAV_SECTIONS.filter((n) => !['mockup', '3d', 'web'].includes(n.id)).map((n) => (
          isSectionAvailable(n.id) ? (
            <Link
              key={n.id}
              href={n.href}
              // Setting the store on click as well as on the URL change keeps the
              // panel swap on the same frame as the click: the mirror in
              // EditorShell is an effect, which lands a frame later.
              onClick={() => leaveSection(n.id)}
              onPointerEnter={n.id === 'mockup' ? warmMockup : undefined}
              onFocus={n.id === 'mockup' ? warmMockup : undefined}
              aria-current={!isMedia && active === n.id ? 'page' : undefined}
              className={`rail-item ${!isMedia && active === n.id ? 'active' : ''}`}
            >
              <span className="rail-ico">{ICONS[n.id]}</span>
              <span className="rail-label">{n.label}</span>
            </Link>
          ) : (
            // A gated section still shows in the rail, greyed and inert: the work
            // exists and saying so is honest, but the route is closed (lib/navSections
            // isSectionAvailable) so it must not be a link — a link would navigate and
            // land on the Library, which reads as a bug rather than as "not yet".
            // Not a disabled <button> either: a button would still take focus on
            // click in some browsers, and there is nothing to press.
            <span
              key={n.id}
              aria-disabled="true"
              title={`${n.label} is still being built — not available in this build`}
              className="rail-item rail-locked"
            >
              <span className="rail-ico">{ICONS[n.id]}</span>
              <span className="rail-label">{n.label}</span>
            </span>
          )
        ))}
      </div>
      <div className="rail-bottom">
        <Link href="/media" className={`rail-item ${isMedia ? 'active' : ''}`} aria-current={isMedia ? 'page' : undefined} title="Media library">
          <span className="rail-ico" aria-hidden>▦</span>
          <span className="rail-label">Media</span>
        </Link>
        <button
          className="rail-item rail-theme"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          <span className="rail-ico">
            {/* One glyph that morphs — a ternary swap has nothing to animate.
                Which face shows is decided in CSS, off :root[data-theme]. */}
            <ThemeGlyph />
          </span>
          <span className="rail-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </aside>
  );
}
