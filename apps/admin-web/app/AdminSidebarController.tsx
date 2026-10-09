'use client';

import { useEffect } from 'react';

function getMenuButton() {
  return document.querySelector<HTMLButtonElement>('button[aria-label="Abrir menu"]');
}

function setExpanded(isOpen: boolean) {
  const menuButton = getMenuButton();
  menuButton?.setAttribute('aria-expanded', String(isOpen));
}

export default function AdminSidebarController() {
  useEffect(() => {
    const closeSidebar = () => {
      document.body.classList.remove('admin-sidebar-open');
      setExpanded(false);
      window.dispatchEvent(new Event('adminSidebarClosed'));
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target || !document.querySelector('.admin-shell')) {
        return;
      }

      const sidebar = target.closest('.sidebar');
      const menuButton = target.closest('button[aria-label="Abrir menu"]');
      const sidebarLink = target.closest<HTMLElement>('.sidebar a.nav-item, .sidebar a.nav-subitem');
      const isOpen = document.body.classList.contains('admin-sidebar-open');

      if (menuButton) {
        return;
      }

      if (sidebarLink) {
        closeSidebar();
        return;
      }

      if (isOpen && !sidebar) {
        event.preventDefault();
        event.stopPropagation();
        closeSidebar();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    setExpanded(false);
    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      closeSidebar();
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
