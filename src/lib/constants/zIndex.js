/**
 * Single source of truth for the app's overlay stacking order. Every
 * floating UI element (dropdown, drawer, modal, command palette) should
 * pull its z-index from here rather than picking its own number — that's
 * how two unrelated components ended up silently fighting over "z-50"
 * while nested three stacking contexts apart, which no z-index value
 * could actually fix (see FloatingPanel.js for why).
 */
export const Z_INDEX = {
  stickyHeader: 40,
  dropdown: 900, // small inline menus that stay within a portal-less local context (rare — prefer FloatingPanel)
  overlayMenu: 1000, // notification drawer, user menu / role switcher, quick create
  modal: 1100, // dialogs, confirmation modals, chart fullscreen
  commandPalette: 1200, // always on top of everything else
};
