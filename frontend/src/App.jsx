import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Login from "./pages/Login";
import CVPage from "./pages/CVPage";
import ApplicationsPage from "./pages/ApplicationsPage";

function AppLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">{children}</div>
      <footer className="bg-white border-t border-gray-100 py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400">
          <span>© {new Date().getFullYear()} ArcHire</span>
          <span>FastAPI · React · TailwindCSS</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public — marketing landing page */}
          <Route path="/welcome" element={<Landing />} />

          {/* Public — login / register */}
          <Route path="/login" element={<Login />} />

          {/* Protected — job board (requires auth) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Home />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected — CV management */}
          <Route
            path="/cv"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CVPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected — Applications tracker */}
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ApplicationsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
