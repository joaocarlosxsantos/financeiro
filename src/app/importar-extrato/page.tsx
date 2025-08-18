"use client"

import { useState, useEffect } from "react";
import { Loader } from "@/components/ui/loader";
import { Toast } from "@/components/ui/toast";

import { ExtratoUpload } from "@/components/importar-extrato/extrato-upload";
import { ExtratoPreview } from "@/components/importar-extrato/extrato-preview";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function ImportarExtratoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "save">("upload");
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUploading(true);
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/importar-extrato/parse", {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    if (!res.ok) {
      setError("Erro ao processar arquivo");
      return;
    }
    const { preview } = await res.json();
    setPreview(preview);
    setStep("preview");
  }

  async function handleSave(registrosEditados?: any[]) {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const registrosParaSalvar = registrosEditados || preview;
    const res = await fetch("/api/importar-extrato/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registros: registrosParaSalvar, carteiraId: selectedWallet }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Erro ao salvar lançamentos");
      return;
    }
    setSuccess(true);
    setShowToast(true);
    setStep("upload");
    setFile(null);
    setPreview([]);
    setSelectedWallet("");
  }

  useEffect(() => {
    if (step === "preview") {
      fetch("/api/wallets")
        .then((r) => r.json())
        .then((data) => setWallets(data));
    }
  }, [step]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold mb-2">Importar Extrato</h1>
        {uploading && <Loader text="Enviando arquivo..." />}
        {!uploading && step === "upload" && (
          <ExtratoUpload
            onFileChange={setFile}
            onSubmit={handleUpload}
            file={file}
            disabled={uploading}
          />
        )}
        {step === "preview" && (
          <ExtratoPreview
            preview={preview}
            wallets={wallets}
            selectedWallet={selectedWallet}
            onWalletChange={setSelectedWallet}
            onSave={handleSave}
            saving={saving}
            error={error}
            success={success}
          />
        )}
        <Toast open={showToast} message="Extrato enviado com sucesso!" onClose={() => setShowToast(false)} />
      </div>
    </DashboardLayout>
  );
}
