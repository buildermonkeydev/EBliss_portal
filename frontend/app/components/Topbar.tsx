"use client";

import { useState, useEffect, useRef } from "react";
import { 
  FaSearch, 
  FaBell, 
  FaUser, 
  FaCog, 
  FaSignOutAlt, 
  FaMoon, 
  FaSun,
  FaUserCircle,
  FaEnvelope,
  FaQuestionCircle,
  FaSpinner,
  FaCreditCard,
  FaServer,
  FaShieldAlt,
  FaChartLine,
  FaChevronRight,
  FaMicrochip,
  FaHdd,
  FaGlobe,
  FaFileAlt,
  FaTag
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

// Search Result Item Component
function SearchResultItem({ result, onClose }: { result: SearchResultType; onClose: () => void }) {
  const router = useRouter();
  
  const getIcon = () => {
    switch(result.type) {
      case 'vps': return <FaServer className="text-indigo-400" />;
      case 'invoice': return <FaCreditCard className="text-green-400" />;
      case 'user': return <FaUserCircle className="text-blue-400" />;
      case 'document': return <FaFileAlt className="text-yellow-400" />;
      default: return <FaTag className="text-purple-400" />;
    }
  };
  
  const getTypeColor = () => {
    switch(result.type) {
      case 'vps': return 'bg-indigo-500/20 text-indigo-400';
      case 'invoice': return 'bg-green-500/20 text-green-400';
      case 'user': return 'bg-blue-500/20 text-blue-400';
      case 'document': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-purple-500/20 text-purple-400';
    }
  };
  
  return (
    <button
      onClick={() => {
        router.push(result.link);
        onClose();
      }}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-all group"
    >
      <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
        {getIcon()}
      </div>
      <div className="flex-1 text-left">
        <p className="text-white text-sm font-medium group-hover:text-indigo-400 transition-colors">
          {result.title}
        </p>
        <p className="text-slate-400 text-xs">{result.description}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded ${getTypeColor()}`}>
        {result.type.toUpperCase()}
      </span>
      <FaChevronRight className="text-slate-600 group-hover:text-indigo-400 transition-colors text-xs" />
    </button>
  );
}

// Types
interface SearchResultType {
  id: string;
  type: 'vps' | 'invoice' | 'user' | 'document' | 'other';
  title: string;
  description: string;
  link: string;
  tags?: string[];
}

export default function Topbar() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultType[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'vps' | 'invoice' | 'user' | 'document'>('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user, logout } = useAuth();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save recent searches
  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const mockNotifications = [
        { 
          id: 1, 
          title: "VPS Deployed", 
          message: "Your VPS 'operation' has been deployed successfully", 
          time: "2 min ago", 
          read: false, 
          type: "success",
          link: "/vms/1"
        },
        { 
          id: 2, 
          title: "High CPU Usage", 
          message: "VPS 'web-server' is experiencing high CPU usage (85%)", 
          time: "15 min ago", 
          read: false, 
          type: "warning",
          link: "/vms/2"
        },
        { 
          id: 3, 
          title: "Invoice Ready", 
          message: "Your March invoice (INV-2024-003) is ready for payment", 
          time: "1 hour ago", 
          read: true, 
          type: "info",
          link: "/billing"
        },
        { 
          id: 4, 
          title: "Maintenance Scheduled", 
          message: "Scheduled maintenance in Frankfurt region in 24 hours", 
          time: "3 hours ago", 
          read: true, 
          type: "info",
          link: "/status"
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Search functionality
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Mock search results - replace with actual API call
      const mockResults: SearchResultType[] = [
        {
          id: '1',
          type: 'vps',
          title: 'Web Server VPS',
          description: 'Ubuntu 22.04, 4GB RAM, 80GB SSD, Location: Frankfurt',
          link: '/vps/web-server',
          tags: ['ubuntu', 'web', 'production']
        },
        {
          id: '2',
          type: 'vps',
          title: 'Database Server',
          description: 'Debian 12, 8GB RAM, 160GB SSD, Location: Singapore',
          link: '/vps/db-server',
          tags: ['database', 'debian', 'high-memory']
        },
        {
          id: '3',
          type: 'vps',
          title: 'Game Server',
          description: 'Windows Server 2022, 16GB RAM, 240GB NVMe',
          link: '/vps/game-server',
          tags: ['gaming', 'windows', 'high-performance']
        },
        {
          id: '4',
          type: 'invoice',
          title: 'INV-2024-001',
          description: 'VPS Hosting - Web Server - $49.99 (Due: Mar 15, 2024)',
          link: '/billing/invoice/1',
          tags: ['pending', 'march-2024']
        },
        {
          id: '5',
          type: 'invoice',
          title: 'INV-2024-002',
          description: 'Database Server - $89.99 (Paid)',
          link: '/billing/invoice/2',
          tags: ['paid', 'february-2024']
        },
        {
          id: '6',
          type: 'user',
          title: user?.name || 'My Profile',
          description: user?.email || 'Manage account settings',
          link: '/account',
          tags: ['profile', 'settings']
        },
        {
          id: '7',
          type: 'document',
          title: 'Getting Started Guide',
          description: 'Learn how to deploy your first VPS',
          link: '/docs/getting-started',
          tags: ['tutorial', 'beginner']
        },
        {
          id: '8',
          type: 'document',
          title: 'API Documentation',
          description: 'REST API endpoints and authentication',
          link: '/docs/api',
          tags: ['api', 'developer']
        },
        {
          id: '9',
          type: 'other',
          title: 'Support Ticket #12345',
          description: 'Technical support request - Status: Open',
          link: '/support/ticket/12345',
          tags: ['open', 'urgent']
        }
      ];
      
      // Filter based on search query
      let filtered = mockResults.filter(result =>
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description.toLowerCase().includes(query.toLowerCase()) ||
        result.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
      
      // Apply type filter
      if (selectedFilter !== 'all') {
        filtered = filtered.filter(result => result.type === selectedFilter);
      }
      
      setSearchResults(filtered);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, selectedFilter]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      performSearch(searchQuery);
      setShowSearchResults(true);
    }
  };

  const handleResultClick = (result: SearchResultType) => {
    saveRecentSearch(searchQuery);
    router.push(result.link);
    setShowSearchResults(false);
    setSearchQuery("");
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.clear();
      sessionStorage.clear();
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        searchInputRef.current?.blur();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📧';
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch(type) {
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-indigo-500/10 border-indigo-500/20';
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-gradient-to-r from-slate-800/95 via-slate-800/90 to-slate-900/95 backdrop-blur-md border-b border-slate-700/50 shadow-lg">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        
        {/* Mobile Menu Indicator */}
        <div className="lg:hidden w-8" />
        
        {/* Search Bar with Results */}
        <div className="flex-1 max-w-md sm:max-w-lg lg:max-w-md xl:max-w-lg relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative group">
            <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
              isSearchFocused ? 'text-indigo-400' : 'text-slate-500'
            }`} size={16} />
            
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setIsSearchFocused(true);
                if (searchQuery) setShowSearchResults(true);
              }}
              placeholder="Search VPS, invoices, docs... (Ctrl+K)"
              className="w-full bg-slate-900/80 backdrop-blur-sm text-white border border-slate-700 rounded-xl pl-10 pr-24 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
            />
            
            {/* Keyboard shortcut hint */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-slate-500">
              <span className="bg-slate-700 px-1.5 py-0.5 rounded">⌘</span>
              <span className="bg-slate-700 px-1.5 py-0.5 rounded">K</span>
            </div>
            
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowSearchResults(false);
                }}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            )}
          </form>

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-slideDown max-h-[80vh] overflow-y-auto">
              {/* Filter Tabs */}
              <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-2 py-2 flex gap-1 overflow-x-auto">
                {['all', 'vps', 'invoice', 'user', 'document'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                      selectedFilter === filter
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    {filter === 'all' ? 'All Results' : filter.charAt(0).toUpperCase() + filter.slice(1) + 's'}
                  </button>
                ))}
              </div>

              {/* Search Results Content */}
              <div className="max-h-[calc(80vh-100px)] overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <FaSpinner className="w-6 h-6 text-indigo-400 animate-spin" />
                  </div>
                ) : searchResults.length === 0 && searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <FaSearch size={48} className="mb-3 opacity-30" />
                    <p className="text-sm">No results found for "{searchQuery}"</p>
                    <p className="text-xs mt-1">Try different keywords or check your spelling</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    {/* Search Stats */}
                    <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                      <p className="text-xs text-slate-500">
                        Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                      </p>
                    </div>
                    
                    {/* Results List */}
                    {searchResults.map((result) => (
                      <SearchResultItem 
                        key={result.id} 
                        result={result} 
                        onClose={() => {
                          setShowSearchResults(false);
                          setSearchQuery("");
                        }}
                      />
                    ))}
                  </>
                ) : recentSearches.length > 0 && !searchQuery ? (
                  <>
                    <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                      <p className="text-xs text-slate-500">Recent Searches</p>
                    </div>
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchQuery(search);
                          performSearch(search);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/50 transition-colors"
                      >
                        <FaSearch className="text-slate-500 text-xs" />
                        <span className="text-slate-300 text-sm flex-1 text-left">{search}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = recentSearches.filter((_, i) => i !== index);
                            setRecentSearches(updated);
                            localStorage.setItem('recentSearches', JSON.stringify(updated));
                          }}
                          className="text-slate-500 hover:text-slate-300"
                        >
                          ✕
                        </button>
                      </button>
                    ))}
                  </>
                ) : null}
              </div>

              {/* Footer Actions */}
              {searchResults.length > 0 && (
                <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 px-4 py-2 flex justify-between items-center text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span>Esc Close</span>
                  </div>
                  <button
                    onClick={() => {
                      saveRecentSearch(searchQuery);
                      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                      setShowSearchResults(false);
                    }}
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    View all results →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
      

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
              aria-label="Notifications"
            >
              <FaBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slideDown">
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <FaBell size={14} className="text-indigo-400" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                  <button 
                    onClick={() => {
                      setNotifications(notifications.map(n => ({ ...n, read: true })));
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Mark all read
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-700/50">
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-12">
                      <FaSpinner className="w-6 h-6 text-indigo-400 animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <FaBell size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (notif.link) router.push(notif.link);
                          setShowNotifications(false);
                        }}
                        className={`p-4 hover:bg-slate-700/30 transition-all cursor-pointer ${
                          !notif.read ? 'bg-indigo-500/5 border-l-4 border-indigo-500' : ''
                        } ${getNotificationBgColor(notif.type)}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-white text-sm font-medium truncate">
                                {notif.title}
                              </p>
                              <span className="text-xs text-slate-500 flex-shrink-0">
                                {notif.time}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs line-clamp-2">
                              {notif.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="p-3 text-center border-t border-slate-700 bg-slate-800/50">
                  <button 
                    onClick={() => router.push("/notifications")}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 sm:gap-3 p-1.5 rounded-xl hover:bg-slate-700/50 transition-all duration-200 group"
              aria-label="User menu"
            >
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></div>
              </div>
              
              <div className="hidden sm:block text-left">
                <p className="text-white text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-slate-500 text-xs">{user?.email || 'user@example.com'}</p>
              </div>
              <FaChevronDown className={`hidden sm:block text-slate-400 text-xs transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slideDown">
                <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{user?.name || 'User'}</p>
                      <p className="text-slate-400 text-xs truncate">{user?.email || 'user@example.com'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                          Active
                        </span>
                        <span className="text-xs text-slate-500">
                          Wallet: ₹{user?.wallet_balance?.toLocaleString() || '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="py-2">
                  <DropdownItem
                    icon={<FaUserCircle />}
                    label="My Profile"
                    onClick={() => {
                      router.push("/account");
                      setShowUserMenu(false);
                    }}
                  />
                  <DropdownItem
                    icon={<FaServer />}
                    label="My VPS"
                    onClick={() => {
                      router.push("/vps");
                      setShowUserMenu(false);
                    }}
                  />
                  <DropdownItem
                    icon={<FaCreditCard />}
                    label="Billing"
                    onClick={() => {
                      router.push("/billing");
                      setShowUserMenu(false);
                    }}
                  />
                  <DropdownItem
                    icon={<FaQuestionCircle />}
                    label="Help & Support"
                    onClick={() => {
                      router.push("/support");
                      setShowUserMenu(false);
                    }}
                  />
                  <div className="h-px bg-slate-700 my-2" />
                  <DropdownItem
                    icon={isLoggingOut ? <FaSpinner className="animate-spin" /> : <FaSignOutAlt />}
                    label={isLoggingOut ? "Logging out..." : "Logout"}
                    onClick={handleLogout}
                    className="text-red-400 hover:bg-red-500/10"
                    disabled={isLoggingOut}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// Dropdown Item Component
function DropdownItem({ 
  icon, 
  label, 
  onClick, 
  className = "",
  disabled = false
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void; 
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <span className="text-slate-400 w-5 flex justify-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Chevron Icon Component
function FaChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}