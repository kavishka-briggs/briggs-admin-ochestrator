import { SidebarMenuItemType } from '@briggs-walker/briggsdesignsystem';

/**
 * Derives the active menu-item ID based on the current path.
 * Sub-items take precedence when a parent shares the same href.
 */
export const getActiveMenuItemId = (
    items: SidebarMenuItemType[],
    path: string,
): string | number => {
    for (const menuItem of items) {
        if (menuItem.subMenu) {
            const found = menuItem.subMenu.find((subItem) => subItem.href === path);
            if (found) {
                return found.id;
            }
        }
        if (menuItem.href === path) {
            return menuItem.id;
        }
    }
    return '';
};
