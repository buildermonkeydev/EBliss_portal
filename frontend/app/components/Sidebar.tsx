"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaRocket,
  FaServer,
  FaKey,
  FaShieldAlt,
  FaFileInvoice,
  FaUser,
  FaChevronDown,
  FaFileAlt,
  FaLock,
  FaHeadset,
  FaBars,
  FaTimes,
  FaMicrochip,
  FaCloud,
  FaDatabase,
  FaNetworkWired,
  FaChartLine,
} from "react-icons/fa";
import { HiOutlineCube } from "react-icons/hi2";
import { BsGrid1X2Fill } from "react-icons/bs";

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openInfra, setOpenInfra] = useState(true);
  const [openBilling, setOpenBilling] = useState(true);
  const [openSecurity, setOpenSecurity] = useState(true);
  const [openVM, setOpenVM] = useState(true);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on window resize if screen becomes larger
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Logo Section */}


<Link href="/dashboard" className="block">
  <div className="mb-8 flex flex-col items-center cursor-pointer">
    <div className="relative w-32 h-16 mb-2">
      <Image
        src="/ChatGPT Image Feb 27, 2026, 10_44_36 AM.png"
        alt="eBliss Logo"
        width={500}
        height={100}
        className="object-contain"
        priority
      />
    </div>

    <div className="h-px w-12 bg-gradient-to-r from-transparent via-indigo-500 to-transparent my-2" />

    <p className="text-xs text-slate-500 italic">
      We Value Our Relationship
    </p>
  </div>
</Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        <MenuItem
          href="/dashboard"
          icon={<FaHome />}
          label="Dashboard"
          active={pathname === "/dashboard"}
        />

        {/* VM Section */}
        <DropdownMenu
          icon={<FaRocket />}
          label="Virtual Machines"
          open={openVM}
          toggle={() => setOpenVM(!openVM)}
        >
          <SubItem
            href="/hourly-compute"
            icon={<HiOutlineCube  />}
            label="Hourly Compute"
            active={pathname === "/hourly-compute"}
          />
          <SubItem
            href="/monthly-rentals"
            icon={<FaServer />}
            label="Monthly Rentals"
            active={pathname === "/monthly-rentals"}
          />
          <SubItem
            href="/vps"
            icon={<FaCloud />}
            label="VPS Instances"
            active={pathname === "/vps"}
          />
        </DropdownMenu>

        {/* Infrastructure */}
        <DropdownMenu
          icon={<FaNetworkWired />}
          label="Infrastructure"
          open={openInfra}
          toggle={() => setOpenInfra(!openInfra)}
        >
          <SubItem
            href="/firewall"
            icon={<FaShieldAlt />}
            label="Firewall Rules"
            active={pathname === "/firewall"}
          />
          <SubItem
            href="/ssh-keys"
            icon={<FaKey />}
            label="SSH Keys"
            active={pathname === "/ssh-keys"}
          />
          <SubItem
            href="/ipam"
            icon={<FaNetworkWired />}
            label="IPAM (IP Address Management)"
            active={pathname === "/ipam"}
          />
        </DropdownMenu>

        {/* Monitoring */}
        {/* <MenuItem
          href="/monitoring"
          icon={<FaChartLine />}
          label="Monitoring"
          active={pathname === "/monitoring"}
        /> */}

        {/* Billing */}
        <DropdownMenu
          icon={<FaFileInvoice />}
          label="Billing"
          open={openBilling}
          toggle={() => setOpenBilling(!openBilling)}
        >
          <SubItem
            href="/billing"
            icon={<FaFileInvoice />}
            label="Account Billing"
            active={pathname === "/billing"}
          />
          <SubItem
            href="/invoices"
            icon={<FaFileAlt />}
            label="Invoices"
            active={pathname === "/invoices"}
          />
          <SubItem
            href="/transactions"
            icon={<FaDatabase />}
            label="Transactions"
            active={pathname === "/transactions"}
          />
        </DropdownMenu>

        {/* Security */}
        <DropdownMenu
          icon={<FaLock />}
          label="Security"
          open={openSecurity}
          toggle={() => setOpenSecurity(!openSecurity)}
        >
          <SubItem
            href="/activity-logs"
            icon={<FaFileAlt />}
            label="Activity Logs"
            active={pathname === "/activity-logs"}
          />
          <SubItem
            href="/fa-security"
            icon={<FaLock />}
            label="2FA Security"
            active={pathname === "/fa-security"}
          />
        </DropdownMenu>

        <MenuItem
          href="/dedicated-server"
          icon={<FaServer />}
          label="Dedicated Servers"
          active={pathname === "/dedicated-server"}
        />
<MenuItem
  href="/colocation"
  icon={<FaNetworkWired />}
  label="Colocation Servers"
  active={pathname === "/colocation"}
/>
        <MenuItem
          href="/support"
          icon={<FaHeadset />}
          label="Support"
          active={pathname === "/support"}
        />

        <MenuItem
          href="/account"
          icon={<FaUser />}
          label="Account"
          active={pathname === "/account"}
        />
      </nav>

      {/* Footer */}
      <div className="pt-6 mt-6 border-t border-slate-800">
        <div className="text-center">
          <p className="text-xs text-slate-600">© 2026 eBliss</p>
          <p className="text-xs text-slate-600 mt-1">Building Trust Since 2024</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-all duration-300 shadow-lg"
      >
        {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:sticky top-0 left-0 h-screen bg-gradient-to-b from-slate-900 to-slate-950 
          border-r border-slate-800 shadow-2xl transition-all duration-300 ease-in-out z-50
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-72 lg:w-64 xl:w-72
        `}
      >
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="p-5">
            {sidebarContent}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </>
  );
}

function MenuItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`
          group flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200
          ${active
            ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 border-l-2 border-indigo-500"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
          }
        `}
      >
        <span className={`text-lg transition-transform group-hover:scale-110 ${active ? 'text-indigo-400' : ''}`}>
          {icon}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </Link>
  );
}

function DropdownMenu({
  icon,
  label,
  open,
  toggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  toggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        onClick={toggle}
        className="flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg transition-transform group-hover:scale-110">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <FaChevronDown
          className={`text-xs transition-all duration-200 ${
            open ? "rotate-180 text-indigo-400" : ""
          }`}
        />
      </div>
      <div
        className={`
          ml-9 space-y-1 mt-1 overflow-hidden transition-all duration-300
          ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        {children}
      </div>
    </div>
  );
}

function SubItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200
          ${active
            ? "bg-slate-800/80 text-indigo-400 border-l-2 border-indigo-500"
            : "text-slate-500 hover:bg-slate-800/30 hover:text-slate-300"
          }
        `}
      >
        <span className="text-xs">{icon}</span>
        <span>{label}</span>
      </div>
    </Link>
  );
}