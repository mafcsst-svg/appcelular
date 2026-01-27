import { 
  doc, setDoc, addDoc, collection, updateDoc, serverTimestamp, getDoc,
  onSnapshot, query, orderBy // <--- Adicione estes três
} from 'firebase/firestore';
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
// Importa a conexão com o Firebase e Auth
import { db, auth } from './services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from "firebase/auth";

// --- UI Components ---

const Button = ({ children, variant = 'primary', className = '', isLoading, ...props }: any) => {
  const baseClass = "px-4 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95";
  const variants: any = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-100",
    outline: "border-2 border-brand-100 text-brand-500 hover:bg-brand-50 hover:border-brand-200",
    ghost: "text-stone-500 hover:bg-stone-100",
    secondary: "bg-stone-800 text-white hover:bg-stone-700",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200",
    danger: "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200"
  };
  return (
    <button className={`${baseClass} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {isLoading && <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"/>}
      {children}
    </button>
  );
};

const Input = ({ label, icon, error, ...props }: any) => (
  <div className="space-y-1.5 w-full text-left">
    {label && <label className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">{icon}</div>}
      <input 
        className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 rounded-xl bg-white border outline-none focus:ring-4 transition-all font-medium text-stone-700 placeholder:text-stone-300 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-50' : 'border-stone-200 focus:border-brand-500 focus:ring-brand-50/50'}`}
        {...props}
      />
    </div>
    {error && <span className="text-xs text-red-500 font-medium ml-1">{error}</span>}
  </div>
);

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// --- PIX Helper Functions ---

