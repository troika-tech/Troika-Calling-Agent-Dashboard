import React, { useState, useEffect } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { 
  
  FaHome, 
  
  FaBullseye, 
  
  FaChartLine, 
  
  FaCog,
  
  FaBars,
  
  FaTimes,
  
  FaList,
  FaFileDownload,
  FaFileAlt,
  FaSignal
} from 'react-icons/fa';



const Sidebar = ({ isOpen = false, onClose }) => {

  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const location = useLocation();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setCollapsed(false); // Always show on desktop
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with parent state on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(!isOpen);
    }
  }, [isOpen, isMobile]);



  const menuItems = [
  
    { path: '/dashboard', icon: FaHome, label: 'Dashboard' },
  
    { path: '/campaigns', icon: FaBullseye, label: 'Campaigns' },
  
    { path: '/analytics', icon: FaChartLine, label: 'Analytics' },
  
    { path: '/call-logs', icon: FaList, label: 'Call Logs' },
    { path: '/live-status', icon: FaSignal, label: 'Live Status' },
    { path: '/credit-history', icon: FaFileDownload, label: 'Credit History' },
    { path: '/delivery-reports', icon: FaFileAlt, label: 'Delivery Reports' },
  
  ];



  const isActive = (path) => location.pathname === path;



  return (

    <>

      {/* Sidebar */}

      <aside

        style={{

          transform: isMobile && collapsed ? 'translateX(-100%)' : 'translateX(0)',

        }}

        className={`

          fixed lg:static top-0 bottom-0 left-0 z-[60] lg:z-40

          w-full lg:w-64

          bg-white/90 backdrop-blur-xl

          border-r border-zinc-200

          lg:translate-x-0

          transition-transform duration-300 ease-in-out

          flex flex-col

          shadow-lg lg:shadow-none

          overflow-y-auto

        `}

      >

        {/* Header */}

        <div className="flex items-center gap-3 px-6 h-16 border-b border-zinc-200">

          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden">
            <img 
              src="/images/dashboard-logo.png" 
              alt="Dashboard Logo" 
              className="h-full w-full object-contain"
            />
          </div>
          <div className="hidden lg:block">
            <div className="text-sm font-semibold tracking-tight text-zinc-900">AI Calling Agent</div>
            <div className="text-xs text-zinc-500">Dashboard</div>
          </div>
          {!collapsed && (
            <div className="lg:hidden">
              <div className="text-sm font-semibold tracking-tight text-zinc-900">AI Calling Agent</div>
              <div className="text-xs text-zinc-500">Operations Dashboard</div>
            </div>
          )}
          {/* Close button for mobile */}
          <button
            onClick={() => {
              setCollapsed(true);
              if (onClose) onClose();
            }}
            className="lg:hidden ml-auto p-2 rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close sidebar"
          >
            <FaTimes size={20} />
          </button>
        </div>



        {/* Navigation Menu */}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">

          {menuItems.map((item) => {

            const Icon = item.icon;

            const active = isActive(item.path);

            return (

              <Link

                key={item.path}

                to={item.path}

                onClick={() => {

                  // Only collapse on mobile

                  if (isMobile) {

                    setCollapsed(true);

                    if (onClose) onClose();

                  }

                }}

                className={`

                  group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all

                  ${

                    active

                      ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/20'

                      : 'hover:bg-emerald-50 hover:text-emerald-700 text-zinc-700'

                  }

                `}

              >

                <Icon className="h-4 w-4" />

                <span>{item.label}</span>

              </Link>

            );

          })}

        </nav>



        {/* Footer */}

        <div className="px-4 py-4 border-t border-zinc-100 text-xs text-zinc-500 flex items-center justify-center gap-2 mt-auto">
          <span className="text-zinc-400">Powered by Troika Tech</span>
        </div>

      </aside>



      {/* Overlay for mobile */}

      {!collapsed && isMobile && (

        <div

          className="lg:hidden fixed inset-0 bg-black/40 z-30"

          onClick={() => {
            setCollapsed(true);
            if (onClose) onClose();
          }}

        />

      )}

    </>

  );

};



export default Sidebar;




