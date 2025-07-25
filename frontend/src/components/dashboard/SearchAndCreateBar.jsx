import React from 'react';
import { HiOutlineSearch, HiPlus } from 'react-icons/hi';

/**
 * Search and Create Bar Component
 * 
 * Provides a combined interface for searching existing rooms and creating new ones.
 * Features a search input with icon and a create room button.
 * 
 * Key Features:
 * - Real-time search input with search icon
 * - Create room button with plus icon
 * - Responsive layout (stacks on mobile, side-by-side on desktop)
 * - Connection-aware UI (disabled when not connected)
 * - Consistent styling with hover effects
 * 
 * @param {string} searchTerm - Current search input value
 * @param {Function} onSearchChange - Handler for search input changes
 * @param {Function} onCreateRoom - Handler for create room button click
 * @param {boolean} isConnected - Socket connection status (affects button state)
 * @returns {JSX.Element} Search input and create button bar
 */

const SearchAndCreateBar = ({ 
  searchTerm, 
  onSearchChange, 
  onCreateRoom, 
  isConnected = true 
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
      <div className="relative w-full md:w-1/2">
        <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!isConnected}
        />
      </div>
      
      <button
        onClick={onCreateRoom}
        disabled={!isConnected}
        className={`w-full md:w-auto px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
          isConnected 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
        }`}
      >
        <HiPlus size={20} />
        <span>Create Room</span>
      </button>
    </div>
  );
};

export default SearchAndCreateBar;
