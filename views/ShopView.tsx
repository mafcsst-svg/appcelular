import React, { useState, useMemo } from 'react';
import { Store, MessageSquare, Truck, User as UserIcon, LogOut, Coins, Search, Plus, Minus } from 'lucide-react';
import { APP_NAME, APP_SUBTITLE } from '../constants';
import { Product, ProductCategory, ViewState, Order } from '../types';
import { useUser } from '../contexts/UserContext';
import { useProducts } from '../contexts/ProductContext';
import { useOrder } from '../contexts/OrderContext';

const ProductRow = ({ product, cart, addToCart, updateCartQuantity, updateObservation }: any) => {
  const cartItem = cart.find((item: any) => item.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const [showObs, setShowObs] = useState(!!cartItem?.observation);

  return (
    <div className="px-4 pb-2">
       <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex gap-4 relative group">
            <div className="flex-1 flex flex-col">
               <h3 className="font-bold text-stone-800 text-base leading-tight mb-1 line-clamp-1">{product.name}</h3>
               <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed flex-1">{product.description}</p>
               
               <div className="mt-3 flex items-center gap-2">
                 <span className="font-bold text-stone-900 text-base">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</span>
                 {product.oldPrice && (
                   <span className="text-xs text-stone-400 line-through">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.oldPrice)}</span>
                 )}
               </div>
            </div>
            
            <div className="w-24 h-24 relative flex-shrink-0">
               <img 
                 src={product.image} 
                 className="w-full h-full rounded-xl object-cover bg-stone-100" 
                 alt={product.name}
               />
               
               <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                  {quantity === 0 ? (
                    <button 
                      onClick={() => addToCart(product, 1)} 
                      className="bg-white text-brand-500 border border-stone-200 px-6 py-1 rounded-lg flex items-center justify-center font-bold text-sm shadow-md active:scale-95 transition-all hover:border-brand-200"
                    >
                      <Plus size={16} className="mr-1" /> Adicionar
                    </button>
                  ) : (
                    <div className="flex items-center bg-white rounded-lg shadow-md border border-stone-200 overflow-hidden">
                       <button onClick={() => updateCartQuantity(product.id, -1)} className="p-1.5 text-brand-500 hover:bg-stone-50 transition-colors"><Minus size={16} /></button>
                       <span className="px-3 text-sm font-bold text-stone-800 min-w-[2rem] text-center">{quantity}</span>
                       <button onClick={() => updateCartQuantity(product.id, 1)} className="p-1.5 text-brand-500 hover:bg-stone-50 transition-colors"><Plus size={16} /></button>
                    </div>
                  )}
               </div>
            </div>

            {quantity > 0 && (
              <button 
                onClick={() => setShowObs(!showObs)} 
                className={`absolute top-2 right-2 p-1.5 rounded-full border transition-all ${showObs ? 'bg-brand-50 border-brand-200 text-brand-500' : 'bg-white border-stone-200 text-stone-400'}`}
                title="Adicionar observação"
              >
                <MessageSquare size={14} />
              </button>
            )}

            {quantity > 0 && showObs && (
              <div className="absolute top-[calc(100%-8px)] left-4 right-4 z-20 animate-fade-in">
                 <input 
                   type="text" 
                   autoFocus
                   placeholder="Algum detalhe? Ex: Sem cebola..."
                   className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg outline-none shadow-lg focus:border-brand-500"
                   value={cartItem?.observation || ''}
                   onChange={(e) => updateObservation(product.id, e.target.value)}
                   onBlur={() => !cartItem?.observation && setShowObs(false)}
                 />
              </div>
            )}
       </div>
    </div>
  );
};

