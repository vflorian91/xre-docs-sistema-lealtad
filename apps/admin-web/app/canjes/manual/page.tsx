'use client';

import { useEffect, useState } from 'react';
import AdminRoutedShell from '../../AdminRoutedShell';
import { adminApiRequest, getErrorText, getStoredAdminUser } from '../../lib/adminApi';
import { CanjeStepper } from './components/CanjeStepper';
import { BuscarClienteStep } from './components/BuscarClienteStep';
import { ClienteSeleccionadoStep } from './components/ClienteSeleccionadoStep';
import { RegistrarCanjeStep } from './components/RegistrarCanjeStep';
import { ConfirmarCanjeModal } from './components/ConfirmarCanjeModal';
import { CanjeResumenFinal } from './components/CanjeResumenFinal';
import { ClienteResult, RedeemResult, SuccessData, movementReference } from './components/types';

const FALLBACK_POINT_VALUE = 0.01;

type ActiveRule = { pointValueAmount?: string | number | null };
type CustomerProfile = { customer?: { createdAt?: string | null }; redemptions?: Array<{ requestedAt?: string | null }> };

export default function CanjearPuntosWizardPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ClienteResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedClient, setSelectedClient] = useState<ClienteResult | null>(null);
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [pointValueAmount, setPointValueAmount] = useState(FALLBACK_POINT_VALUE);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const performedBy = getStoredAdminUser()?.fullName || 'Administrador';

  useEffect(() => {
    adminApiRequest<ActiveRule>('/points/rules/active')
      .then((rule) => {
        const value = Number(rule?.pointValueAmount);
        if (Number.isFinite(value) && value > 0) setPointValueAmount(value);
      })
      .catch(() => undefined);
  }, []);

  async function doSearch() {
    if (!searchTerm.trim()) {
      setSearchError('Ingresa el NIT del cliente.');
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const result = await adminApiRequest<ClienteResult[]>(`/customers?q=${encodeURIComponent(searchTerm.trim())}`);
      setResults(result);
    } catch {
      setResults([]);
      setSearchError('No fue posible realizar la búsqueda. Intenta nuevamente.');
    } finally {
      setIsSearching(false);
    }
  }

  async function selectClient(client: ClienteResult) {
    let enriched = client;
    try {
      const profile = await adminApiRequest<CustomerProfile>(`/customers/${client.id}/profile`);
      enriched = {
        ...client,
        createdAt: profile.customer?.createdAt ?? client.createdAt ?? null,
        lastRedemptionAt: profile.redemptions?.[0]?.requestedAt ?? null,
      };
    } catch {
      // El perfil es opcional; continuamos con los datos de la búsqueda.
    }
    setSelectedClient(enriched);
    setPoints('');
    setReason('');
    setSubmitError(null);
    setCurrentStep(2);
  }

  function backToSearch() {
    setCurrentStep(1);
  }

  function continueToRegister() {
    setCurrentStep(3);
  }

  async function applyCanje() {
    if (!selectedClient) return;
    const amount = Number(points) * pointValueAmount;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await adminApiRequest<RedeemResult>('/redemptions/points', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedClient.id,
          points: Number(points),
          description: reason.trim() || undefined,
        }),
      });
      setSuccessData({
        movementCode: movementReference(result.pointMovementId),
        cliente: selectedClient,
        pointsRedeemed: result.pointsRedeemed,
        remainingPoints: result.availablePoints,
        amount,
        reason,
        performedBy,
        appliedAt: new Date().toISOString(),
      });
      setIsConfirmModalOpen(false);
      setCurrentStep(4);
    } catch (error) {
      setSubmitError(getErrorText(error, 'No se pudo aplicar el canje. Intenta nuevamente.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function newCanje() {
    setCurrentStep(1);
    setSearchTerm('');
    setResults([]);
    setHasSearched(false);
    setSelectedClient(null);
    setPoints('');
    setReason('');
    setSuccessData(null);
    setSubmitError(null);
  }

  const pointsNum = Number(points || 0);
  const amount = pointsNum * pointValueAmount;
  const remainingPoints = selectedClient ? Math.max(0, selectedClient.availablePoints - pointsNum) : 0;

  return (
    <AdminRoutedShell title="Canjear puntos">
      <div className="canje-wizard">
        <header className="canje-wizard-heading">
          <h1>Canjear puntos por monto</h1>
          <p>Busca al cliente, selecciona el resultado correcto y registra el canje de puntos de forma inmediata.</p>
        </header>

        <CanjeStepper activeStep={isConfirmModalOpen ? 4 : currentStep} allDone={currentStep === 4} />

        {currentStep === 1 ? (
          <BuscarClienteStep
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onSearch={() => void doSearch()}
            isSearching={isSearching}
            results={results}
            hasSearched={hasSearched}
            errorMessage={searchError}
            onSelect={(client) => void selectClient(client)}
          />
        ) : null}

        {currentStep === 2 && selectedClient ? (
          <ClienteSeleccionadoStep
            cliente={selectedClient}
            pointValueAmount={pointValueAmount}
            onBack={backToSearch}
            onContinue={continueToRegister}
          />
        ) : null}

        {currentStep === 3 && selectedClient ? (
          <RegistrarCanjeStep
            cliente={selectedClient}
            pointValueAmount={pointValueAmount}
            points={points}
            reason={reason}
            performedBy={performedBy}
            onPointsChange={setPoints}
            onReasonChange={setReason}
            onBack={() => setCurrentStep(2)}
            onConfirm={() => { setSubmitError(null); setIsConfirmModalOpen(true); }}
          />
        ) : null}

        {currentStep === 4 && successData ? (
          <CanjeResumenFinal data={successData} onNewCanje={newCanje} />
        ) : null}
      </div>

      {isConfirmModalOpen && selectedClient ? (
        <ConfirmarCanjeModal
          cliente={selectedClient}
          points={pointsNum}
          amount={amount}
          remainingPoints={remainingPoints}
          reason={reason}
          performedBy={performedBy}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
          onCancel={() => setIsConfirmModalOpen(false)}
          onApply={() => void applyCanje()}
        />
      ) : null}
    </AdminRoutedShell>
  );
}