const crc16ccitt = (str: string) => {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

const generatePixPayload = (key: string, name: string, city: string, amount: number, txId: string = '***') => {
  const cleanKey = key.replace(/\D/g, ''); 
  const amountStr = amount.toFixed(2);
  
  const payload = [
    '000201', 
    '26' + (22 + cleanKey.length) + '0014br.gov.bcb.pix' + '01' + cleanKey.length + cleanKey, 
    '52040000', 
    '5303986', 
    '54' + amountStr.length.toString().padStart(2, '0') + amountStr, 
    '5802BR', 
    '59' + name.length.toString().padStart(2, '0') + name, 
    '60' + city.length.toString().padStart(2, '0') + city, 
    '62' + (4 + txId.length).toString().padStart(2, '0') + '05' + txId.length.toString().padStart(2, '0') + txId, 
    '6304' 
  ].join('');

  return payload + crc16ccitt(payload);
};

// --- Success View ---

const SuccessView = ({ earnedCashback, setCurrentView }: { earnedCashback: number, setCurrentView: (v: ViewState) => void }) => {
  const gratitudePhrases = [
    "Obrigado por escolher a Hortal! Seu pão quentinho já está sendo preparado. 🥖",
    "Que alegria ter você aqui! Sua preferência nos move a sermos cada dia melhores. ✨",
    "Nossa cozinha já está a todo vapor para você! Muito obrigado pela confiança. 👨‍🍳",
    "Preparado com muito carinho e entregue com imensa gratidão. Valeu pela compra! ❤️",
    "Você é mais que um cliente, é parte fundamental da nossa história. Muito obrigado! 🥐"
  ];

  const randomPhrase = useMemo(() => gratitudePhrases[Math.floor(Math.random() * gratitudePhrases.length)], []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-[10%] left-[5%] animate-bounce text-brand-500"><PartyPopper size={48} /></div>
          <div className="absolute bottom-[20%] right-[10%] animate-pulse text-amber-500"><Coins size={64} /></div>
          <div className="absolute top-[40%] right-[5%] animate-bounce text-red-500"><Heart size={32} /></div>
       </div>

       <div className="z-10 animate-fade-in scale-110 mb-8">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
             <CheckCircle2 size={48} />
          </div>
          <h1 className="text-3xl font-black text-stone-900 mb-2">Pedido Confirmado!</h1>
          <p className="text-stone-500 font-medium px-4">{randomPhrase}</p>
       </div>

       {earnedCashback > 0 && (
         <div className="z-10 bg-amber-50 border border-amber-100 p-6 rounded-3xl mb-8 w-full max-w-sm shadow-lg shadow-amber-100/50 mt-4">
            <div className="flex justify-center mb-2">
               <Coins className="text-amber-500" size={32} />
            </div>
            <p className="text-amber-800 text-sm font-bold uppercase tracking-wider mb-1">Você ganhou Cashback!</p>
            <h2 className="text-2xl font-black text-amber-600 mb-1">+{formatCurrency(earnedCashback)}</h2>
            <p className="text-amber-700 text-xs font-medium">para usar na sua próxima compra!</p>
         </div>
       )}

       <div className="z-10 w-full max-w-xs space-y-3">
          <Button onClick={() => setCurrentView('order-tracking')} className="w-full">
             Acompanhar Pedido <ArrowRight size={18} />
          </Button>
          <button onClick={() => setCurrentView('shop')} className="text-stone-400 text-sm font-bold hover:text-stone-600 transition-colors py-2">
             Voltar ao Início
          </button>
       </div>
    </div>
  );
};

// --- Order Tracking View ---

const OrderTrackingView = ({ orders, setCurrentView, setOrders }: any) => {
  const activeOrders = orders.filter((o: Order) => !o.ratingSkipped && o.status !== 'cancelled' && (o.status !== 'completed' || (o.status === 'completed' && !o.rating))).reverse();
  const currentOrder = activeOrders[0];
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState('');

  if (!currentOrder) {
    // Check if there are cancelled orders recently
    const cancelledOrder = orders.find((o: Order) => o.status === 'cancelled');
    if (cancelledOrder) {
         return (
            <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                    <XCircle size={40} />
                </div>
                <h2 className="text-xl font-bold text-stone-800">Pedido Cancelado</h2>
                <p className="text-stone-500 mt-2">O pedido #{cancelledOrder.id.slice(-4)} foi cancelado pelo estabelecimento.</p>
                <Button onClick={() => setCurrentView('shop')} className="mt-6">Voltar ao Menu</Button>
            </div>
         );
    }

    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-8 text-center">
        <Package size={64} className="text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-800">Nenhum pedido ativo</h2>
        <p className="text-stone-500 mt-2">Você ainda não tem pedidos em andamento.</p>
        <Button onClick={() => setCurrentView('shop')} className="mt-6">Fazer um Pedido</Button>
      </div>
    );
  }

  // Se o pedido está completo e ainda não tem avaliação nem foi pulado, mostra tela de avaliação
  if (currentOrder.status === 'completed' && !currentOrder.rating && !currentOrder.ratingSkipped) {
      
      const handleRatingSubmit = () => {
        let msg = "";
        switch (rating) {
            case 1: msg = "Sinto muito que sua experiência não tenha sido ideal. Vamos melhorar!"; break;
            case 2: msg = "Obrigado pelo feedback. Vamos trabalhar para corrigir os pontos negativos."; break;
            case 3: msg = "Obrigado pela avaliação! Esperamos surpreender você na próxima."; break;
            case 4: msg = "Muito obrigado! Ficamos felizes que tenha gostado do seu pedido."; break;
            case 5: msg = "Uau! Muito obrigado! É um prazer ter você como cliente! ⭐"; break;
            default: msg = "Obrigado pela avaliação!";
        }
        setThankYouMessage(msg);
        setShowThankYou(true);

        setTimeout(() => {
             setOrders((prev: Order[]) => prev.map(o => o.id === currentOrder.id ? { ...o, rating, ratingComment: comment } : o));
             setShowThankYou(false);
        }, 3000);
      };

      const handleSkip = () => {
         setOrders((prev: Order[]) => prev.map(o => o.id === currentOrder.id ? { ...o, ratingSkipped: true } : o));
      };

      if (showThankYou) {
          return (
              <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-bounce">
                      <Heart size={40} fill="currentColor" />
                  </div>
                  <h2 className="text-2xl font-black text-stone-800 mb-4">Agradecemos sua avaliação!</h2>
                  <p className="text-stone-500 font-medium text-lg">{thankYouMessage}</p>
              </div>
          );
      }

      return (
          <div className="min-h-screen bg-stone-50 flex flex-col p-4 justify-center">
             <div className="bg-white p-8 rounded-3xl shadow-lg border border-stone-100 text-center space-y-6">
                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-500">
                    <Star size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-stone-800">Pedido Entregue!</h2>
                    <p className="text-stone-500 mt-2">Como foi sua experiência com o pedido <span className="font-bold">#{currentOrder.id.slice(-4)}</span>?</p>
                </div>
                
                <div className="flex justify-center gap-2 py-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                            key={star} 
                            onClick={() => setRating(star)}
                            className="transition-transform active:scale-90 hover:scale-110 focus:outline-none"
                        >
                            <Star 
                                size={40} 
                                className={star <= rating ? "text-amber-400 fill-amber-400" : "text-stone-200 fill-stone-100"} 
                                strokeWidth={star <= rating ? 0 : 1.5}
                            />
                        </button>
                    ))}
                </div>

                <textarea 
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm outline-none focus:border-brand-500 resize-none h-32"
                    placeholder="Gostaria de deixar alguma observação? (Opcional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />

                <div className="space-y-3">
                    <Button 
                        onClick={handleRatingSubmit} 
                        className="w-full"
                        disabled={rating === 0}
                    >
                        Avaliar Pedido
                    </Button>
                    <button 
                        onClick={handleSkip}
                        className="w-full py-3 text-stone-400 text-sm font-bold hover:text-stone-600"
                    >
                        Não quero avaliar agora
                    </button>
                </div>
             </div>
          </div>
      );
  }

  const statuses: { id: OrderStatus, label: string, icon: any }[] = [
    { id: 'received', label: 'Pedido Recebido', icon: <ClipboardList size={20} /> },
    { id: 'preparing', label: 'Em Preparo', icon: <Clock size={20} /> },
    { id: 'delivery', label: 'Saiu para Entrega', icon: <Navigation size={20} /> },
    { id: 'completed', label: 'Entregue', icon: <CheckCircle2 size={20} /> }
  ];

  const currentIndex = statuses.findIndex(s => s.id === currentOrder.status);

  return (
    <div className="bg-stone-50 min-h-screen pb-24">
       <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView('shop')} className="p-2 hover:bg-stone-100 rounded-full">
              <ChevronLeft size={24} className="text-stone-600" />
            </button>
            <h1 className="text-lg font-bold text-stone-800">Acompanhar Pedido</h1>
          </div>
       </div>

       <div className="p-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 text-center">
             <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Código para o Entregador</p>
             <div className="bg-brand-50 text-brand-500 inline-flex gap-3 p-4 rounded-2xl border-2 border-dashed border-brand-200">
                {currentOrder.deliveryCode.split('').map((char: string, i: number) => (
                  <span key={i} className="text-3xl font-black">{char}</span>
                ))}
             </div>
             <p className="text-xs text-stone-400 mt-4 leading-relaxed">
               Mostre este código ao entregador quando ele chegar para concluir a entrega com segurança.
             </p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-8 relative overflow-hidden">
             {statuses.map((s, idx) => {
               const isActive = idx <= currentIndex;
               const isCurrent = idx === currentIndex;
               return (
                 <div key={s.id} className="flex items-center gap-4 relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-300'}`}>
                       {s.icon}
                    </div>
                    <div>
                       <p className={`text-sm font-bold ${isActive ? 'text-stone-800' : 'text-stone-300'}`}>{s.label}</p>
                       {isCurrent && <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider animate-pulse">Acontecendo agora</p>}
                    </div>
                    {idx < statuses.length - 1 && (
                       <div className={`absolute left-5 top-10 w-0.5 h-8 ${idx < currentIndex ? 'bg-brand-500' : 'bg-stone-100'}`} />
                    )}
                 </div>
               );
             })}
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-4">
             <h3 className="text-sm font-bold text-stone-800">Resumo do Pedido #{currentOrder.id.slice(-4)}</h3>
             <div className="space-y-2">
                {currentOrder.items.map((item: CartItem) => (
                  <div key={item.id} className="flex justify-between text-xs text-stone-500">
                     <span>{item.quantity}x {item.name}</span>
                     <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
             </div>
             <div className="pt-3 border-t border-stone-100 flex justify-between font-bold text-stone-800">
                <span>Total</span>
                <span>{formatCurrency(currentOrder.total)}</span>
             </div>
          </div>
       </div>
    </div>
  );
};

// --- Chat View ---

const ChatView = ({ user, messages, setMessages, setCurrentView }: any) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.name,
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAdmin: false
    };

    setMessages((prev: Message[]) => [...prev, newMessage]);
    setInputText('');
  };

  const userMessages = messages.filter((m: Message) => m.senderId === user.id || (m.isAdmin && m.id.includes(user.id)));

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      <div className="bg-white p-4 shadow-sm flex items-center gap-3">
        <button onClick={() => setCurrentView('shop')} className="p-2 hover:bg-stone-100 rounded-full">
          <ChevronLeft size={24} className="text-stone-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-stone-800">Suporte Padaria Hortal</h1>
          <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {userMessages.map((m: Message) => (
          <div key={m.id} className={`flex ${m.isAdmin ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${m.isAdmin ? 'bg-white text-stone-800 rounded-tl-none border border-stone-100' : 'bg-brand-500 text-white rounded-tr-none'}`}>
              <p>{m.text}</p>
              <p className={`text-[10px] mt-1 text-right ${m.isAdmin ? 'text-stone-400' : 'text-brand-100'}`}>{m.timestamp}</p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-stone-100 flex gap-2">
        <input 
          type="text" 
          className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500"
          placeholder="Digite sua mensagem..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="bg-brand-500 text-white p-3 rounded-xl active:scale-90 transition-transform shadow-lg shadow-brand-100">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

// --- Profile View ---

const ProfileView = ({ user, setUser, setCurrentView, cart }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    cpf: user?.cpf || '',
    address: {
      zipCode: user?.address?.zipCode || '',
      street: user?.address?.street || '',
      number: user?.address?.number || '',
      complement: user?.address?.complement || '',
      neighborhood: user?.address?.neighborhood || '',
      city: user?.address?.city || '',
      state: user?.address?.state || ''
    }
  });

  // Ensure form is synced if user prop updates externally or on remount
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        cpf: user.cpf || '',
        address: {
          zipCode: user.address?.zipCode || '',
          street: user.address?.street || '',
          number: user.address?.number || '',
          complement: user.address?.complement || '',
          neighborhood: user.address?.neighborhood || '',
          city: user.address?.city || '',
          state: user.address?.state || ''
        }
      }));
    }
  }, [user]);

  const handleAddressChange = async (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));

    if (field === 'zipCode') {
        const cleanCep = value.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            setIsLoadingCep(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                
                if (!data.erro) {
                    setFormData((prev: any) => ({
                        ...prev,
                        address: {
                            ...prev.address,
                            street: data.logradouro,
                            neighborhood: data.bairro,
                            city: data.localidade,
                            state: data.uf,
                        }
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
            } finally {
                setIsLoadingCep(false);
            }
        }
    }
  };

const handleSave = async () => { // <--- Adicionamos o 'async' aqui
    setIsSaving(true);

    // --- PARTE NOVA: SALVA NO BANCO DE DADOS ---
    if (user && user.id) {
      try {
        await setDoc(doc(db, "users", user.id), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf,
          address: formData.address,
          // Preserva o saldo de cashback se já existir, ou inicia com 0
          cashbackBalance: user.cashbackBalance || 0 
        }, { merge: true }); // 'merge' garante que não vamos apagar outros dados do usuário
      } catch (error) {
        console.error("Erro ao salvar no Firebase:", error);
        alert("Atenção: Não foi possível salvar os dados na nuvem. Verifique sua conexão.");
      }
    }
    setUser((prev: any) => ({
      ...prev,
      ...formData
    }));
    
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
    <div className="bg-stone-50 min-h-screen pb-24">
       <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView(cart.length > 0 ? 'cart' : 'shop')} className="p-2 hover:bg-stone-100 rounded-full">
              <ChevronLeft size={24} className="text-stone-600" />
            </button>
            <h1 className="text-lg font-bold text-stone-800">Meu Perfil</h1>
          </div>
          {showSuccess && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1 animate-fade-in bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <CheckCircle2 size={16} /> Salvo
            </span>
          )}
       </div>

       <div className="p-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
             <div className="flex items-center gap-2 mb-2">
               <UserIcon className="text-brand-500" size={20} />
               <h3 className="font-bold text-stone-800">Dados Pessoais</h3>
             </div>
             
             <Input 
               label="Nome Completo" 
               value={formData.name} 
               onChange={(e: any) => setFormData({...formData, name: e.target.value})} 
             />
             <div className="flex gap-2">
               <Input 
                 label="Telefone (Opcional)" 
                 value={formData.phone} 
                 onChange={(e: any) => setFormData({...formData, phone: e.target.value})} 
                 placeholder="(00) 00000-0000"
               />
               <Input 
                 label="E-mail" 
                 value={formData.email} 
                 onChange={(e: any) => setFormData({...formData, email: e.target.value})} 
                 readOnly={true}
                 className="opacity-70 bg-stone-50"
               />
             </div>
             <Input 
               label="CPF" 
               value={formData.cpf} 
               onChange={(e: any) => setFormData({...formData, cpf: e.target.value})} 
             />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
             <div className="flex items-center gap-2 mb-2">
               <MapPin className="text-brand-500" size={20} />
               <h3 className="font-bold text-stone-800">Endereço de Entrega</h3>
             </div>

             <div className="flex gap-3">
               <div className="w-1/3">
                 <Input 
                   label="CEP" 
                   value={formData.address.zipCode} 
                   onChange={(e: any) => handleAddressChange('zipCode', e.target.value)}
                   placeholder="00000000"
                   maxLength={9}
                   icon={isLoadingCep ? <Loader2 className="animate-spin text-brand-500" size={18} /> : null}
                 />
               </div>
               <div className="flex-1">
                 <Input 
                   label="Cidade" 
                   value={formData.address.city} 
                   onChange={(e: any) => handleAddressChange('city', e.target.value)} 
                 />
               </div>
             </div>

             <div className="flex gap-3">
               <div className="flex-1">
                 <Input 
                   label="Rua" 
                   value={formData.address.street} 
                   onChange={(e: any) => handleAddressChange('street', e.target.value)} 
                 />
               </div>
               <div className="w-1/4">
                 <Input 
                   label="Nº" 
                   value={formData.address.number} 
                   onChange={(e: any) => handleAddressChange('number', e.target.value)} 
                 />
               </div>
             </div>

             <Input 
               label="Complemento" 
               value={formData.address.complement} 
               onChange={(e: any) => handleAddressChange('complement', e.target.value)}
               placeholder="Apto, Bloco, etc."
             />

             <div className="flex gap-3">
               <div className="flex-1">
                 <Input 
                   label="Bairro" 
                   value={formData.address.neighborhood} 
                   onChange={(e: any) => handleAddressChange('neighborhood', e.target.value)} 
                 />
               </div>
               <div className="w-1/4">
                 <Input 
                   label="UF" 
                   value={formData.address.state} 
                   onChange={(e: any) => handleAddressChange('state', e.target.value)}
                   maxLength={2}
                 />
               </div>
             </div>
          </div>

          <Button onClick={handleSave} className="w-full" isLoading={isSaving}>
            <Save size={18} /> Salvar Alterações
          </Button>
       </div>
    </div>
  );
};

