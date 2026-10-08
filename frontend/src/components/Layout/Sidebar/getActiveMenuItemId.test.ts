import { describe, it, expect } from 'vitest';
import { SidebarMenuItemType } from '@briggs-walker/briggsdesignsystem';
import { getActiveMenuItemId } from './getActiveMenuItemId';

const missionControlMenu: SidebarMenuItemType[] = [
    {
        id: 7,
        label: 'Mission Control',
        icon: 'chart',
        href: '/mission-control/overview',
        subMenu: [
            { id: 7.1, label: 'Overview', href: '/mission-control/overview' },
            { id: 7.2, label: 'Office', href: '/mission-control/office' },
            { id: 7.3, label: 'Account', href: '/mission-control/account' },
            { id: 7.4, label: 'Recruitment', href: '/mission-control/recruitment' },
        ],
    },
];

describe('getActiveMenuItemId', () => {
    it('prefers a sub-menu item when parent and child share the same href', () => {
        expect(getActiveMenuItemId(missionControlMenu, '/mission-control/overview')).toBe(7.1);
    });

    it('returns the sub-menu item id for other Mission Control views', () => {
        expect(getActiveMenuItemId(missionControlMenu, '/mission-control/office')).toBe(7.2);
        expect(getActiveMenuItemId(missionControlMenu, '/mission-control/account')).toBe(7.3);
        expect(getActiveMenuItemId(missionControlMenu, '/mission-control/recruitment')).toBe(7.4);
    });

    it('returns a top-level item id when there is no sub-menu', () => {
        const items: SidebarMenuItemType[] = [
            { id: 2, label: 'Dashboard', icon: 'home', href: '/dashboard' },
        ];
        expect(getActiveMenuItemId(items, '/dashboard')).toBe(2);
    });

    it('returns empty string when no menu item matches', () => {
        expect(getActiveMenuItemId(missionControlMenu, '/unknown')).toBe('');
    });
});
