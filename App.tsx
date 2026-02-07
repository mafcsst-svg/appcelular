import React, { useState } from 'react';
import { ViewState } from './types';
import { UserProvider } from './contexts/UserContext';
import { ProductProvider } from './contexts/ProductContext';
import { OrderProvider, useOrder } from './contexts/OrderContext';

// Views
import { LoginView } from './views/LoginView';
import { ShopView } from './views/ShopView';
import { CartView } from './views/CartView';
import { OrderTrackingView, SuccessView } from './views/OrderTrackingView';
import { ProfileView } from './views/ProfileView';
import { ChatView } from './views/ChatView';
import { AdminView } from './views/AdminView';

// Router Component to handle view switching
const AppRouter = () => {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const { earnedCashback } = useOrder();

  return (
    <>
      {currentView === 'login' && <LoginView setCurrentView={setCurrentView} />}
      {currentView === 'shop' && <ShopView setCurrentView={setCurrentView} />}
      {currentView === 'cart' && <CartView setCurrentView={setCurrentView} />}
      {currentView === 'order-success' && <SuccessView earnedCashback={earnedCashback} setCurrentView={setCurrentView} />}
      {currentView === 'profile' && <ProfileView setCurrentView={setCurrentView} />}
      {currentView === 'chat' && <ChatView setCurrentView={setCurrentView} />}
      {currentView === 'order-tracking' && <OrderTrackingView setCurrentView={setCurrentView} />}
      {currentView === 'admin' && <AdminView setCurrentView={setCurrentView} />}
    </>
  );
};

// Main App with Providers
export default function App() {
  return (
    <UserProvider>
      <ProductProvider>
        <OrderProvider>
          <AppRouter />
        </OrderProvider>
      </ProductProvider>
    </UserProvider>
  );
}
