import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { INITIAL_PRODUCTS } from '../constants';
import { subscribeToFirebase, saveToFirebase } from '../services/firebase';

interface ProductContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProductsState] = useState<Product[]>(INITIAL_PRODUCTS);

  // ✅ subscribe protegido contra Firestore não pronto
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeToFirebase('products', (data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProductsState(data);
        }
      });
    } catch (e) {
      console.warn("Firestore ainda não pronto (products)");
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ✅ setter com proteção
  const setProducts: React.Dispatch<React.SetStateAction<Product[]>> = (value) => {
    setProductsState(prev => {
      const newVal = typeof value === 'function' ? (value as Function)(prev) : value;
      saveToFirebase('products', newVal).catch(console.error);
      return newVal;
    });
  };

  return (
    <ProductContext.Provider value={{ products, setProducts }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within a ProductProvider');
  return context;
};
