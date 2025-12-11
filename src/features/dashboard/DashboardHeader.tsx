'use client';

import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useLocale } from 'next-intl';

import { ActiveLink } from '@/components/ActiveLink';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { ToggleMenuButton } from '@/components/ToggleMenuButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { HintToggle } from '@/features/hints';
import { NotificationCenter } from '@/features/notifications';
import { GlobalSearch } from '@/features/search';
import { useUserRole } from '@/hooks/useUserRole';
import { Logo } from '@/templates/Logo';
import { getI18nPath } from '@/utils/Helpers';

export const DashboardHeader = (props: {
  menu: {
    href: string;
    label: string;
    adminOnly?: boolean;
  }[];
}) => {
  const locale = useLocale();
  const { isAdmin, isLoading } = useUserRole();

  // Filter menu items based on role
  const filteredMenu = isLoading
    ? props.menu.filter(item => !item.adminOnly)
    : props.menu.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      <div className="flex items-center">
        <Link href="/dashboard" className="max-sm:hidden">
          <Logo />
        </Link>

        <svg
          className="size-8 stroke-muted-foreground max-sm:hidden"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" />
          <path d="M17 5 7 19" />
        </svg>

        <OrganizationSwitcher
          organizationProfileMode="navigation"
          organizationProfileUrl={getI18nPath(
            '/dashboard/organization-profile',
            locale,
          )}
          afterCreateOrganizationUrl="/dashboard"
          hidePersonal
          skipInvitationScreen
          appearance={{
            elements: {
              organizationSwitcherTrigger: 'max-w-28 sm:max-w-52',
              footer: 'hidden',
              footerAction: 'hidden',
              footerPages: 'hidden',
            },
          }}
        />

        <nav className="ml-3 max-lg:hidden">
          <ul className="flex flex-row items-center gap-x-3 text-lg font-medium [&_a:hover]:opacity-100 [&_a]:opacity-75">
            {filteredMenu.map(item => (
              <li key={item.href}>
                <ActiveLink href={item.href}>{item.label}</ActiveLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div>
        <ul className="flex items-center gap-x-1 sm:gap-x-1.5 [&_li[data-fade]:hover]:opacity-100 [&_li[data-fade]]:opacity-60">
          {/* Mobile: Only show hamburger menu for navigation */}
          <li data-fade className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ToggleMenuButton />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {filteredMenu.map(item => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
          </li>

          {/* Global Search - hidden on smallest mobile */}
          <li className="hidden xs:block sm:block">
            <GlobalSearch />
          </li>

          {/* Hints toggle - hidden on mobile, accessible via More page */}
          <li data-fade className="hidden sm:block">
            <HintToggle />
          </li>

          {/* Notifications - always visible (important for UX) */}
          <li data-fade>
            <NotificationCenter />
          </li>

          {/* Language switcher - hidden on mobile, accessible via More page */}
          <li data-fade className="hidden sm:block">
            <LocaleSwitcher />
          </li>

          {/* Separator - hidden on mobile for cleaner look */}
          <li className="hidden sm:block">
            <Separator orientation="vertical" className="h-4" />
          </li>

          {/* User profile - always visible */}
          <li>
            <UserButton
              userProfileMode="navigation"
              userProfileUrl="/dashboard/user-profile"
              appearance={{
                elements: {
                  rootBox: 'px-1.5 py-1.5 sm:px-2',
                  footer: 'hidden',
                  footerAction: 'hidden',
                  footerPages: 'hidden',
                },
              }}
            />
          </li>
        </ul>
      </div>
    </>
  );
};
