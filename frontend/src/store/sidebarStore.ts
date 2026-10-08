import { SidebarMenuItemType } from '@briggs-walker/briggsdesignsystem';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SidebarState {
    sidebarItems: SidebarMenuItemType[];
    setSidebarItems: (sidebarItems: SidebarMenuItemType[]) => void;
    clearSidebarItems: () => void;
}

export const useSidebarStore = create<SidebarState>()(
    persist(
        (set) => ({
            sidebarItems: [],
            setSidebarItems: (sidebarItems) => set((_) => ({ sidebarItems: sidebarItems })),
            clearSidebarItems: () => set((_) => ({ sidebarItems: [] })),
        }),
        {
            name: 'sidebar-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);