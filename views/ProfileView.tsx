import React, { useState, useEffect } from 'react';
import { ChevronLeft, User as UserIcon, MapPin, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { Button, Input } from '../components/UI';
import { useUser } from '../contexts/UserContext';
import { useOrder } from '../contexts/OrderContext';
import { ViewState } from '../types';

export const ProfileView = ({ setCurrentView }: { setCurrentView: (v: ViewState) => void }) => {
  const { user, updateUserProfile } = useUser();
  const { cart } = useOrder();
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

  const handleSave = () => {
    if (!user) return;
    
    setIsSaving(true);
    
    // Cria o objeto de usuário atualizado mantendo ID e outros campos
    const updatedUser = {
      ...user,
      ...formData
    };

    // Usa a função do contexto que atualiza tanto a sessão quanto a lista persistida
    updateUserProfile(updatedUser);
    
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