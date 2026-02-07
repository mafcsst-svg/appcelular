import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { subscribeToFirebase, saveToFirebase } from '../services/firebase';

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
  updateUserProfile: (updatedUser: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  // ---------- state init ----------

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('hortal_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [allUsers, setAllUsersState] = useState<User[]>(() => {
    const saved = localStorage.getItem('hortal_all_users');
    if (saved) return JSON.parse(saved);

    return [
      {
        id: 'c1',
        name: 'Maria Oliveira',
        email: 'maria@email.com',
        password: '123',
        phone: '(17) 99123-4567',
        cpf: '123.456.789-00',
        role: 'customer',
        cashbackBalance: 15.50,
        orderHistory: [],
        address: {
          zipCode: '14700-000',
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'Bebedouro',
          state: 'SP'
        }
      }
    ];
  });

  const [settings, setSettingsState] = useState(() => {
    const saved = localStorage.getItem('hortal_settings');
    return saved ? JSON.parse(saved) : {
      deliveryFee: 8.5,
      minOrderValue: 20,
      cashbackPercentage: 0.05
    };
  });

  // ---------- firebase sync (protegido) ----------

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeToFirebase('users', (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllUsersState(data);

          setUser(current => {
            if (!current) return null;
            const found = data.find(u => u.id === current.id);
            return found ?? current;
          });
        }
      });
    } catch {
      console.warn("Firestore ainda não pronto (users)");
    }

    return () => unsubscribe && unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeToFirebase('settings', (data: any) => {
        if (!data) return;

        if (Array.isArray(data) && data.length > 0) {
          setSettingsState(data[0]);
        } else if (!Array.isArray(data)) {
          setSettingsState(data);
        }
      });
    } catch {
      console.warn("Firestore ainda não pronto (settings)");
    }

    return () => unsubscribe && unsubscribe();
  }, []);

  // ---------- localStorage backup ----------

  useEffect(() => {
    localStorage.setItem('hortal_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('hortal_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hortal_current_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('hortal_settings', JSON.stringify(settings));
  }, [settings]);

  // ---------- setters com proteção ----------

  const setAllUsers: React.Dispatch<React.SetStateAction<User[]>> = (value) => {
    setAllUsersState(prev => {
      const newVal = typeof value === 'function' ? (value as Function)(prev) : value;
      saveToFirebase('users', newVal).catch(console.error);
      return newVal;
    });
  };

  const setSettings: React.Dispatch<React.SetStateAction<any>> = (value) => {
    setSettingsState(prev => {
      const newVal = typeof value === 'function' ? (value as Function)(prev) : value;
      saveToFirebase('settings', newVal).catch(console.error);
      return newVal;
    });
  };

  // ---------- actions ----------

  const updateUserProfile = (updatedUser: User) => {
    setUser(updatedUser);
    setAllUsers(prev =>
      prev.map(u => u.id === updatedUser.id ? updatedUser : u)
    );
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hortal_current_user');
  };

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      allUsers,
      setAllUsers,
      settings,
      setSettings,
      updateUserProfile,
      logout
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};
