import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; 
import { auth, db } from "../firebaseConfig";     

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // CHECK DATABASE: Look for a document named after their email
        try {
            const docRef = doc(db, "customers", currentUser.email); 
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().isPro === true) {
                console.log("User is PRO member");
                setIsPro(true);
            } else {
                console.log("User is FREE member");
                setIsPro(false);
            }
        } catch (error) {
            console.error("Error fetching pro status:", error);
            setIsPro(false);
        }

      } else {
        setUser(null);
        setIsPro(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isPro, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);