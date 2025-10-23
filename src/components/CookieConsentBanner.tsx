"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie, Settings, Check, X, ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const COOKIE_CONSENT_KEY = 'cookie_consent_given';
const COOKIE_PREFERENCES_KEY = 'cookie_preferences';

interface CookiePreferences {
  essenciais: boolean;
  navegacao: boolean;
  marketing: boolean;
  funcionalidades: boolean;
}

const defaultPreferences: CookiePreferences = {
  essenciais: true, // Sempre true, não pode ser desmarcado
  navegacao: true,
  marketing: false,
  funcionalidades: true,
};

const CookieConsentBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent !== 'true') {
      const savedPrefs = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
  };

  const handleAcceptAll = () => {
    const allAccepted = { ...defaultPreferences, navegacao: true, marketing: true, funcionalidades: true };
    savePreferences(allAccepted);
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsOpen(false);
  };

  const handleRejectAll = () => {
    const allRejected = { ...defaultPreferences, navegacao: false, marketing: false, funcionalidades: false };
    savePreferences(allRejected);
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsOpen(false);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsOpen(false);
  };

  const handleCheckboxChange = (key: keyof CookiePreferences, checked: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: checked }));
  };

  const renderPreferencesContent = () => (
    <div className="space-y-4">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Settings className="h-5 w-5" /> Gerenciar Preferências
      </CardTitle>
      <p className="text-sm text-muted-foreground">
        Você pode escolher quais tipos de cookies deseja permitir. Os cookies essenciais são obrigatórios para o funcionamento do site.
      </p>
      <Separator />
      
      <ScrollArea className="h-60 pr-4">
        <div className="space-y-6">
          {/* Essenciais */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="essenciais"
              checked={preferences.essenciais}
              disabled
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="essenciais" className="font-bold text-base">
                Essenciais (Obrigatório)
              </Label>
              <p className="text-sm text-muted-foreground">
                Necessários para o funcionamento básico do site, como autenticação (Supabase) e armazenamento local de dados (IndexedDB).
              </p>
            </div>
          </div>

          {/* Navegação */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="navegacao"
              checked={preferences.navegacao}
              onCheckedChange={(checked) => handleCheckboxChange('navegacao', checked === true)}
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="navegacao" className="font-bold text-base">
                Melhorar a Navegação
              </Label>
              <p className="text-sm text-muted-foreground">
                Permite analisar o uso do site para otimizar a experiência do usuário e o desempenho.
              </p>
            </div>
          </div>

          {/* Funcionalidades */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="funcionalidades"
              checked={preferences.funcionalidades}
              onCheckedChange={(checked) => handleCheckboxChange('funcionalidades', checked === true)}
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="funcionalidades" className="font-bold text-base">
                Ativação de Funcionalidades
              </Label>
              <p className="text-sm text-muted-foreground">
                Usado para registrar preferências de visualização (ex: turno selecionado) e ativar funcionalidades específicas.
              </p>
            </div>
          </div>

          {/* Marketing */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="marketing"
              checked={preferences.marketing}
              onCheckedChange={(checked) => handleCheckboxChange('marketing', checked === true)}
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="marketing" className="font-bold text-base">
                Marketing e Publicidade
              </Label>
              <p className="text-sm text-muted-foreground">
                Permite o uso de cookies para fins de publicidade e e-mail marketing (Atualmente não implementado, mas reservado).
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  const renderMainBannerContent = () => (
    <div className="space-y-4">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Cookie className="h-5 w-5 text-primary" />
        Controle sua privacidade
      </CardTitle>
      <p className="text-sm text-muted-foreground">
        Nosso site usa cookies para melhorar sua experiência de navegação. Ao continuar navegando, você concorda com nossa política de cookies.
        <br /><br />
        Você pode exercer seus direitos de acesso, retificação e exclusão de dados entrando em contato com o administrador.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <a href="#" className="text-sm text-primary hover:underline">Política de Privacidade</a>
        <a href="#" className="text-sm text-primary hover:underline">Política de Cookies</a>
      </div>
    </div>
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Card 
      className={cn(
        "fixed bottom-4 right-4 w-full max-w-sm shadow-xl z-[100]",
        showPreferences ? "max-w-md" : "max-w-sm"
      )}
    >
      <CardHeader className="p-4 pb-0">
        {showPreferences ? renderPreferencesContent() : renderMainBannerContent()}
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {/* Conteúdo principal ou de preferências */}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row-reverse gap-2 p-4 pt-0">
        {showPreferences ? (
          <Button onClick={handleSavePreferences} className="w-full sm:w-auto flex items-center gap-2">
            <Check className="h-4 w-4" /> Salvar Preferências
          </Button>
        ) : (
          <>
            <Button onClick={handleAcceptAll} className="w-full sm:w-auto flex items-center gap-2">
              <Check className="h-4 w-4" /> Concordar
            </Button>
            <Button onClick={handleRejectAll} variant="outline" className="w-full sm:w-auto flex items-center gap-2">
              <X className="h-4 w-4" /> Recusar
            </Button>
          </>
        )}
        <Button 
          onClick={() => setShowPreferences(prev => !prev)} 
          variant="secondary" 
          className="w-full sm:w-auto flex items-center gap-2"
        >
          {showPreferences ? (
            <>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" /> Gerenciar
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CookieConsentBanner;