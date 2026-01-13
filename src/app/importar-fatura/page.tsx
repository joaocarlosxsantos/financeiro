"use client";

import { useState, useEffect } from 'react';
import { FaturaUpload } from '@/components/importar-fatura/fatura-upload';
import { FaturaPreview } from '@/components/importar-fatura/fatura-preview';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import PageTitle from '@/components/PageTitle';

export default function ImportarFaturaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [preview, setPreview] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [selectedCreditCard, setSelectedCreditCard] = useState<string>('');
  const [billMonth, setBillMonth] = useState<number>(new Date().getMonth() + 1);
  const [billYear, setBillYear] = useState<number>(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Buscar cartões de crédito
    fetchCreditCards();
  }, []);

  async function fetchCreditCards() {
    try {
      const response = await fetch('/api/credit-cards');
      if (response.ok) {
        const data = await response.json();
        setCreditCards(data);
      }
    } catch (err) {
      console.error('Erro ao buscar cartões:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Enviar arquivo para parse
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/importar-fatura/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar arquivo');
      }

      const data = await response.json();
      setPreview(data.transactions);
      setCategorias(data.categories || []); // Salvar categorias da resposta
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSave(registros: any[], deleteExisting?: boolean) {
    if (!selectedCreditCard) {
      setError('Selecione um cartão de crédito');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/importar-fatura/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registros,
          creditCardId: selectedCreditCard,
          billPeriod: { year: billYear, month: billMonth },
          deleteExisting, // Passa o flag para a API
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar fatura');
      }

      const data = await response.json();
      setSuccess(true);
      
      // Aguardar 2 segundos e resetar para nova importação
      setTimeout(() => {
        setSuccess(false);
        setStep('upload');
        setPreview([]);
        setFile(null);
        setSelectedCreditCard('');
        setError(null);
        // Recarregar cartões para atualizar limites
        fetchCreditCards();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar fatura');
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    setStep('upload');
    setPreview([]);
    setError(null);
    setSuccess(false);
  }

  return (
    <DashboardLayout>
      <PageTitle module="Importar Fatura" page="Cartão de Crédito" />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Importar Fatura de Cartão</h1>
          <p className="text-muted-foreground">
            Importe sua fatura em formato CSV para registrar automaticamente suas compras
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {step === 'upload' && (
          <FaturaUpload
            file={file}
            onFileChange={setFile}
            onSubmit={handleSubmit}
            disabled={isProcessing}
          />
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <button
              onClick={handleBack}
              className="text-primary hover:underline mb-4"
            >
              ← Voltar ao upload
            </button>
            <FaturaPreview
              preview={preview}
              categorias={categorias}
              creditCards={creditCards}
              selectedCreditCard={selectedCreditCard}
              onCreditCardChange={setSelectedCreditCard}
              billMonth={billMonth}
              billYear={billYear}
              onBillMonthChange={setBillMonth}
              onBillYearChange={setBillYear}
              onSave={handleSave}
              saving={saving}
              error={error}
              success={success}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
