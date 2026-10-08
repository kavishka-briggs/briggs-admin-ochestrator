import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
    Sidebar,
    SidebarMobile,
} from '@briggs-walker/briggsdesignsystem';
import { useUserStore } from '../../../store/userStore';
import useDynamicSidebarMenu from '../../../hooks/useDynamicSidebarMenu.hooks';
import { dispatch } from '@briggs-walker/briggs-logging';
import { getActiveMenuItemId } from './getActiveMenuItemId';

const SidebarContainer: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, clearUser } = useUserStore();
    const [isMobileMenuView, setIsMobileMenuView] = useState(false);

    // Pull the menu items and profile sub-menu from the custom hook
    const { menuItems, profileSubMenuLinks } = useDynamicSidebarMenu();

    // Track which item is active
    const [activeItemId, setActiveItemId] = useState<string | number>(
        getActiveMenuItemId(menuItems, location.pathname)
    );

    // Update active item if the path changes
    useEffect(() => {
        setActiveItemId(getActiveMenuItemId(menuItems, location.pathname));
    }, [location.pathname, menuItems]);

    /**
     * Handles clicking on items from the profile sub-menu (e.g. logout).
     */
    const handleProfileSubMenuClick = (id: number | string) => {
        if (id === 'logout') {
            window.dispatchEvent(new CustomEvent('bw-auth-logout', { detail: 'Data from Host' }));
            localStorage.clear();
            clearUser();
        }
    };

    /**
     * Handles navigating from side menu or sub-menu items.
     */
    const navigateToRoute = (id: number | string): void => {
        setActiveItemId(id);

        // Attempt to find route among top-level items
        let route = menuItems.find((item) => item.id === id)?.href;

        // If not found, search sub-items
        if (!route) {
            for (const menuItem of menuItems) {
                const subItem = menuItem.subMenu?.find((sub) => sub.id === id);
                if (subItem) {
                    route = subItem.href;
                    break;
                }
            }
        }

        if (route) {
            dispatch("page_view",
                {
                    from: window.location.href,
                    to: route
                });
            navigate(route);
        }
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="w-[300px] max-[800px]:hidden h-[100dvh]">
                <Sidebar
                    activeItemId={activeItemId}
                    classNames="h-full"
                    menuItems={menuItems}
                    userName={user?.displayName ?? ''}
                    userEmail={user?.email ?? ''}
                    sidebarProfileSubMenuLinks={profileSubMenuLinks}
                    onMenuItemClick={navigateToRoute}
                    onProfileSubMenuItemClick={handleProfileSubMenuClick}
                />
            </div>

            {/* Mobile Sidebar */}
            <div
                className={`min-[799px]:hidden max-[800px]:flex z-[100] fixed left-0 top-0 w-screen ${isMobileMenuView ? 'h-[100dvh]' : 'h-fit'
                    }`}
            >
                <SidebarMobile
                    activeItemId={activeItemId}
                    menuItems={menuItems}
                    userName={user?.displayName ?? ''}
                    userEmail={user?.email ?? ''}
                    sidebarProfileSubMenuLinks={profileSubMenuLinks}
                    onMenuItemClick={navigateToRoute}
                    onProfileSubMenuItemClick={handleProfileSubMenuClick}
                    onMobileMenuTrigger={(isVisible) => setIsMobileMenuView(isVisible)}
                />
            </div>
        </>
    );
};

export default SidebarContainer;
