import React, { useState, useMemo, useEffect, CSSProperties, useRef } from 'react';
import { 
  Settings, LogOut, TrendingUp, Package, Sparkles, Trash2, 
  CheckCircle2, Truck, ShoppingBag, Percent, ShoppingCart, 
  User as UserIcon, Search, Plus, Store, ChevronLeft, ChevronRight, QrCode, 
  Banknote, CreditCard, Copy, Minus, Wallet, Mail, Lock, FileText, Calendar,
  Image as ImageIcon, MapPin, Save, Loader2, ImagePlus, X, Mic, MicOff,
  CreditCard as CardIcon, UtensilsCrossed, Apple, AlertCircle, ArrowRight,
  Phone, MessageSquare, Clock, ClipboardList, Navigation, Send, Coins,
  Printer, UserPlus, Eye, EyeOff, Edit3, PartyPopper, Heart, AlertTriangle, Star,
  XCircle, History, Users
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Product, ProductCategory, AppSettings, ViewState, CartItem, User, Address, Order, OrderStatus, Message } from './types';
import { generateProductDescription, suggestPrice } from './services/geminiService';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, APP_NAME, APP_SUBTITLE } from './constants';

// --- CONEXÃO FIREBASE ---
import { db, auth } from './services/firebase'; // Se seus arquivos estão na mesma pasta, use './firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  getDoc 
} from 'firebase/firestore';

// --- TIPOS ---
// (Mantidos os mesmos do seu arquivo original)

// --- MOCKS DE DADOS ---
// (Mantidos apenas para inicialização visual, mas o foco agora é o Firebase)

// --- COMPONENTES ---

