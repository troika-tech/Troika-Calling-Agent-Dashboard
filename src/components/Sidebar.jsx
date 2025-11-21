import React, { useState, useEffect } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { 
  
  FaHome, 
  
  FaBullseye, 
  
  FaChartLine, 
  
  FaCog,
  
  FaBars,
  
  FaTimes,
  
  
  FaPhone,
  FaList,
  FaFileDownload,
  FaFileAlt,
  FaSignal
} from 'react-icons/fa';



const Sidebar = ({ darkMode, toggleDarkMode, isOpen = false, onClose }) => {

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

          w-full lg:w-72

          bg-white dark:bg-gray-800

          border-r border-gray-200 dark:border-gray-700

          lg:translate-x-0

          transition-transform duration-300 ease-in-out

          flex flex-col

          shadow-lg lg:shadow-none

          overflow-y-auto

        `}

      >

        {/* Header */}

        <div className="p-6 border-b border-gray-200 dark:border-gray-700">

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">

            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">

              <FaPhone className="text-white" size={20} />

            </div>

            <div className="hidden lg:block">

              <h1 className="text-xl font-bold text-gray-900 dark:text-white">

                AI Calling Agent

              </h1>

              <p className="text-xs text-gray-500 dark:text-gray-400">

                Dashboard

              </p>

            </div>

            {!collapsed && (

              <div className="lg:hidden">

                <h1 className="text-xl font-bold text-gray-900 dark:text-white">

                  AI Calling Agent

                </h1>

                <p className="text-xs text-gray-500 dark:text-gray-400">

                  Dashboard

                </p>

              </div>

            )}

            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => {
                setCollapsed(true);
                if (onClose) onClose();
              }}
              className="lg:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close sidebar"
            >
              <FaTimes size={20} />
            </button>
          </div>

        </div>



        {/* Navigation Menu */}

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">

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

                  flex items-center space-x-3 px-4 py-3 rounded-lg

                  transition-all duration-200

                  ${

                    active

                      ? 'bg-primary-500 text-white shadow-md'

                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'

                  }

                `}

              >

                <Icon size={20} />

                <span className="font-medium">{item.label}</span>

              </Link>

            );

          })}

        </nav>



        {/* Footer */}

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <div className="text-center">
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Powered by <span className="font-semibold text-primary-600 dark:text-primary-400">Troika Tech</span>
            </p>
          </div>
        </div>

      </aside>



      {/* Overlay for mobile */}

      {!collapsed && (

        <div

          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"

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




