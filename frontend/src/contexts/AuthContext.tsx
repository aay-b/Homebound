import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../config/supabase";

type User = {
    id: string;
    email: string;
};

type AuthContextType = {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
            setUser({
                id: data.session.user.id,
                email: data.session.user.email ?? "",
                });
            }
            setLoading(false);
        });
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}