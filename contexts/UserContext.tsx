import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { MOCK_ADMIN } from '../constants';

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
  // Inicializa o usuário a partir do localStorage se existir
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('hortal_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  // Inicializa a lista de usuários a partir do localStorage ou usa mock inicial
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('hortal_all_users');
    if (savedUsers) {
      return JSON.parse(savedUsers);
    }
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
          address: { zipCode: '14700-000', street: 'Rua das Flores', number: '123', neighborhood: 'Centro', city: 'Bebedouro', state: 'SP' }
      },
      {
          id: 'c2',
          name: 'José Santos',
          email: 'jose@email.com',
          password: '123',
          phone: '(17) 99876-5432',
          role: 'customer',
          cashbackBalance: 5.00,
          orderHistory: [],
          address: { zipCode: '14701-000', street: 'Av. Paulista', number: '500', neighborhood: 'Jardim', city: 'Bebedouro', state: 'SP' }
      }
    ];
  });

  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('hortal_settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      deliveryFee: 8.50,
      minOrderValue: 20.00,
      cashbackPercentage: 0.05,
    };
  });

  // Efeitos para salvar no LocalStorage sempre que houver mudança
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

  // Função para atualizar perfil e garantir que a lista global (allUsers) também seja atualizada
  const updateUserProfile = (updatedUser: User) => {
    setUser(updatedUser);
    setAllUsers(prevUsers => 
      prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
    );
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hortal_current_user');
  };

  return (
    <UserContext.Provider value={{ 
      user, setUser, 
      allUsers, setAllUsers, 
      settings, setSettings,
      updateUserProfile,
      logout
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};