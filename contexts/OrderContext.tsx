import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Order, Message, Product } from '../types';
import { subscribeToFirebase, saveToFirebase } from '../services/firebase';

interface OrderContextType {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  earnedCashback: number;
  setEarnedCashback: React.Dispatch<React.SetStateAction<number>>;
  addToCart: (product: Product, quantity: number) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  updateObservation: (id: string, obs: string) => void;
  clearCart: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrdersState] = useState<Order[]>([]);
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [earnedCashback, setEarnedCashback] = useState(0);

  // ✅ Sync Orders — protegido contra runtime do Studio IA
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeToFirebase('orders', (data) => {
        if (Array.isArray(data)) {
          setOrdersState(data);
        }
      });
    } catch (e) {
      console.warn("Firestore ainda não pronto (orders)");
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ✅ Sync Messages — protegido
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeToFirebase('messages', (data) => {
        if (Array.isArray(data)) {
          setMessagesState(data);
        }
      });
    } catch (e) {
      console.warn("Firestore ainda não pronto (messages)");
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ✅ setters com proteção de erro
  const setOrders: React.Dispatch<React.SetStateAction<Order[]>> = (value) => {
    setOrdersState(prev => {
      const newVal = typeof value === 'function' ? (value as Function)(prev) : value;
      saveToFirebase('orders', newVal).catch(console.error);
      return newVal;
    });
  };

  const setMessages: React.Dispatch<React.SetStateAction<Message[]>> = (value) => {
    setMessagesState(prev => {
      const newVal = typeof value === 'function' ? (value as Function)(prev) : value;
      saveToFirebase('messages', newVal).catch(console.error);
      return newVal;
    });
  };

  const addToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const updateObservation = (id: string, obs: string) => {
    setCart(prev =>
      prev.map(item =>
        item.id === id ? { ...item, observation: obs } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  return (
    <OrderContext.Provider
      value={{
        cart,
        setCart,
        orders,
        setOrders,
        messages,
        setMessages,
        earnedCashback,
        setEarnedCashback,
        addToCart,
        updateCartQuantity,
        updateObservation,
        clearCart
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used within an OrderProvider');
  return context;
};
