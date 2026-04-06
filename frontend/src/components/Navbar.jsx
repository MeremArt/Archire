import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? "/" : "/welcome"} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">ArcHire</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/applications" className="text-sm text-gray-600 hover:text-indigo-600 font-medium">
                  Applications
                </Link>
                <Link to="/cv" className="text-sm text-gray-600 hover:text-indigo-600 font-medium">
                  My CV
                </Link>
                <span className="text-sm text-gray-400">|</span>
                <span className="text-sm text-gray-500">{user.email}</span>
                <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm py-1.5 px-3">
                  Sign in
                </Link>
                <Link to="/login?tab=register" className="btn-primary text-sm py-1.5 px-3">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded-md text-gray-500 hover:text-gray-700"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-100 py-3 space-y-2">
            {user ? (
              <>
                <p className="px-2 text-sm text-gray-500">{user.email}</p>
                <Link
                  to="/applications"
                  onClick={() => setMenuOpen(false)}
                  className="block px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                >
                  Applications
                </Link>
                <Link
                  to="/cv"
                  onClick={() => setMenuOpen(false)}
                  className="block px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                >
                  My CV
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-2 py-2 text-sm text-red-600 hover:bg-gray-50 rounded"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                >
                  Sign in
                </Link>
                <Link
                  to="/login?tab=register"
                  onClick={() => setMenuOpen(false)}
                  className="block px-2 py-2 text-sm text-indigo-600 font-medium hover:bg-gray-50 rounded"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