// 1. LoginView
const LoginView: React.FC<{ 
  setCurrentView: (view: ViewState) => void,
  setUser: (user: User) => void,
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>
}> = ({ setCurrentView, setUser, setAllUsers }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Busca dados extras do usuário no Firestore (como endereço)
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        let userData: any = {
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          name: userCredential.user.displayName || 'Usuário',
          isAdmin: email === 'admin@padaria.com', // Regra simples de admin
        };

        if (userDoc.exists()) {
           userData = { ...userData, ...userDoc.data() };
        }

        setUser(userData);
        setCurrentView(userData.isAdmin ? 'admin' : 'shop');
      } else {
        // Registro
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        const newUser: User = {
          id: userCredential.user.uid,
          name,
          email,
          phone,
          isAdmin: false,
          cashbackBalance: 0,
          addresses: []
        };

        // Salva o usuário recém criado no Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), newUser);

        setUser(newUser);
        setAllUsers(prev => [...prev, newUser]);
        setCurrentView('shop');
      }
    } catch (err: any) {
      console.error("Erro auth:", err);
      setError(err.message === "Firebase: Error (auth/invalid-credential)." 
        ? "E-mail ou senha incorretos." 
        : "Erro ao conectar. Verifique seus dados.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{APP_NAME}</h1>
          <p className="text-gray-500">{APP_SUBTITLE}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Seu nome"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (WhatsApp)</label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="******"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            {isLogin ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-amber-600 font-semibold ml-1 hover:underline"
            >
              {isLogin ? 'Cadastre-se' : 'Faça Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// 2. ShopView (Mantido igual, apenas props visuais)
const ShopView: React.FC<{
  products: Product[],
  cart: CartItem[],
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>,
  setCurrentView: (view: ViewState) => void,
  settings: AppSettings,
  orders: Order[],
  user: User | null
}> = ({ products, cart, setCart, setCurrentView, settings, orders, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Calcula cashback pendente (soma dos cashbacks dos pedidos não entregues)
  const pendingCashback = orders
    .filter(o => o.userId === user?.id && o.status !== 'delivered' && o.status !== 'cancelled')
    .reduce((acc, order) => acc + (order.cashbackEarned || 0), 0);

  return (
    <div className="pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{settings.appName}</h1>
              <p className="text-sm text-gray-500">{settings.subtitle}</p>
            </div>
            
            <div className="flex gap-2">
               {user && (
                <div className="flex flex-col items-end mr-2">
                   <div className="text-xs text-gray-500">Saldo Cashback</div>
                   <div className="font-bold text-amber-600">R$ {user.cashbackBalance?.toFixed(2) || '0.00'}</div>
                   {pendingCashback > 0 && (
                     <div className="text-[10px] text-gray-400">
                       + R$ {pendingCashback.toFixed(2)} pendente
                     </div>
                   )}
                </div>
               )}
              <button 
                onClick={() => setCurrentView('profile')}
                className="p-2 rounded-full hover:bg-gray-100 relative"
              >
                <UserIcon className="w-6 h-6 text-gray-600" />
              </button>
              <button 
                onClick={() => setCurrentView('cart')}
                className="p-2 rounded-full hover:bg-gray-100 relative"
              >
                <ShoppingCart className="w-6 h-6 text-gray-600" />
                {cartItemCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="O que você procura hoje?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto mt-4 pb-2 scrollbar-hide">
            {[
              { id: 'all', label: 'Todos', icon: Store },
              { id: 'paes', label: 'Pães', icon: ShoppingBag },
              { id: 'doces', label: 'Doces', icon: PartyPopper },
              { id: 'salgados', label: 'Salgados', icon: UtensilsCrossed },
              { id: 'bebidas', label: 'Bebidas', icon: Apple }, // Usei Apple como placeholder para bebidas se Coffee não existir
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="aspect-video relative overflow-hidden bg-gray-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.cashback > 0 && (
                   <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center shadow-sm">
                     <Coins className="w-3 h-3 mr-1" />
                     {product.cashback}% volta
                   </div>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-gray-800 line-clamp-1">{product.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-amber-600">
                      R$ {product.price.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

// 3. CartView (Com salvamento de PEDIDO)
const CartView: React.FC<{
  cart: CartItem[],
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>,
  settings: AppSettings,
  setCurrentView: (view: ViewState) => void,
  user: User | null,
  setUser: React.Dispatch<React.SetStateAction<User | null>>,
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
  setEarnedCashback: (amount: number) => void
}> = ({ cart, setCart, settings, setCurrentView, user, setUser, setOrders, setEarnedCashback }) => {
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'money'>('pix');
  const [address, setAddress] = useState(user?.address || '');
  const [useCashback, setUseCashback] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const deliveryFee = deliveryMethod === 'delivery' ? settings.deliveryFee : 0;
  
  // Lógica Cashback
  const maxCashbackUsage = Math.min(user?.cashbackBalance || 0, subtotal * (settings.maxCashbackUsagePercent / 100));
  const cashbackDiscount = useCashback ? maxCashbackUsage : 0;
  
  const total = Math.max(0, subtotal + deliveryFee - cashbackDiscount);

  // Calcula quanto vai ganhar de cashback nesta compra
  const cashbackToEarn = cart.reduce((acc, item) => {
      const itemTotal = item.product.price * item.quantity;
      return acc + (itemTotal * (item.product.cashback / 100));
  }, 0);

  const handleSubmitOrder = async () => {
    if (!user) {
        alert("Erro: Usuário não identificado.");
        return;
    }
    if (deliveryMethod === 'delivery' && !address) {
      alert('Por favor, informe o endereço de entrega.');
      return;
    }

    setIsProcessing(true);

    try {
        const newOrder: any = { // Removido o tipo Order estrito aqui para permitir o serverTimestamp
            userId: user.id,
            userName: user.name,
            userPhone: user.phone,
            items: cart,
            total,
            subtotal,
            deliveryFee,
            discount: cashbackDiscount,
            status: 'pending',
            date: new Date().toISOString(),
            createdAt: serverTimestamp(), // Importante para ordenação no Firebase
            deliveryMethod,
            address: deliveryMethod === 'delivery' ? address : undefined,
            paymentMethod,
            cashbackEarned: cashbackToEarn,
            cashbackUsed: cashbackDiscount
        };

        // SALVA NO FIREBASE NA COLEÇÃO 'ORDERS'
        await addDoc(collection(db, "orders"), newOrder);

        // Se usou cashback, desconta do saldo do usuário imediatamente
        if (cashbackDiscount > 0) {
            const newBalance = (user.cashbackBalance || 0) - cashbackDiscount;
            // Atualiza no Firebase
            await updateDoc(doc(db, "users", user.id), {
                cashbackBalance: newBalance
            });
            // Atualiza local
            setUser(prev => prev ? ({ ...prev, cashbackBalance: newBalance }) : null);
        }

        setEarnedCashback(cashbackToEarn);
        setCart([]);
        setCurrentView('order-success');
    } catch (error) {
        console.error("Erro ao salvar pedido:", error);
        alert("Houve um erro ao processar seu pedido. Tente novamente.");
    } finally {
        setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800">Seu carrinho está vazio</h2>
        <p className="text-gray-500 mb-8">Que tal experimentar nossas delícias?</p>
        <button
          onClick={() => setCurrentView('shop')}
          className="bg-amber-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-amber-700 transition-colors"
        >
          Ver Cardápio
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => setCurrentView('shop')} className="mr-4">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold">Finalizar Pedido</h1>
      </div>

      <div className="space-y-4 mb-6">
        {cart.map((item) => (
          <div key={item.product.id} className="flex gap-4 bg-white p-4 rounded-xl shadow-sm">
            <img src={item.product.image} alt={item.product.name} className="w-20 h-20 object-cover rounded-lg" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{item.product.name}</h3>
              <p className="text-amber-600 font-bold">R$ {item.product.price.toFixed(2)}</p>
              <div className="flex items-center gap-3 mt-2">
                <button 
                  onClick={() => setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i).filter(i => i.quantity > 0))}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >-</button>
                <span className="font-medium">{item.quantity}</span>
                <button 
                  onClick={() => setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm space-y-6 mb-6">
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" /> Entrega
          </h3>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setDeliveryMethod('delivery')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                deliveryMethod === 'delivery' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-gray-200'
              }`}
            >
              Entrega
            </button>
            <button
              onClick={() => setDeliveryMethod('pickup')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                deliveryMethod === 'pickup' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-gray-200'
              }`}
            >
              Retirada
            </button>
          </div>
          
          {deliveryMethod === 'delivery' && (
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Endereço completo (Rua, Número, Complemento, Bairro)"
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none h-24 resize-none"
              />
            </div>
          )}
        </div>

        <div>
           <h3 className="font-semibold mb-3 flex items-center gap-2">
             <Coins className="w-5 h-5 text-amber-600" /> Cashback
           </h3>
           <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div>
                 <p className="text-sm text-gray-600">Seu saldo</p>
                 <p className="font-bold text-amber-700">R$ {user?.cashbackBalance?.toFixed(2) || '0.00'}</p>
              </div>
              
              {user?.cashbackBalance && user.cashbackBalance > 0 ? (
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={useCashback}
                      onChange={(e) => setUseCashback(e.target.checked)}
                      className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Usar saldo</span>
                 </label>
              ) : (
                  <span className="text-xs text-gray-400">Sem saldo</span>
              )}
           </div>
           {useCashback && (
              <p className="text-xs text-green-600 mt-2">
                 Desconto aplicado: R$ {cashbackDiscount.toFixed(2)}
              </p>
           )}
        </div>

        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600" /> Pagamento
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'pix', label: 'PIX', icon: QrCode },
              { id: 'card', label: 'Cartão', icon: CardIcon },
              { id: 'money', label: 'Dinheiro', icon: Banknote },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id as any)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === method.id
                    ? 'border-amber-600 bg-amber-50 text-amber-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <method.icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">{method.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] fixed bottom-0 left-0 right-0 max-w-lg mx-auto">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {deliveryMethod === 'delivery' && (
            <div className="flex justify-between text-gray-600">
              <span>Taxa de Entrega</span>
              <span>R$ {deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {useCashback && cashbackDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Desconto Cashback</span>
              <span>- R$ {cashbackDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-amber-600 font-medium pt-1">
             <span>Você ganhará de volta:</span>
             <span>R$ {cashbackToEarn.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleSubmitOrder}
          disabled={isProcessing}
          className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-amber-700 transition-colors shadow-lg flex items-center justify-center disabled:opacity-70"
        >
          {isProcessing ? (
             <>
               <Loader2 className="w-6 h-6 animate-spin mr-2" />
               Processando...
             </>
          ) : (
             <>
               Confirmar Pedido
               <CheckCircle2 className="w-6 h-6 ml-2" />
             </>
          )}
        </button>
      </div>
    </div>
  );
};

// 4. SuccessView (Visual apenas)
const SuccessView: React.FC<{
  setCurrentView: (view: ViewState) => void,
  earnedCashback: number
}> = ({ setCurrentView, earnedCashback }) => {
  return (
    <div className="h-screen flex flex-col items-center justify-center p-8 bg-white text-center">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Pedido Recebido!</h2>
      <p className="text-gray-500 mb-8">
        Sua delícia já vai começar a ser preparada. Acompanhe o status em "Meus Pedidos".
      </p>
      
      {earnedCashback > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 w-full max-w-xs">
           <p className="text-amber-800 font-medium text-sm">Cashback ganho nesta compra:</p>
           <p className="text-amber-600 font-bold text-2xl mt-1">R$ {earnedCashback.toFixed(2)}</p>
           <p className="text-xs text-amber-600/70 mt-1">Disponível após a entrega</p>
        </div>
      )}

      <div className="space-y-3 w-full max-w-xs">
        <button
          onClick={() => setCurrentView('order-tracking')}
          className="w-full bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 transition-colors"
        >
          Acompanhar Pedido
        </button>
        <button
          onClick={() => setCurrentView('shop')}
          className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Voltar ao Cardápio
        </button>
      </div>
    </div>
  );
};

// 5. ProfileView (Com salvamento de DADOS DO USUÁRIO CORRIGIDO)
const ProfileView: React.FC<{
  user: User | null,
  setUser: React.Dispatch<React.SetStateAction<User | null>>,
  setCurrentView: (view: ViewState) => void,
  cart: CartItem[]
}> = ({ user, setUser, setCurrentView, cart }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    cpf: user?.cpf || '',
    address: user?.address || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    // 1. Tenta salvar no Firebase (O BANCO DE DADOS REAL)
    if (user && user.id) {
        try {
            await setDoc(doc(db, "users", user.id), {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                cpf: formData.cpf,
                address: formData.address,
                cashbackBalance: user.cashbackBalance || 0 
            }, { merge: true }); // 'merge' evita apagar dados que não mudaram
        } catch (error) {
            console.error("Erro ao salvar no banco:", error);
            alert("Erro ao salvar seus dados. Verifique sua conexão.");
            setIsSaving(false);
            return;
        }
    }

    // 2. Atualiza a tela (Visual)
    setUser((prev: any) => ({
      ...prev,
      ...formData
    }));
    
    // Animação de sucesso
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        if (cart.length > 0) {
          setCurrentView('cart');
        } else {
          setCurrentView('shop');
        }
      }, 1000);
    }, 800);
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => setCurrentView('shop')} className="mr-4">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold">Meu Perfil</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm space-y-4 mb-6 relative overflow-hidden">
        {showSuccess && (
          <div className="absolute inset-0 bg-green-50 flex flex-col items-center justify-center z-10 animate-in fade-in">
            <CheckCircle2 className="w-12 h-12 text-green-600 mb-2" />
            <p className="text-green-800 font-medium">Dados salvos com sucesso!</p>
          </div>
        )}

        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-amber-600" />
          </div>
        </div>

        <div>
           <p className="text-center text-sm text-gray-500 mb-1">Saldo Cashback</p>
           <p className="text-center text-2xl font-bold text-amber-600 mb-4">R$ {user?.cashbackBalance?.toFixed(2) || '0.00'}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={formData.email}
              disabled
              className="w-full p-2 border rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF (para Nota Fiscal)</label>
             <input
              type="text"
              value={formData.cpf}
              onChange={(e) => setFormData({...formData, cpf: e.target.value})}
              placeholder="000.000.000-00"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Principal</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none h-24 resize-none"
              placeholder="Rua Exemplo, 123 - Bairro"
            />
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center mt-4"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
        </button>
      </div>
      
      <div className="space-y-3">
         <button
            onClick={() => setCurrentView('order-tracking')}
            className="w-full bg-white text-gray-700 py-3 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <History className="w-5 h-5" />
            Meus Pedidos
          </button>
          
          <button
            onClick={() => {
              signOut(auth);
              setUser(null);
              setCurrentView('login');
            }}
            className="w-full bg-red-50 text-red-600 py-3 rounded-lg font-medium hover:bg-red-100 flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Sair da Conta
          </button>
      </div>
    </div>
  );
};

// 6. ChatView (Com salvamento no Firebase)
const ChatView: React.FC<{
  user: User | null,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setCurrentView: (view: ViewState) => void
}> = ({ user, messages, setMessages, setCurrentView }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
        const msgData = {
          text: newMessage,
          senderId: user.id,
          senderName: user.name,
          senderEmail: user.email,
          timestamp: new Date().toISOString(),
          createdAt: serverTimestamp(),
          isAdmin: false
        };

        // Salva na coleção messages
        await addDoc(collection(db, "messages"), msgData);

        // Atualiza local (opcional, pois idealmente usariamos onSnapshot, mas mantem a UI rapida)
        const localMsg: Message = {
            id: Date.now().toString(),
            ...msgData
        };
        setMessages([...messages, localMsg]);
        setNewMessage('');
    } catch (error) {
        console.error("Erro chat:", error);
        alert("Erro ao enviar mensagem.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentView('shop')}>
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
             <h1 className="font-bold text-gray-800">Fale Conosco</h1>
             <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Online agora
             </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                msg.senderId === user?.id
                  ? 'bg-amber-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
              }`}
            >
              <p>{msg.text}</p>
              <span className={`text-[10px] mt-1 block ${
                 msg.senderId === user?.id ? 'text-amber-100' : 'text-gray-400'
              }`}>
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t sticky bottom-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            className="p-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

// 7. OrderTrackingView (Apenas leitura visual, ideal conectar com onSnapshot)
const OrderTrackingView: React.FC<{
  orders: Order[],
  setCurrentView: (view: ViewState) => void,
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
}> = ({ orders, setCurrentView }) => {
  // Ordenar por data (mais recente primeiro)
  const sortedOrders = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto min-h-screen bg-gray-50">
      <div className="flex items-center mb-6">
         <button onClick={() => setCurrentView('profile')} className="mr-4">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold">Meus Pedidos</h1>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <ShoppingBag className="w-12 h-12 mb-2 opacity-20" />
          <p>Nenhum pedido realizado ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedOrders.map((order) => (
             <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                   <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pedido #{order.id?.slice(0,6)}</span>
                      <p className="text-sm text-gray-500 mt-1">
                         {new Date(order.date).toLocaleDateString()} às {new Date(order.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                   </div>
                   <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1
                      ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'delivering' ? 'bg-purple-100 text-purple-700' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'}`}>
                      {order.status === 'pending' && <Clock className="w-3 h-3" />}
                      {order.status === 'preparing' && <UtensilsCrossed className="w-3 h-3" />}
                      {order.status === 'delivering' && <Truck className="w-3 h-3" />}
                      {order.status === 'delivered' && <CheckCircle2 className="w-3 h-3" />}
                      {
                        order.status === 'pending' ? 'Pendente' :
                        order.status === 'preparing' ? 'Preparando' :
                        order.status === 'delivering' ? 'Saiu p/ Entrega' :
                        order.status === 'delivered' ? 'Entregue' : 'Cancelado'
                      }
                   </div>
                </div>

                <div className="space-y-2 mb-4">
                   {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                         <span className="text-gray-600">{item.quantity}x {item.product.name}</span>
                         <span className="font-medium text-gray-800">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                   ))}
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                   <span className="font-bold text-gray-800">Total</span>
                   <span className="font-bold text-amber-600 text-lg">R$ {order.total.toFixed(2)}</span>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 8. AdminView (Com ATUALIZAÇÃO DE STATUS NO FIREBASE)
const AdminView: React.FC<{
  products: Product[],
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  settings: AppSettings,
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
  setCurrentView: (view: ViewState) => void,
  orders: Order[],
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  user: User | null,
  setUser: React.Dispatch<React.SetStateAction<User | null>>,
  allUsers: User[]
}> = ({ products, setProducts, settings, setSettings, setCurrentView, orders, setOrders, messages, setMessages, user, setUser, allUsers }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'users' | 'settings'>('dashboard');

  // Função para atualizar status do pedido no Firebase
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { status: newStatus });
        
        // Se for entregue, libera o cashback
        if (newStatus === 'delivered') {
           const order = orders.find(o => o.id === orderId);
           if (order && order.cashbackEarned > 0) {
               // Aqui você precisaria buscar o usuário atual e somar o cashback
               // Simplificação: assume que o backend/função faria isso, ou fazemos update no usuário aqui
               const userRef = doc(db, "users", order.userId);
               const userDoc = await getDoc(userRef);
               if (userDoc.exists()) {
                   const currentBalance = userDoc.data().cashbackBalance || 0;
                   await updateDoc(userRef, { cashbackBalance: currentBalance + order.cashbackEarned });
               }
           }
        }

        // Atualiza local
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
        console.error("Erro ao atualizar pedido:", error);
        alert("Erro ao atualizar status.");
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Painel Admin</h2>
              <p className="text-xs text-gray-400">Gerenciamento</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {[
              { id: 'dashboard', label: 'Visão Geral', icon: BarChart },
              { id: 'orders', label: 'Pedidos', icon: ClipboardList, badge: pendingOrders },
              { id: 'products', label: 'Produtos', icon: Package },
              { id: 'users', label: 'Clientes', icon: Users },
              { id: 'settings', label: 'Configurações', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  activeTab === item.id ? 'bg-amber-600 text-white' : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                   <item.icon className="w-5 h-5" />
                   <span>{item.label}</span>
                </div>
                {item.badge ? (
                   <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-gray-800">
           <button 
             onClick={() => {
                signOut(auth);
                setUser(null);
                setCurrentView('login');
             }}
             className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
           >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
         <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden">
            <h1 className="font-bold text-gray-800">Admin</h1>
            <button onClick={() => setCurrentView('shop')} className="text-gray-600">
               <X className="w-6 h-6" />
            </button>
         </header>

         <main className="p-8">
            {activeTab === 'dashboard' && (
               <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-green-100 rounded-xl">
                              <Banknote className="w-6 h-6 text-green-600" />
                           </div>
                           <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full">+12%</span>
                        </div>
                        <p className="text-gray-500 text-sm">Faturamento Total</p>
                        <h3 className="text-2xl font-bold text-gray-800">R$ {revenue.toFixed(2)}</h3>
                     </div>
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="p-3 bg-blue-100 rounded-xl w-fit mb-4">
                           <ShoppingBag className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="text-gray-500 text-sm">Total Pedidos</p>
                        <h3 className="text-2xl font-bold text-gray-800">{orders.length}</h3>
                     </div>
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="p-3 bg-amber-100 rounded-xl w-fit mb-4">
                           <Users className="w-6 h-6 text-amber-600" />
                        </div>
                        <p className="text-gray-500 text-sm">Clientes Ativos</p>
                        <h3 className="text-2xl font-bold text-gray-800">{allUsers.length}</h3>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'orders' && (
               <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-800">Gerenciar Pedidos</h2>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="bg-gray-50 border-b border-gray-100">
                              <tr>
                                 <th className="p-4 font-semibold text-gray-600">ID</th>
                                 <th className="p-4 font-semibold text-gray-600">Cliente</th>
                                 <th className="p-4 font-semibold text-gray-600">Status</th>
                                 <th className="p-4 font-semibold text-gray-600">Total</th>
                                 <th className="p-4 font-semibold text-gray-600">Ações</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                              {orders.map(order => (
                                 <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-mono text-sm text-gray-500">#{order.id?.slice(0,6)}</td>
                                    <td className="p-4">
                                       <div className="font-medium text-gray-800">{order.userName || 'Cliente'}</div>
                                       <div className="text-xs text-gray-400">{order.userPhone}</div>
                                    </td>
                                    <td className="p-4">
                                       <span className={`px-3 py-1 rounded-full text-xs font-bold
                                          ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                            order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                                            'bg-gray-100 text-gray-600'}`}>
                                          {order.status}
                                       </span>
                                    </td>
                                    <td className="p-4 font-bold text-gray-800">R$ {order.total.toFixed(2)}</td>
                                    <td className="p-4">
                                       <div className="flex gap-2">
                                          <button 
                                            onClick={() => handleStatusChange(order.id!, 'preparing')}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Preparar"
                                          >
                                             <UtensilsCrossed className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => handleStatusChange(order.id!, 'delivering')}
                                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Enviar"
                                          >
                                             <Truck className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => handleStatusChange(order.id!, 'delivered')}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Concluir"
                                          >
                                             <CheckCircle2 className="w-4 h-4" />
                                          </button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}
            
            {/* Outras abas simplificadas para caber no código */}
            {activeTab === 'products' && (
                <div className="text-center py-10 text-gray-500">Gestão de Produtos (Implementação similar aos Pedidos)</div>
            )}
         </main>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL APP ---

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [earnedCashback, setEarnedCashback] = useState(0);

  // Monitora autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Busca dados completos do Firestore
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        let userData: any = {
           id: currentUser.uid,
           email: currentUser.email || '',
           name: currentUser.displayName || 'Usuário',
           isAdmin: currentUser.email === 'admin@padaria.com'
        };

        if (docSnap.exists()) {
            userData = { ...userData, ...docSnap.data() };
        }
        
        setUser(userData);
        setCurrentView(userData.isAdmin ? 'admin' : 'shop');
      } else {
        setUser(null);
        setCurrentView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      {currentView === 'login' && <LoginView setCurrentView={setCurrentView} setUser={setUser} setAllUsers={setAllUsers} />}
      {currentView === 'shop' && <ShopView products={products} cart={cart} setCart={setCart} setCurrentView={setCurrentView} settings={settings} orders={orders} user={user} />}
      {currentView === 'cart' && <CartView cart={cart} setCart={setCart} settings={settings} setCurrentView={setCurrentView} user={user} setUser={setUser} setOrders={setOrders} setEarnedCashback={setEarnedCashback} />}
      {currentView === 'order-success' && <SuccessView earnedCashback={earnedCashback} setCurrentView={setCurrentView} />}
      {currentView === 'profile' && <ProfileView user={user} setUser={setUser} setCurrentView={setCurrentView} cart={cart} />}
      {currentView === 'chat' && <ChatView user={user} messages={messages} setMessages={setMessages} setCurrentView={setCurrentView} />}
      {currentView === 'order-tracking' && <OrderTrackingView orders={orders} setCurrentView={setCurrentView} setOrders={setOrders} />}
      {currentView === 'admin' && <AdminView products={products} setProducts={setProducts} settings={settings} setSettings={setSettings} setCurrentView={setCurrentView} orders={orders} setOrders={setOrders} messages={messages} setMessages={setMessages} user={user} setUser={setUser} allUsers={allUsers} />}
    </>
  );
}

export default App;
