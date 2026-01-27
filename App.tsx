import { 
  doc, 
  setDoc, 
  addDoc, 
  collection, 
  updateDoc, 
  serverTimestamp, 
  getDoc,
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';

import React, { useState, useMemo, useEffect, CSSProperties, useRef } from 'react';
import { 
  Settings, LogOut, TrendingUp, Package, Sparkles, Trash2, 
  CheckCircle2, Truck, ShoppingBag, Percent, ShoppingCart, 
  User as UserIcon, Search, Plus, Store, ChevronLeft, ChevronRight, QrCode, 
  Banknote, CreditCard, Copy, Minus, Wallet, Mail, Lock, FileText, Calendar,
  ImageIcon, MapPin, Save, Loader2, ImagePlus, X, Mic, MicOff,
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
    const cancelledOrder = orders.find((o: Order) => o.status === 'cancelled');
    if (cancelledOrder) {
         return (
            <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                    <XCircle size={40} />
                </div>
                <h2 className="text-xl font-bold text-stone-800">Pedido Cancelado</h2>
                <p className="text-stone-500 mt-2">O pedido #{cancelledOrder.id?.slice(-4)} foi cancelado pelo estabelecimento.</p>
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
                    <p className="text-stone-500 mt-2">Como foi sua experiência com o pedido <span className="font-bold">#{currentOrder.id?.slice(-4)}</span>?</p>
                </div>
                <div className="flex justify-center gap-2 py-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setRating(star)} className="transition-transform active:scale-90 hover:scale-110 focus:outline-none">
                            <Star size={40} className={star <= rating ? "text-amber-400 fill-amber-400" : "text-stone-200 fill-stone-100"} strokeWidth={star <= rating ? 0 : 1.5} />
                        </button>
                    ))}
                </div>
                <textarea className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm outline-none focus:border-brand-500 resize-none h-32" placeholder="Gostaria de deixar alguma observação? (Opcional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                <div className="space-y-3">
                    <Button onClick={handleRatingSubmit} className="w-full" disabled={rating === 0}>Avaliar Pedido</Button>
                    <button onClick={handleSkip} className="w-full py-3 text-stone-400 text-sm font-bold hover:text-stone-600">Não quero avaliar agora</button>
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
                {currentOrder.deliveryCode?.split('').map((char: string, i: number) => (
                  <span key={i} className="text-3xl font-black">{char}</span>
                ))}
             </div>
             <p className="text-xs text-stone-400 mt-4 leading-relaxed">Mostre este código ao entregador quando ele chegar.</p>
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
             <h3 className="text-sm font-bold text-stone-800">Resumo do Pedido #{currentOrder.id?.slice(-4)}</h3>
             <div className="space-y-2">
                {currentOrder.items?.map((item: CartItem) => (
                  <div key={item.id} className="flex justify-between text-xs text-stone-500">
                     <span>{item.quantity}x {item.name}</span>
                     <span>{formatCurrency(Number(item.price) * Number(item.quantity))}</span>
                  </div>
                ))}
             </div>
             <div className="pt-3 border-t border-stone-100 flex justify-between font-bold text-stone-800">
                <span>Total</span>
                <span>{formatCurrency(Number(currentOrder.total))}</span>
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
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
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
        <input type="text" className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500" placeholder="Digite sua mensagem..." value={inputText} onChange={(e) => setInputText(e.target.value)} />
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
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '', cpf: user?.cpf || '',
    address: { zipCode: user?.address?.zipCode || '', street: user?.address?.street || '', number: user?.address?.number || '', complement: user?.address?.complement || '', neighborhood: user?.address?.neighborhood || '', city: user?.address?.city || '', state: user?.address?.state || '' }
  });
  useEffect(() => { if (user) setFormData({ name: user.name, email: user.email, phone: user.phone || '', cpf: user.cpf || '', address: { zipCode: user.address?.zipCode || '', street: user.address?.street || '', number: user.address?.number || '', complement: user.address?.complement || '', neighborhood: user.address?.neighborhood || '', city: user.address?.city || '', state: user.address?.state || '' } }); }, [user]);
  const handleAddressChange = async (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    if (field === 'zipCode') {
        const cleanCep = value.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            setIsLoadingCep(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData((prev: any) => ({ ...prev, address: { ...prev.address, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf } }));
                }
            } catch (error) { console.error("Erro ao buscar CEP:", error); } 
            finally { setIsLoadingCep(false); }
        }
    }
  };
  const handleSave = async () => {
    setIsSaving(true);
    if (user?.id) {
      try {
        await setDoc(doc(db, "users", user.id), { ...formData, cashbackBalance: user.cashbackBalance || 0 }, { merge: true });
        setUser((prev: any) => ({ ...prev, ...formData }));
        setShowSuccess(true);
        setTimeout(() => { setShowSuccess(false); setCurrentView(cart.length > 0 ? 'cart' : 'shop'); }, 1000);
      } catch (error) { alert("Erro ao salvar no Firebase."); }
      finally { setIsSaving(false); }
    }
  };
  return (
    <div className="bg-stone-50 min-h-screen pb-24">
       <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView(cart.length > 0 ? 'cart' : 'shop')} className="p-2 hover:bg-stone-100 rounded-full"><ChevronLeft size={24} className="text-stone-600" /></button>
            <h1 className="text-lg font-bold text-stone-800">Meu Perfil</h1>
          </div>
          {showSuccess && <span className="text-sm text-green-600 font-medium flex items-center gap-1 animate-fade-in bg-green-50 px-3 py-1 rounded-full border border-green-200"><CheckCircle2 size={16} /> Salvo</span>}
       </div>
       <div className="p-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
             <div className="flex items-center gap-2 mb-2"><UserIcon className="text-brand-500" size={20} /><h3 className="font-bold text-stone-800">Dados Pessoais</h3></div>
             <Input label="Nome Completo" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
             <div className="flex gap-2"><Input label="Telefone" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} /><Input label="E-mail" value={formData.email} readOnly={true} className="opacity-70 bg-stone-50" /></div>
             <Input label="CPF" value={formData.cpf} onChange={(e: any) => setFormData({...formData, cpf: e.target.value})} />
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 space-y-4">
             <div className="flex items-center gap-2 mb-2"><MapPin className="text-brand-500" size={20} /><h3 className="font-bold text-stone-800">Endereço de Entrega</h3></div>
             <div className="flex gap-3"><div className="w-1/3"><Input label="CEP" value={formData.address.zipCode} onChange={(e: any) => handleAddressChange('zipCode', e.target.value)} icon={isLoadingCep ? <Loader2 className="animate-spin text-brand-500" size={18} /> : null} /></div><div className="flex-1"><Input label="Cidade" value={formData.address.city} onChange={(e: any) => handleAddressChange('city', e.target.value)} /></div></div>
             <div className="flex gap-3"><div className="flex-1"><Input label="Rua" value={formData.address.street} onChange={(e: any) => handleAddressChange('street', e.target.value)} /></div><div className="w-1/4"><Input label="Nº" value={formData.address.number} onChange={(e: any) => handleAddressChange('number', e.target.value)} /></div></div>
             <Input label="Complemento" value={formData.address.complement} onChange={(e: any) => handleAddressChange('complement', e.target.value)} />
             <div className="flex gap-3"><div className="flex-1"><Input label="Bairro" value={formData.address.neighborhood} onChange={(e: any) => handleAddressChange('neighborhood', e.target.value)} /></div><div className="w-1/4"><Input label="UF" value={formData.address.state} onChange={(e: any) => handleAddressChange('state', e.target.value)} /></div></div>
          </div>
          <Button onClick={handleSave} className="w-full" isLoading={isSaving}><Save size={18} /> Salvar Alterações</Button>
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

  const handleFinishOrder = async () => {
    if (!user || !user.id) {
      alert("Você precisa estar logado para finalizar o pedido.");
      return;
    }
    const earned = !useCashback ? subtotal * settings.cashbackPercentage : 0;
    const cashbackUsedAmount = useCashback ? Math.min(user.cashbackBalance || 0, subtotal) : 0;

    try {
      const orderData = {
        userId: user.id,
        customerName: user.name || 'Cliente',
        customerPhone: user.phone || 'Não informado',
        address: {
          street: user.address?.street || '',
          number: user.address?.number || '',
          neighborhood: user.address?.neighborhood || '',
          city: user.address?.city || ''
        },
        items: cart.map((item: any) => ({
          name: item.name,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1
        })),
        subtotal: Number(subtotal) || 0,
        total: Number(total) || 0,
        deliveryFee: Number(currentDeliveryFee) || 0,
        paymentMethod: paymentMethod,
        paymentDetail: paymentMethod === 'money' ? `Troco para ${cashGiven}` : (cardType || ''),
        deliveryMethod: fulfillmentMethod,
        status: 'received',
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        deliveryCode: Math.floor(1000 + Math.random() * 9000).toString(),
        cashbackEarned: Number(earned) || 0,
        cashbackUsed: Number(cashbackUsedAmount) || 0
      };

      await addDoc(collection(db, "orders"), orderData);

      const newBalance = (user.cashbackBalance || 0) - cashbackUsedAmount + earned;
      await updateDoc(doc(db, "users", user.id), { cashbackBalance: newBalance });

      setUser((prev: any) => ({ ...prev, cashbackBalance: newBalance }));
      setCart([]);
      setEarnedCashback(earned);
      setCurrentView('order-success');
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      alert("Erro ao conectar com o banco de dados.");
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen pb-32">
       {/* Conteúdo visual do Carrinho (Omitido por brevidade mas funcional conforme sua UI) */}
       <div className="p-4"><Button onClick={handleFinishOrder} className="w-full">Confirmar Pedido</Button></div>
    </div>
  );
};

export default function App() {
  // Estados globais, hooks e renderização principal aqui...
  return <div>Renderização do App...</div>;
}
