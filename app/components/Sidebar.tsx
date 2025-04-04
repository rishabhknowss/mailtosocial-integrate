import React, { useState } from 'react';
import { Profile } from './Profile'; // Import the Profile component
import { UserIcon } from './ui/UserIcon';
import { SettingsGearIcon } from './ui/Settings';
import { FilePenLineIcon } from './ui/EditPost';
import { CalendarDaysIcon } from './ui/Calender';
import { ChartSplineIcon } from './ui/Analytics';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClockIcon } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  isModal?: boolean;
  onClick?: () => void;
  comp?: React.ReactNode;
}

export function Sidebar() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const pathname = usePathname();

  const navigation: NavItem[] = [
    { name: 'Dashboard' , href: '/' , comp: <FilePenLineIcon size={25} />},
    { name: 'Calendar' , href: '/calendar' , comp: <CalendarDaysIcon size={25} />},
    { name: 'Scheduled Posts', href: '/schedule', comp: <ClockIcon size={25} /> },
    { name: 'Analytics' , href: '/analytics' , comp: <ChartSplineIcon size={25} />},
    { 
      name: 'Profile', 
      href: '#',
      isModal: true,
      onClick: () => setIsProfileModalOpen(true),
      comp: <UserIcon size={25} />
    },
    { name: 'Settings', href: '/settings' , comp : <SettingsGearIcon size={25} />}
  ];

  return (
    <>
      <aside className="fixed left-4 top-0 h-screen pt-36 z-10 bg-transparent">
        <nav className="flex flex-col items-center justify-center w-[26px] gap-[23px] mt-8">
          {navigation.map((item) => (
            item.isModal ? (
              <button
                key={item.name}
                onClick={item.onClick}
                className="cursor-pointer flex items-center justify-center transition-colors duration-200 text-gray-400 hover:text-gray-200"
                title={item.name}
              >
                {item.comp}
              </button>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={`flex items-center justify-center transition-colors duration-200 ${
                  pathname === item.href ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {item.comp}
              </Link>
            )
          ))}
        </nav>
      </aside>

      {/* Render the Profile modal */}
      <Profile 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </>
  );
}