// --- Cart View ---

const CartView = ({ cart, setCart, settings, setCurrentView, user, setUser, setOrders, setEarnedCashback }: any) => {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'money' | 'card'>('pix');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [cashGiven, setCashGiven] = useState('');
  const [cardType, setCardType] = useState<string | null>(null);
  const [useCashback, setUseCashback] = useState(false);

  const subtotal = cart.reduce((acc: number, item: CartItem) => acc + (item.price * item.quantity), 0);
  const currentDeliveryFee = fulfillmentMethod === 'delivery' ? settings.deliveryFee : 0;
  
  const cashbackDiscount = useCashback ? Math.min(subtotal + currentDeliveryFee, user?.cashbackBalance || 0) : 0;
  const total = Math.max(0, subtotal + currentDeliveryFee - cashbackDiscount);

  // More lenient check for DISPLAYING the address
  const hasSomeAddress = useMemo(() => {
    const addr = user?.address;
    return !!(addr?.street || addr?.zipCode || addr?.city);
  }, [user]);

  // Strict check for ALLOWING the order
  const isAddressComplete = useMemo(() => {
    const addr = user?.address;
    return !!(addr?.street && addr?.number && addr?.city && addr?.zipCode);
  }, [user]);

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev: CartItem[]) => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleFinishOrder = () => {
    // Update user cashback balance: Deduct used, Add earned
    const earned = !useCashback ? subtotal * settings.cashbackPercentage : 0;
    
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      customerName: user?.name || 'Cliente',
      customerPhone: user?.phone || '(17) 99999-9999',
      address: user?.address as Address,
      date: new Date().toISOString(),
      items: [...cart],
      subtotal,
      total,
      deliveryFee: currentDeliveryFee,
      paymentMethod,
      paymentDetail: paymentMethod === 'money' ? `Troco para ${cashGiven}` : (cardType || ''),
      status: 'received',
      deliveryCode: Math.floor(1000 + Math.random() * 9000).toString(),
      cashbackEarned: earned
    };
    
    const finalBalance = (user?.cashbackBalance || 0) - cashbackDiscount + earned;
    
    setUser((prev: User) => ({
      ...prev,
      cashbackBalance: finalBalance,
      orderHistory: [...(prev.orderHistory || []), newOrder]
    }));

    setOrders((prev: Order[]) => [...prev, newOrder]);
    setCart([]);
    setEarnedCashback(earned);
    setCurrentView('order-success');
  };

  const renderPaymentContent = () => {
    if (total <= 0) return (
      <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-green-700 text-center animate-fade-in">
        <p className="font-bold">Pedido 100% pago com cashback!</p>
      </div>
    );
    if (paymentMethod === 'pix') {
      const pixPayload = generatePixPayload('51290555000156', 'PADARIA HORTAL', 'SAO PAULO', total);
      return (
        <div className="bg-white p-4 rounded-xl border border-stone-100 flex flex-col items-center space-y-4 animate-fade-in">
          <div className="text-center">
            <p className="text-xs text-stone-500 uppercase font-bold tracking-wider mb-2">Escaneie o QR Code</p>
            <div className="bg-white p-2 rounded-lg border-2 border-dashed border-stone-200 inline-block">
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`} 
                 alt="QR Code Pix" 
                 className="w-48 h-48"
               />
            </div>
          </div>
          <div className="w-full">
            <p className="text-xs text-stone-500 text-center mb-2">Ou copie o código abaixo:</p>
            <div className="flex gap-2">
              <input readOnly value={pixPayload} className="flex-1 bg-stone-50 text-xs p-2 rounded border border-stone-200 text-stone-500 truncate" />
              <button onClick={() => navigator.clipboard.writeText(pixPayload)} className="bg-stone-200 p-2 rounded text-stone-600 hover:bg-stone-300">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (paymentMethod === 'money') {
      const cashValue = parseFloat(cashGiven.replace(',', '.')) || 0;
      const change = cashValue - total;
      return (
        <div className="bg-white p-4 rounded-xl border border-stone-100 space-y-4 animate-fade-in">
           <Input label="Valor Entregue (R$)" placeholder="0,00" type="number" value={cashGiven} onChange={(e: any) => setCashGiven(e.target.value)} icon={<Banknote size={18} />} />
           <div className={`p-4 rounded-xl flex justify-between items-center ${change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <span className="font-bold text-sm">Troco estimado:</span>
              <span className="font-bold text-lg">{change >= 0 ? formatCurrency(change) : 'Falta valor'}</span>
           </div>
        </div>
      );
    }
    if (paymentMethod === 'card') {
      const options = [
        { id: 'debito', label: 'Débito', icon: <CardIcon size={20} /> },
        { id: 'credito', label: 'Crédito', icon: <CardIcon size={20} /> },
        { id: 'alimentacao', label: 'Alimentação', icon: <Apple size={20} /> },
        { id: 'refeicao', label: 'Refeição', icon: <UtensilsCrossed size={20} /> },
      ];

      return (
        <div className="bg-white p-4 rounded-xl border border-stone-100 space-y-3 animate-fade-in">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest text-center mb-2">Pagar com cartão na entrega</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setCardType(opt.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${cardType === opt.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'}`}
              >
                {opt.icon}
                <span className="text-xs font-bold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
         <div className="w-24 h-24 bg-stone-200 rounded-full flex items-center justify-center text-stone-400 mb-4"><ShoppingBag size={40} /></div>
         <h2 className="text-xl font-bold text-stone-800">Sua cesta está vazia</h2>
         <Button onClick={() => setCurrentView('shop')} variant="secondary" className="mt-4">Voltar ao Cardápio</Button>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen pb-24">
       <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center gap-3">
          <button onClick={() => setCurrentView('shop')} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft size={24} className="text-stone-600" /></button>
          <h1 className="text-lg font-bold text-stone-800">Finalizar Pedido</h1>
       </div>
       <div className="p-4 space-y-6">
          <div className="space-y-3">
             <h2 className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1">Itens do Pedido</h2>
             {cart.map((item: CartItem) => (
               <div key={item.id} className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <span className="bg-stone-100 px-2 py-1 rounded text-xs font-bold text-stone-600">{item.quantity}x</span>
                     <div>
                        <p className="text-sm font-bold text-stone-800">{item.name}</p>
                        <p className="text-xs text-stone-500">{formatCurrency(item.price * item.quantity)}</p>
                        {item.observation && <p className="text-[10px] text-brand-500 italic mt-0.5">Obs: {item.observation}</p>}
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-stone-400 hover:text-brand-500"><Minus size={16}/></button>
                     <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-stone-400 hover:text-green-500"><Plus size={16}/></button>
                  </div>
               </div>
             ))}
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-100 space-y-3 shadow-sm">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Coins className="text-amber-500" size={20} />
                   <div>
                      <h3 className="text-sm font-bold text-stone-800 leading-tight">Cashback</h3>
                      <p className="text-[10px] text-stone-500">Saldo disponível: <span className="font-bold">{formatCurrency(user?.cashbackBalance || 0)}</span></p>
                   </div>
                </div>
                <button 
                  onClick={() => setUseCashback(!useCashback)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${useCashback ? 'bg-brand-500' : 'bg-stone-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useCashback ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
             </div>
             {useCashback && (
                <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-xs font-medium border border-amber-100 flex justify-between">
                   <span>Desconto aplicado:</span>
                   <span>- {formatCurrency(cashbackDiscount)}</span>
                </div>
             )}
          </div>

          <div className="space-y-3">
             <h2 className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1">Como deseja receber?</h2>
             <div className="flex p-1 bg-stone-200 rounded-2xl">
                <button 
                  onClick={() => setFulfillmentMethod('delivery')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${fulfillmentMethod === 'delivery' ? 'bg-white text-brand-500 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <Truck size={18} /> Entrega
                </button>
                <button 
                  onClick={() => setFulfillmentMethod('pickup')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${fulfillmentMethod === 'pickup' ? 'bg-white text-brand-500 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <ShoppingBag size={18} /> Retirada
                </button>
             </div>

             {fulfillmentMethod === 'delivery' ? (
                <div className="bg-white p-4 rounded-2xl border border-stone-100 space-y-3">
                   <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                        <MapPin size={16} className="text-brand-500" /> Endereço de Entrega
                      </h3>
                      <button onClick={() => setCurrentView('profile')} className="text-xs font-bold text-brand-500 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100">Editar</button>
                   </div>
                   {hasSomeAddress ? (
                      <div className="text-sm text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100 relative overflow-hidden">
                         {!isAddressComplete && (
                           <div className="absolute top-0 right-0 bg-red-100 text-red-600 px-2 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1">
                             <AlertCircle size={10} /> Incompleto
                           </div>
                         )}
                         <p className="font-bold text-stone-700">
                           {user?.address?.street || <span className="text-red-400 italic">Rua não informada</span>}, 
                           {' '}
                           {user?.address?.number || <span className="text-red-400 italic">S/N</span>}
                         </p>
                         <p>{user?.address?.neighborhood} - {user?.address?.city}/{user?.address?.state}</p>
                         <p className="text-xs mt-1 text-stone-400">CEP: {user?.address?.zipCode}</p>
                         
                         {!isAddressComplete && (
                           <button onClick={() => setCurrentView('profile')} className="mt-2 text-xs text-red-500 font-bold underline">
                             Clique para completar o endereço
                           </button>
                         )}
                      </div>
                   ) : (
                      <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl space-y-3 animate-pulse">
                         <div className="flex gap-2 text-brand-500">
                            <AlertCircle size={20} className="flex-shrink-0" />
                            <p className="text-xs font-bold">Endereço Incompleto!</p>
                         </div>
                         <p className="text-xs text-brand-500">Cadastre seu endereço para que possamos realizar a entrega do seu pedido.</p>
                         <Button onClick={() => setCurrentView('profile')} className="w-full py-2 text-xs bg-brand-500 hover:bg-brand-600 shadow-none">
                            Cadastrar Endereço <ArrowRight size={14} />
                         </Button>
                      </div>
                   )}
                </div>
             ) : (
                <div className="bg-white p-4 rounded-2xl border border-stone-100 space-y-2">
                   <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                      <Store size={16} className="text-brand-500" /> Local de Retirada
                   </h3>
                   <div className="text-sm text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <p className="font-bold text-stone-700">Padaria Hortal</p>
                      <p>Rua Francisco de almeida, 218</p>
                      <p>Jd Santo Antônio - Bebedouro SP</p>
                      <p className="flex items-center gap-1 mt-1 text-brand-500 font-medium"><Phone size={14} /> (17) 99253-7394</p>
                      <p className="text-[10px] mt-2 text-green-600 font-bold uppercase tracking-wider">Pronto em 20-30 min</p>
                   </div>
                </div>
             )}
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1 mb-2">Forma de Pagamento</h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button disabled={total <= 0} onClick={() => setPaymentMethod('pix')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all disabled:opacity-30 ${paymentMethod === 'pix' && total > 0 ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-100 bg-stone-50 text-stone-400'}`}>
                <QrCode size={20} className="mb-1" /><span className="text-[10px] font-bold">PIX</span>
              </button>
              <button disabled={total <= 0} onClick={() => setPaymentMethod('money')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all disabled:opacity-30 ${paymentMethod === 'money' && total > 0 ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-100 bg-stone-50 text-stone-400'}`}>
                <Banknote size={20} className="mb-1" /><span className="text-[10px] font-bold">Dinheiro</span>
              </button>
              <button disabled={total <= 0} onClick={() => setPaymentMethod('card')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all disabled:opacity-30 ${paymentMethod === 'card' && total > 0 ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-100 bg-stone-50 text-stone-400'}`}>
                <CreditCard size={20} className="mb-1" /><span className="text-[10px] font-bold">Cartão</span>
              </button>
            </div>
            {renderPaymentContent()}
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 space-y-2">
             <div className="flex justify-between text-sm text-stone-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
             <div className="flex justify-between text-sm text-stone-500">
                <span>{fulfillmentMethod === 'delivery' ? 'Taxa de entrega' : 'Taxa de entrega (Isento)'}</span>
                <span className={fulfillmentMethod === 'pickup' ? 'text-green-600 font-bold' : ''}>
                  {fulfillmentMethod === 'delivery' ? formatCurrency(settings.deliveryFee) : 'Grátis'}
                </span>
             </div>
             {useCashback && (
                <div className="flex justify-between text-sm text-amber-600 font-medium"><span>Desconto Cashback</span><span>- {formatCurrency(cashbackDiscount)}</span></div>
             )}
             <div className="border-t border-stone-100 pt-3 flex justify-between items-end mt-2">
               <span className="font-bold text-lg text-stone-800">Total</span>
               <span className="font-bold text-2xl text-stone-800">{formatCurrency(total)}</span>
             </div>
             <Button 
                onClick={handleFinishOrder} 
                className="w-full mt-4 bg-brand-500 hover:bg-brand-600" 
                disabled={
                   (total > 0 && paymentMethod === 'card' && !cardType) || 
                   (total > 0 && paymentMethod === 'money' && (parseFloat(cashGiven.replace(',','.')) || 0) < total) ||
                   (fulfillmentMethod === 'delivery' && !isAddressComplete)
                }
             >
                {fulfillmentMethod === 'delivery' && !isAddressComplete ? 'Completar Endereço' : 'Confirmar Pedido'}
             </Button>
          </div>
       </div>
    </div>
  );
};

// --- Admin View ---

const AdminView = ({ products, setProducts, settings, setSettings, setCurrentView, orders, setOrders, messages, setMessages, user, setUser, allUsers }: any) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'messages' | 'products' | 'settings' | 'analytics' | 'manual-order' | 'customers'>('orders');
  const [orderSubTab, setOrderSubTab] = useState<'active' | 'history'>('active');
  const [selectedUserChat, setSelectedUserChat] = useState<string | null>(null);
  const [adminInput, setAdminInput] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({ category: 'panificacao' });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [verificationCodes, setVerificationCodes] = useState<Record<string, string>>({});
  const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);
  const [searchUser, setSearchUser] = useState('');

  // Manual Order State
  const [manualOrderItems, setManualOrderItems] = useState<CartItem[]>([]);
  const [manualCustomer, setManualCustomer] = useState({ name: '', phone: '', zip: '', street: '', number: '', neighborhood: '', city: '' });
  const [manualPayment, setManualPayment] = useState<'pix' | 'money' | 'card'>('money');
  const [manualSearch, setManualSearch] = useState('');

  const analyticsData = [{ name: 'Seg', vendas: 400 }, { name: 'Ter', vendas: 300 }, { name: 'Qua', vendas: 550 }, { name: 'Qui', vendas: 450 }, { name: 'Sex', vendas: 890 }, { name: 'Sab', vendas: 1200 }, { name: 'Dom', vendas: 900 }];

  // Helper for Payment Translation
  const paymentMap: Record<string, string> = { pix: 'Pix', money: 'Dinheiro', card: 'Cartão' };

  // Unique users who have sent messages
  const chatUsers = useMemo(() => {
    const users: Record<string, string> = {};
    messages.forEach((m: Message) => {
      if (!m.isAdmin) users[m.senderId] = m.senderName;
    });
    return Object.entries(users);
  }, [messages]);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((u: User) => 
        u.role !== 'admin' && 
        (u.name.toLowerCase().includes(searchUser.toLowerCase()) || 
         u.email.toLowerCase().includes(searchUser.toLowerCase()))
    );
  }, [allUsers, searchUser]);

  const handleAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminInput.trim() || !selectedUserChat) return;

    const reply: Message = {
      id: `admin-${selectedUserChat}-${Date.now()}`,
      senderId: 'admin',
      senderName: 'Padaria Hortal',
      text: adminInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAdmin: true
    };

    setMessages((prev: Message[]) => [...prev, reply]);
    setAdminInput('');
  };

  const handleUpdateStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders((prev: Order[]) => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
  };

  const handleCancelOrder = (order: Order) => {
     if (!window.confirm(`Tem certeza que deseja cancelar o pedido #${order.id.slice(-4)}?`)) return;

     handleUpdateStatus(order.id, 'cancelled');

     // Deduct cashback from the global user state (assuming single-user context for this demo)
     if (order.cashbackEarned && order.cashbackEarned > 0) {
         if (user) {
             // In a real app we would find the user by ID, here we assume current user
             setUser((prev: User) => ({
                 ...prev,
                 cashbackBalance: Math.max(0, prev.cashbackBalance - (order.cashbackEarned || 0))
             }));
             alert(`Pedido cancelado e ${formatCurrency(order.cashbackEarned)} de cashback estornado.`);
         }
     } else {
         alert("Pedido cancelado.");
     }
  };

  const handleVerifyCode = (orderId: string, actualCode: string) => {
    const inputCode = verificationCodes[orderId];
    if (inputCode === actualCode) {
      handleUpdateStatus(orderId, 'completed');
      alert("Pedido finalizado com sucesso!");
    } else {
      alert("Código de verificação incorreto!");
    }
  };

  const handlePrintOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 5px 0;">${item.quantity}x ${item.name}</td>
        <td style="text-align: right; padding: 5px 0;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    const paymentMapPrint: Record<string, string> = { pix: 'PIX', money: 'DINHEIRO', card: 'CARTÃO' };

    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido #${order.id.slice(-4)}</title>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              margin: 0 auto; 
              padding: 10px; 
              font-size: 12px; 
              color: #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .dashed { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            .total-row { font-size: 14px; font-weight: bold; }
            .footer { margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">${APP_NAME}</div>
          <div class="center">${APP_SUBTITLE}</div>
          <div class="center">Tel: (17) 99253-7394</div>
          <div class="dashed"></div>
          <div><b>PEDIDO:</b> #${order.id.slice(-4)}</div>
          <div><b>DATA:</b> ${new Date(order.date).toLocaleString('pt-BR')}</div>
          <div class="dashed"></div>
          <div><b>CLIENTE:</b> ${order.customerName}</div>
          <div><b>TEL:</b> ${order.customerPhone}</div>
          <div><b>ENDEREÇO:</b><br/>${order.address.street}, ${order.address.number}<br/>${order.address.neighborhood} - ${order.address.city}</div>
          <div class="dashed"></div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">QTD ITEM</th>
                <th style="text-align: right;">VALOR</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="dashed"></div>
          <div><b>PAGAMENTO:</b> ${paymentMapPrint[order.paymentMethod] || order.paymentMethod.toUpperCase()} ${order.paymentDetail ? `(${order.paymentDetail})` : ''}</div>
          <div class="dashed"></div>
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.subtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Taxa Entrega:</span>
            <span>${formatCurrency(order.deliveryFee)}</span>
          </div>
          <div class="total-row" style="display: flex; justify-content: space-between; margin-top: 5px;">
            <span>TOTAL:</span>
            <span>${formatCurrency(order.total)}</span>
          </div>
          <div class="dashed"></div>
          <div class="center footer">
            Obrigado pela preferência!<br/>
            Este cupom não tem valor fiscal.
          </div>
          <div class="center" style="margin-top: 20px;">.</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleGenerateAI = async () => {
    if (!editingProduct.name || !editingProduct.category) return;
    setIsGeneratingAI(true);
    const desc = await generateProductDescription(editingProduct.name, editingProduct.category as ProductCategory);
    const price = await suggestPrice(editingProduct.name, editingProduct.category as ProductCategory);
    setEditingProduct(prev => ({ ...prev, description: desc, price: prev.price || price }));
    setIsGeneratingAI(false);
  };

  const handleSaveProduct = () => {
    if (!editingProduct.name || !editingProduct.price) return;
    const newProduct: Product = {
      id: editingProduct.id || Date.now().toString(),
      name: editingProduct.name,
      description: editingProduct.description || '',
      price: Number(editingProduct.price),
      category: editingProduct.category as ProductCategory,
      image: editingProduct.image || `https://picsum.photos/400/400?random=${Date.now()}`,
      active: editingProduct.active ?? true
    };
    if (editingProduct.id) { setProducts((prev: Product[]) => prev.map(p => p.id === newProduct.id ? newProduct : p)); }
    else { setProducts((prev: Product[]) => [newProduct, ...prev]); }
    setEditingProduct({ category: 'panificacao' });
  };

  const toggleProductActive = (id: string) => {
    setProducts((prev: Product[]) => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  // Manual Order Handlers
  const addManualItem = (product: Product) => {
    setManualOrderItems(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateManualQty = (id: string, delta: number) => {
    setManualOrderItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const finalizeManualOrder = () => {
    if (!manualCustomer.name || manualOrderItems.length === 0) return;
    
    const subtotal = manualOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const newOrder: Order = {
      id: 'M-' + Math.random().toString(36).substr(2, 7).toUpperCase(),
      customerName: manualCustomer.name,
      customerPhone: manualCustomer.phone,
      address: {
        zipCode: manualCustomer.zip,
        street: manualCustomer.street,
        number: manualCustomer.number,
        neighborhood: manualCustomer.neighborhood,
        city: manualCustomer.city,
        state: 'SP'
      },
      date: new Date().toISOString(),
      items: [...manualOrderItems],
      subtotal,
      total: subtotal + settings.deliveryFee,
      deliveryFee: settings.deliveryFee,
      paymentMethod: manualPayment,
      status: 'received',
      deliveryCode: Math.floor(1000 + Math.random() * 9000).toString()
    };

    setOrders((prev: Order[]) => [...prev, newOrder]);
    setManualOrderItems([]);
    setManualCustomer({ name: '', phone: '', zip: '', street: '', number: '', neighborhood: '', city: '' });
    setActiveTab('orders');
    alert("Pedido manual criado com sucesso!");
  };

  return (
    <div className="pb-24 bg-stone-50 min-h-screen">
      <div className="bg-stone-900 text-white p-6 rounded-b-[30px] mb-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="text-brand-50" /> Admin</h2>
          <button onClick={() => {
            signOut(auth);
            setCurrentView('login');
          }} className="bg-stone-800 p-2 rounded-lg hover:bg-stone-700 transition-colors"><LogOut size={18}/></button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[
            { id: 'orders', label: 'Pedidos', icon: <Package size={16} /> },
            { id: 'manual-order', label: 'Criar Pedido', icon: <UserPlus size={16} /> },
            { id: 'customers', label: 'Clientes', icon: <Users size={16} /> },
            { id: 'messages', label: 'Mensagens', icon: <MessageSquare size={16} /> },
            { id: 'analytics', label: 'Painel', icon: <TrendingUp size={16} /> },
            { id: 'products', label: 'Estoque', icon: <UtensilsCrossed size={16} /> },
            { id: 'settings', label: 'Configurações', icon: <Settings size={16} /> }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-500 text-white shadow-lg' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="px-4">
        {activeTab === 'orders' && (
          <div className="space-y-4">
             <div className="flex p-1 bg-stone-200 rounded-xl mb-4">
                <button 
                   onClick={() => setOrderSubTab('active')} 
                   className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${orderSubTab === 'active' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}
                >
                   Ativos
                </button>
                <button 
                   onClick={() => setOrderSubTab('history')} 
                   className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${orderSubTab === 'history' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}
                >
                   Histórico
                </button>
             </div>

             {orderSubTab === 'active' ? (
                 orders.filter((o: Order) => o.status !== 'completed' && o.status !== 'cancelled').length === 0 ? (
                   <div className="text-center py-20 text-stone-400">Nenhum pedido ativo no momento.</div>
                 ) : (
                   orders.filter((o: Order) => o.status !== 'completed' && o.status !== 'cancelled').reverse().map((o: Order) => (
                     <div key={o.id} className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100 space-y-4">
                        <div className="flex justify-between items-center">
                           <div>
                              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Pedido #{o.id.slice(-4)}</p>
                              <h4 className="font-bold text-stone-800">{o.customerName}</h4>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => handlePrintOrder(o)}
                                className="p-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-brand-50 hover:text-brand-500 transition-colors"
                                title="Imprimir Cupom"
                              >
                                 <Printer size={18} />
                              </button>
                              <span className="bg-brand-50 text-brand-500 text-[10px] font-black uppercase px-2 py-1 rounded-full flex items-center">{o.status}</span>
                           </div>
                        </div>

                        <div className="text-xs text-stone-500 space-y-1">
                           <p className="flex items-center gap-2 font-medium"><MapPin size={14} className="text-stone-300" /> {o.address.street}, {o.address.number}</p>
                           <p className="flex items-center gap-2"><Phone size={14} className="text-stone-300" /> {o.customerPhone}</p>
                           <p className="flex items-center gap-2 capitalize"><CreditCard size={14} className="text-stone-300" /> {paymentMap[o.paymentMethod]} {o.paymentDetail && `(${o.paymentDetail})`}</p>
                        </div>

                        <div className="bg-stone-50 rounded-2xl p-3 space-y-2">
                           {o.items.map(item => (
                             <div key={item.id} className="flex justify-between text-xs">
                                <span className="text-stone-600">{item.quantity}x {item.name}</span>
                                <span className="font-bold text-stone-800">{formatCurrency(item.price * item.quantity)}</span>
                             </div>
                           ))}
                           <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-800">
                              <span>Total</span>
                              <span>{formatCurrency(o.total)}</span>
                           </div>
                        </div>

                        <div className="flex flex-col gap-2">
                           <div className="flex gap-2">
                               {o.status === 'received' && <Button onClick={() => handleUpdateStatus(o.id, 'preparing')} className="flex-1 py-2 text-xs">Preparar</Button>}
                               {o.status === 'preparing' && <Button onClick={() => handleUpdateStatus(o.id, 'delivery')} className="flex-1 py-2 text-xs" variant="success">Saiu para Entrega</Button>}
                               {o.status === 'delivery' && (
                                 <div className="flex-1 flex gap-2">
                                    <input 
                                      type="text" 
                                      placeholder="Código do cliente" 
                                      className="w-1/2 px-3 py-2 text-xs border border-stone-200 rounded-xl outline-none focus:border-brand-500"
                                      value={verificationCodes[o.id] || ''}
                                      onChange={(e) => setVerificationCodes({ ...verificationCodes, [o.id]: e.target.value })}
                                    />
                                    <Button onClick={() => handleVerifyCode(o.id, o.deliveryCode)} className="flex-1 py-2 text-xs bg-brand-500">Concluir</Button>
                                 </div>
                               )}
                           </div>
                           <Button onClick={() => handleCancelOrder(o)} className="w-full py-2 text-xs" variant="danger">
                               Cancelar Pedido
                           </Button>
                        </div>
                     </div>
                   ))
                 )
             ) : (
                <div className="space-y-3">
                    {orders.filter((o: Order) => o.status === 'completed' || o.status === 'cancelled').length === 0 ? (
                        <div className="text-center py-20 text-stone-400">Histórico vazio.</div>
                    ) : (
                        orders.filter((o: Order) => o.status === 'completed' || o.status === 'cancelled').reverse().map((o: Order) => (
                            <div key={o.id} className="bg-white p-4 rounded-2xl border border-stone-100 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${o.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {o.status === 'completed' ? 'Concluído' : 'Cancelado'}
                                        </span>
                                        <span className="text-xs text-stone-400">#{o.id.slice(-4)}</span>
                                    </div>
                                    <p className="font-bold text-stone-800 text-sm">{o.customerName}</p>
                                    <p className="text-xs text-stone-500">{new Date(o.date).toLocaleDateString('pt-BR')} - {new Date(o.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                                    <p className="text-xs text-stone-400 mt-1 capitalize">{paymentMap[o.paymentMethod]} - {formatCurrency(o.total)}</p>
                                </div>
                                <button onClick={() => handlePrintOrder(o)} className="p-2 text-stone-400 hover:text-stone-600"><Printer size={18} /></button>
                            </div>
                        ))
                    )}
                </div>
             )}
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-6 pb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
              <h3 className="font-bold text-stone-800 flex items-center gap-2"><Users className="text-brand-500" size={20} /> Base de Clientes</h3>
              <div className="relative">
                 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                 <input 
                   className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border-none text-sm outline-none focus:ring-2 focus:ring-brand-500"
                   placeholder="Buscar por nome ou email..."
                   value={searchUser}
                   onChange={(e)=>setSearchUser(e.target.value)}
                 />
              </div>
              
              <div className="space-y-3">
                 {filteredUsers.length === 0 ? (
                   <p className="text-center text-stone-400 py-4">Nenhum cliente encontrado.</p>
                 ) : (
                   filteredUsers.map((u: User) => (
                     <div key={u.id} className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex items-center justify-between">
                        <div>
                           <p className="font-bold text-stone-800 text-sm">{u.name}</p>
                           <p className="text-xs text-stone-500">{u.email}</p>
                           <p className="text-xs text-stone-400 mt-1 flex items-center gap-1"><Phone size={10} /> {u.phone || 'Sem telefone'}</p>
                           {u.address?.city && (
                              <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                                <MapPin size={10} /> {u.address.city}/{u.address.state}
                              </p>
                           )}
                        </div>
                        <div className="text-right">
                           <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-lg border border-amber-200 shadow-sm mb-1">
                              <Coins size={10} className="text-amber-500" />
                              <span className="text-[10px] font-black">{formatCurrency(u.cashbackBalance)}</span>
                           </div>
                           <p className="text-[10px] text-stone-400">Cashback</p>
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'manual-order' && (
          <div className="space-y-6 max-w-2xl mx-auto pb-10">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-4">
                <h3 className="font-bold text-stone-800 flex items-center gap-2"><UserPlus className="text-brand-500" /> Dados do Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input label="Nome" placeholder="Ex: João Silva" value={manualCustomer.name} onChange={(e:any)=>setManualCustomer({...manualCustomer, name: e.target.value})} />
                   <Input label="Telefone" placeholder="(17) 99999-9999" value={manualCustomer.phone} onChange={(e:any)=>setManualCustomer({...manualCustomer, phone: e.target.value})} />
                   <Input label="CEP" placeholder="15800-000" value={manualCustomer.zip} onChange={(e:any)=>setManualCustomer({...manualCustomer, zip: e.target.value})} />
                   <Input label="Rua/Av" value={manualCustomer.street} onChange={(e:any)=>setManualCustomer({...manualCustomer, street: e.target.value})} />
                   <Input label="Número" value={manualCustomer.number} onChange={(e:any)=>setManualCustomer({...manualCustomer, number: e.target.value})} />
                   <Input label="Bairro" value={manualCustomer.neighborhood} onChange={(e:any)=>setManualCustomer({...manualCustomer, neighborhood: e.target.value})} />
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-4">
                <h3 className="font-bold text-stone-800">Produtos</h3>
                <div className="relative mb-4">
                   <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                   <input 
                     className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border-none text-sm outline-none focus:ring-2 focus:ring-brand-500"
                     placeholder="Buscar produto..."
                     value={manualSearch}
                     onChange={(e)=>setManualSearch(e.target.value)}
                   />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto no-scrollbar">
                   {products.filter((p:Product)=>p.name.toLowerCase().includes(manualSearch.toLowerCase())).map((p:Product)=>(
                     <button key={p.id} onClick={()=>addManualItem(p)} className="flex items-center gap-3 p-2 rounded-xl border border-stone-100 hover:bg-stone-50 transition-colors text-left">
                        <img src={p.image} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="flex-1">
                           <p className="text-xs font-bold text-stone-800 line-clamp-1">{p.name}</p>
                           <p className="text-[10px] text-stone-500">{formatCurrency(p.price)}</p>
                        </div>
                        <Plus size={16} className="text-brand-500" />
                     </button>
                   ))}
                </div>

                <div className="pt-4 border-t border-stone-100 space-y-2">
                   {manualOrderItems.map(item => (
                     <div key={item.id} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl">
                        <span className="text-xs font-bold text-stone-800">{item.name}</span>
                        <div className="flex items-center gap-2">
                           <button onClick={()=>updateManualQty(item.id, -1)} className="p-1 text-stone-400 hover:text-brand-500"><Minus size={14}/></button>
                           <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                           <button onClick={()=>updateManualQty(item.id, 1)} className="p-1 text-stone-400 hover:text-green-500"><Plus size={14}/></button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-4">
                <h3 className="font-bold text-stone-800">Pagamento</h3>
                <div className="grid grid-cols-3 gap-2">
                   {['pix', 'money', 'card'].map(m => (
                     <button key={m} onClick={()=>setManualPayment(m as any)} className={`p-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase ${manualPayment === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-stone-100 text-stone-400'}`}>
                        {paymentMap[m]}
                     </button>
                   ))}
                </div>
                <div className="pt-4 flex justify-between items-center">
                   <p className="text-sm font-bold text-stone-500">Total com Entrega:</p>
                   <p className="text-xl font-black text-brand-500">{formatCurrency(manualOrderItems.reduce((acc, i) => acc + (i.price * i.quantity), 0) + settings.deliveryFee)}</p>
                </div>
                <Button onClick={finalizeManualOrder} className="w-full bg-brand-500 hover:bg-brand-600" disabled={manualOrderItems.length === 0 || !manualCustomer.name}>
                   Salvar Pedido Manual
                </Button>
             </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="flex flex-col h-[60vh] bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
            {!selectedUserChat ? (
              <div className="flex-1 p-4 space-y-2">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest px-2 mb-4">Conversas Ativas</h3>
                {chatUsers.length === 0 ? (
                  <p className="text-center text-stone-400 py-10">Nenhuma mensagem ainda.</p>
                ) : (
                  chatUsers.map(([id, name]) => (
                    <button key={id} onClick={() => setSelectedUserChat(id)} className="w-full text-left p-4 hover:bg-stone-50 border-b border-stone-50 flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-stone-800">{name}</p>
                        <p className="text-xs text-stone-400 line-clamp-1">{messages.filter(m => m.senderId === id || m.id.includes(id)).slice(-1)[0]?.text}</p>
                      </div>
                      <ChevronRight size={18} className="text-stone-300 group-hover:text-brand-500" />
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                  <button onClick={() => setSelectedUserChat(null)} className="flex items-center gap-2 text-xs font-bold text-brand-500">
                    <ChevronLeft size={16} /> Voltar
                  </button>
                  <p className="font-bold text-stone-800">Chat com {chatUsers.find(u => u[0] === selectedUserChat)?.[1]}</p>
                  <div className="w-8" />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                  {messages.filter(m => m.senderId === selectedUserChat || m.id.includes(selectedUserChat)).map((m: Message) => (
                    <div key={m.id} className={`flex ${m.isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-xs shadow-sm ${m.isAdmin ? 'bg-brand-500 text-white rounded-tr-none' : 'bg-stone-100 text-stone-800 rounded-tl-none border border-stone-200'}`}>
                        <p>{m.text}</p>
                        <p className={`text-[9px] mt-1 text-right opacity-70`}>{m.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAdminReply} className="p-3 border-t border-stone-100 flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500"
                    placeholder="Responder..."
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                  />
                  <button type="submit" className="bg-brand-500 text-white p-2 rounded-xl">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
              <h3 className="font-bold text-stone-700 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-brand-500" /> Vendas Semanais</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#78716c'}} dy={10} />
                    <Tooltip cursor={{fill: '#fff7ed'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="vendas" fill="#ea1d2c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'products' && (
          <div className="space-y-6 pb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <h3 className="font-bold text-lg mb-4">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3>
              <div className="space-y-4">
                 <Input label="Nome" value={editingProduct.name || ''} onChange={(e: any) => setEditingProduct({...editingProduct, name: e.target.value})} />
                 <Button type="button" variant="outline" onClick={handleGenerateAI} isLoading={isGeneratingAI} disabled={!editingProduct.name}><Sparkles size={18} /> AI Assistente</Button>
                 <Input label="Preço (R$)" type="number" step="0.01" value={editingProduct.price || ''} onChange={(e: any) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                 <Button onClick={handleSaveProduct} className="w-full bg-brand-500 hover:bg-brand-600">Salvar Produto</Button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
               <h3 className="font-bold text-stone-800">Produtos Cadastrados</h3>
               <div className="space-y-2">
                  {products.map((p: Product) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 group">
                       <div className="flex items-center gap-3">
                          <img src={p.image} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                             <p className="text-xs font-bold text-stone-800">{p.name}</p>
                             <p className="text-[10px] text-stone-500">{formatCurrency(p.price)}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditingProduct(p)}
                            className="p-2 text-stone-400 hover:text-brand-500 hover:bg-white rounded-lg transition-all"
                            title="Editar"
                          >
                             <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => toggleProductActive(p.id)}
                            className={`p-2 rounded-lg transition-all ${p.active ? 'text-green-600 hover:bg-green-100' : 'text-stone-300 hover:bg-stone-200'}`}
                            title={p.active ? 'Desativar' : 'Ativar'}
                          >
                             {p.active ? <Eye size={18} /> : <EyeOff size={18} />}
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-stone-800">Configurações Gerais</h3>
                {showSettingsSuccess && (
                  <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full animate-fade-in">Salvo!</span>
                )}
             </div>
             <Input label="Taxa de Entrega (R$)" type="number" step="0.50" value={settings.deliveryFee} onChange={(e: any) => setSettings({...settings, deliveryFee: parseFloat(e.target.value) || 0})} />
             <Input 
               label="Porcentagem de Cashback (%)" 
               type="number" 
               step="1" 
               value={settings.cashbackPercentage * 100} 
               onChange={(e: any) => setSettings({...settings, cashbackPercentage: (parseFloat(e.target.value) || 0) / 100})} 
             />
             <Button onClick={() => {
                setShowSettingsSuccess(true);
                setTimeout(() => setShowSettingsSuccess(false), 2000);
             }} className="w-full bg-brand-500 hover:bg-brand-600">Salvar</Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Shop View ---

const ProductRow = ({ product, cart, updateCartQuantity, updateObservation }: any) => {
  if (!product) return null;

  const cartItem = cart.find((item: CartItem) => item.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const [showObs, setShowObs] = useState(!!cartItem?.observation);

  return (
    <div className="px-4 pb-2">
       <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex gap-4 relative group">
            <div className="flex-1 flex flex-col">
               <h3 className="font-bold text-stone-800 text-base leading-tight mb-1 line-clamp-1">{product.name}</h3>
               <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed flex-1">{product.description}</p>
               
               <div className="mt-3 flex items-center gap-2">
                 <span className="font-bold text-stone-900 text-base">{formatCurrency(product.price)}</span>
                 {product.oldPrice && (
                   <span className="text-xs text-stone-400 line-through">{formatCurrency(product.oldPrice)}</span>
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
                      onClick={() => updateCartQuantity(product.id, 1)} 
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

const ShopView = ({ products, cart, setCart, setCurrentView, settings, orders, user }: any) => {
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      // Filter out inactive products
      if (p.active === false) return false;
      
      const matchesCategory = category === 'all' || p.category === category;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, searchTerm, products]);

  const activeOrdersCount = orders.filter((o: Order) => o.status !== 'completed').length;
  const cartTotal = cart.reduce((acc: number, item: CartItem) => acc + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((acc: number, item: CartItem) => acc + item.quantity, 0);

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev: CartItem[]) => {
      const existing = prev.find(item => item.id === productId);
      if (existing) {
        return prev.map(item => item.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0);
      }
      if (delta > 0) {
        const product = products.find((p: Product) => p.id === productId);
        return [...prev, { ...product, quantity: delta }];
      }
      return prev;
    });
  };

  const updateObservation = (productId: string, observation: string) => {
    setCart((prev: CartItem[]) => prev.map(item => item.id === productId ? { ...item, observation } : item));
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
                  onClick={() => {
                    signOut(auth);
                    setCurrentView('login');
                  }} 
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
          {filteredProducts.map((product: Product) => (
             <ProductRow 
                key={product.id}
                product={product}
                cart={cart}
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

// --- Login View ---

const LoginView = ({ setCurrentView, setUser, setAllUsers }: any) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', cpf: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (isRegistering) {
        if (!formData.name) throw new Error("Por favor, informe seu nome.");
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(userCredential.user, { displayName: formData.name });
        // NOTE: In a complete app, we would save CPF and other details to Firestore here
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      
      // Navigation is handled by the onAuthStateChanged listener in App component
    } catch (error: any) {
      console.error(error);
      let msg = "Ocorreu um erro. Tente novamente.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') msg = "E-mail ou senha incorretos.";
      if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já está cadastrado.";
      if (error.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
      setErrorMsg(msg);
      setIsLoading(false); // Stop loading only on error, otherwise let the view switch
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-between p-6 text-white relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-brand-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px]" />
       </div>
       <div className="z-10 w-full max-w-sm flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-stone-800 rounded-2xl mx-auto flex items-center justify-center mb-6 border border-stone-700"><Store size={40} className="text-brand-500" /></div>
            <h1 className="text-3xl font-bold">{APP_NAME}</h1>
            <p className="text-stone-400">{isRegistering ? 'Crie sua conta' : 'Acesse sua conta'}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 bg-stone-800/50 p-6 rounded-3xl backdrop-blur-sm border border-stone-700/50">
             {isRegistering && <Input placeholder="Nome Completo" icon={<UserIcon size={18} />} value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} />}
             <Input placeholder="E-mail" type="email" icon={<Mail size={18} />} value={formData.email} onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} />
             <Input placeholder="Senha" type="password" icon={<Lock size={18} />} value={formData.password} onChange={(e: any) => setFormData({ ...formData, password: e.target.value })} />
             {isRegistering && <Input placeholder="CPF (Opcional)" icon={<FileText size={18} />} value={formData.cpf} onChange={(e: any) => setFormData({ ...formData, cpf: e.target.value })} />}
             
             {errorMsg && <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded-lg border border-red-900/50">{errorMsg}</p>}
             
             <Button type="submit" className="w-full mt-2 bg-brand-500 hover:bg-brand-600" isLoading={isLoading}>{isRegistering ? 'Cadastrar' : 'Entrar'}</Button>
          </form>
          <button type="button" onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }} className="w-full text-center mt-6 text-sm text-stone-400 hover:text-white transition-colors">{isRegistering ? 'Já tem conta? Entrar' : 'Não tem conta? Registre-se'}</button>
       </div>
       <div className="z-10 w-full text-center py-6 mt-8 border-t border-stone-800/50 text-xs text-stone-500">
          Padaria Hortal<br />
          Rua Francisco de almeida, 218 - Jd Santo Antônio<br />
          Bebedouro SP<br />
          <span className="flex items-center justify-center gap-1 mt-1"><Phone size={12} /> (17) 99253-7394</span>
       </div>
    </div>
  );
};

// --- Main Component ---

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('login');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [earnedCashback, setEarnedCashback] = useState(0);

  // Lista de usuários (inicialmente local, pode ser expandida para carregar do Firebase depois)
  const [allUsers, setAllUsers] = useState<User[]>([
    {
        id: 'c1',
        name: 'Maria Oliveira',
        email: 'maria@email.com',
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
        phone: '(17) 99876-5432',
        role: 'customer',
        cashbackBalance: 5.00,
        orderHistory: [],
        address: { zipCode: '14701-000', street: 'Av. Paulista', number: '500', neighborhood: 'Jardim', city: 'Bebedouro', state: 'SP' }
    }
  ]);

  // 1. Monitor de Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Define se é admin pelo e-mail (ajuste conforme seu e-mail de admin)
        const isAdmin = currentUser.email === 'admin@hortal.com';
        
        setUser({
          id: currentUser.uid,
          name: currentUser.displayName || 'Cliente',
          email: currentUser.email || '',
          role: isAdmin ? 'admin' : 'customer',
          cashbackBalance: 0, 
          orderHistory: [],
          address: { zipCode: '', street: '', number: '', neighborhood: '', city: '', state: '' }
        });

        setCurrentView(isAdmin ? 'admin' : 'shop');
      } else {
        setUser(null);
        setCurrentView('login');
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. NOVO: Monitor de Pedidos em Tempo Real (Para o Admin)
  useEffect(() => {
    // Só executa se o usuário logado for admin
    if (user && user.role === 'admin') {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const ordersData: Order[] = [];
        querySnapshot.forEach((doc) => {
          // Converte os dados do Firebase e injeta o ID do documento
          ordersData.push({ id: doc.id, ...doc.data() } as Order);
        });
        // Atualiza o estado global de pedidos
        setOrders(ordersData);
      });

      return () => unsubscribe();
    }
  }, [user?.role]);

  // Renderização das Telas
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
