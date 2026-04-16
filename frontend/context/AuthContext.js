import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    email: "demo@gmail.com",
    emailVerified: true,
  });

  const [profile, setProfile] = useState({
    name: "Khaled",
    role: "farmer", // change করে buyer test করতে পারো
    district: "Rajshahi",
    profilePhoto: null,
  });

  const logout = async () => {
    setUser(null);
    setProfile(null);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, profile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  // Return default values if context is undefined (provider not wrapped)
  return (
    context || {
      user: null,
      profile: null,
      logout: () => Promise.resolve(true),
    }
  );
};
