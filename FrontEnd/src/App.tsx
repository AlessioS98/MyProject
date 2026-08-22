import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { ContrattiList } from './pages/ContrattiList';
import { NuovoContratto } from './pages/NuovoContratto';
import { Archivio } from './pages/Archivio';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navbar Responsive - full width */}
        <nav className="bg-white shadow-md sticky top-0 z-50">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 max-w-full">
              {/* Logo */}
              <div className="flex items-center text-xl font-bold text-blue-600 gap-2">
                <span>🏠</span>
                <span className="hidden sm:inline">Gestione Affitti</span>
                <span className="sm:hidden">Affitti</span>
              </div>

              {/* Menu Desktop */}
              <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
                <Link to="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </Link>
                <Link to="/contratti" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Contratti
                </Link>
                <Link to="/nuovo" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                  + Nuovo
                </Link>
                <Link to="/archivio" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  📦 Archivio
                </Link>
              </div>

              {/* Bottone Hamburger (mobile) */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-gray-700 hover:text-blue-600 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Menu Mobile */}
            {isMenuOpen && (
              <div className="md:hidden pb-4 space-y-2">
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/contratti"
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                >
                  Contratti
                </Link>
                <Link
                  to="/nuovo"
                  onClick={() => setIsMenuOpen(false)}
                  className="block bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-base font-medium text-center"
                >
                  + Nuovo Contratto
                </Link>
                <Link
                  to="/archivio"
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                >
                  📦 Archivio
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Contenuto principale - full width con padding */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/contratti" element={<ContrattiList />} />
            <Route path="/nuovo" element={<NuovoContratto />} />
            <Route path="/archivio" element={<Archivio />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;