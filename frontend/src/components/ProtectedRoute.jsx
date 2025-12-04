import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, isPro, loading } = useAuth();

  // 1. Wait for Firebase to check credentials
  if (loading) {
    return <div className="p-10 text-center text-white">Loading access rights...</div>;
  }

  // 2. If not logged in -> Kick to Login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // 3. If logged in but NOT paid -> Kick to Home (or specific Upgrade page)
  if (!isPro) {
    // You can remove this alert later or replace it with a nice UI modal
    alert("Access Restricted: This tool is for Pro members only. Please purchase on our website."); 
    return <Navigate to="/" />;
  }

  // 4. If all good -> Allow entry
  return children;
};

export default ProtectedRoute;