export const ShopView = ({ setCurrentView }: { setCurrentView: (v: ViewState) => void }) => {
  const { user, logout } = useUser();
  const { products } = useProducts();
  const { cart, orders, addToCart, updateCartQuantity, updateObservation } = useOrder();
  
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      if (p.active === false) return false;
      const matchesCategory = category === 'all' || p.category === category;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, searchTerm, products]);

  const activeOrdersCount = orders.filter((o: Order) => o.status !== 'completed' && o.status !== 'cancelled').length;
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleLogout = () => {
    if (logout) logout();
    setCurrentView('login');
  };

  return (
    <div className="h-screen flex flex-col bg-stone-50">
       <div className="bg-white shadow-sm z-30 flex-shrink-0">
         <div className="p-4 pb-2 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-brand-500 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-100">
                <Store size={24} />
              </div>
              <div>
                <h1 className="text-lg font-black text-stone-900 leading-none">{APP_NAME}</h1>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{APP_SUBTITLE}</p>
              </div>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentView('chat')} 
                  className="p-2.5 bg-stone-100 rounded-full hover:bg-brand-50 hover:text-brand-500 transition-colors relative"
                >
                  <MessageSquare size={20} className="text-stone-600" />
                </button>
                {activeOrdersCount > 0 && (
                  <button onClick={() => setCurrentView('order-tracking')} className="p-2.5 bg-brand-50 text-brand-500 rounded-full animate-pulse border border-brand-100">
                    <Truck size={20} />
                  </button>
                )}
                <button onClick={() => setCurrentView('profile')} className="p-2.5 bg-stone-100 rounded-full hover:bg-stone-200 transition-all">
                  <UserIcon size={20} className="text-stone-600"/>
                </button>
                <button 
                  onClick={handleLogout} 
                  className="p-2.5 bg-stone-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
            </div>
         </div>

         <div className="px-4 py-2 bg-stone-50 flex items-center justify-between border-y border-stone-100">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 overflow-hidden">
                  <UserIcon size={14} />
               </div>
               <span className="text-xs font-bold text-stone-800">Olá, {user?.name.split(' ')[0]}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-2 py-1 rounded-lg border border-amber-200 shadow-sm">
               <Coins size={12} className="text-amber-500" />
               <span className="text-[10px] font-black">{formatCurrency(user?.cashbackBalance || 0)}</span>
            </div>
         </div>

         <div className="px-4 py-4">
            <div className="relative group">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-brand-500 transition-colors" />
               <input 
                 type="text" 
                 placeholder="O que você deseja pedir?"
                 className="w-full bg-stone-100 border border-transparent focus:border-brand-500 focus:bg-white rounded-xl py-3 pl-12 pr-4 outline-none text-sm font-medium transition-all"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>
         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 px-4 border-b border-stone-50">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'promocoes', label: 'Promoções' },
              { id: 'panificacao', label: 'Panificação' },
              { id: 'confeitaria', label: 'Confeitaria' },
              { id: 'lanches', label: 'Lanches' },
              { id: 'bebidas', label: 'Bebidas' },
              { id: 'mercearia', label: 'Mercearia' }
            ].map(c => (
               <button 
                 key={c.id} 
                 onClick={() => setCategory(c.id as any)} 
                 className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap font-black transition-all border ${category === c.id ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-100' : 'bg-white text-stone-500 border-stone-200 hover:border-brand-200'}`}
               >
                 {c.label}
               </button>
            ))}
         </div>
       </div>

       <div className="flex-1 w-full bg-stone-50 overflow-y-auto pt-2 pb-32">
          {filteredProducts.map((product) => (
             <ProductRow 
                key={product.id}
                product={product}
                cart={cart}
                addToCart={addToCart}
                updateCartQuantity={updateCartQuantity}
                updateObservation={updateObservation}
             />
          ))}
       </div>

       {cart.length > 0 && (
         <div className="fixed bottom-0 left-0 w-full p-4 bg-white/80 backdrop-blur-md z-40 border-t border-stone-100">
            <button 
              onClick={() => setCurrentView('cart')} 
              className="w-full bg-brand-500 text-white p-4 rounded-2xl shadow-xl flex justify-between items-center font-bold active:scale-95 transition-all hover:bg-brand-600"
            >
               <div className="flex items-center gap-3">
                 <div className="bg-brand-600 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black border border-brand-400">
                   {cartItemCount}
                 </div>
                 <span className="text-base">Ver Cesta</span>
               </div>
               <div className="flex flex-col items-end">
                 <span className="text-lg leading-none">{formatCurrency(cartTotal)}</span>
                 <span className="text-[10px] text-brand-100 font-medium">Finalizar Pedido</span>
               </div>
            </button>
         </div>
       )}
    </div>
  );
};