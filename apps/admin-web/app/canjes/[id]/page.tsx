'use client';

import {
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle2,
  Clock3,
  FileClock,
  Gift,
  History,
  PackageCheck,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  Star,
  Store,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import AdminRoutedShell from '../../AdminRoutedShell';
import { ReasonModal, ReasonModalState } from '../../components/ReasonModal';
import { absoluteMediaUrl, adminApiRequest, getErrorText, getStoredAdminUser, StoredAdminUser } from '../../lib/adminApi';
import { formatDate, formatNumber } from '../../lib/format';

type RedemptionRequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_STORE' | 'READY' | 'DELIVERED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

type AuditLogRow = {
  id: string;
  actorType: 'INTERNAL_USER' | 'CUSTOMER' | 'SYSTEM';
  action: string;
  module: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actorInternalUser?: {
    id: string;
    fullName: string;
    email: string;
    roleAssignments?: Array<{ role: { id: string; name: string } }>;
  } | null;
  actorCustomer?: {
    id: string;
    code: string;
    fullName: string;
  } | null;
};

type InternalUserRef = {
  id: string;
  fullName: string;
  email: string;
  roleAssignments?: Array<{ role: { id: string; name: string } }>;
};

type RedemptionDetail = {
  id: string;
  requestCode: string;
  status: RedemptionRequestStatus;
  pointsReserved: number;
  productNameSnapshot: string;
  productPointsSnapshot?: number;
  productImageUrlSnapshot?: string | null;
  productDescriptionSnapshot?: string | null;
  productIsGiftCardSnapshot?: boolean;
  requestedAt: string;
  expiresAt?: string | null;
  reviewStartedAt?: string | null;
  approvedAt?: string | null;
  sentToStoreAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  approvalComment?: string | null;
  sentToStoreComment?: string | null;
  preparationComment?: string | null;
  deliveryObservation?: string | null;
  deliveredToName?: string | null;
  validationCode?: string | null;
  validationQrPayload?: Record<string, unknown> | null;
  deliveryEvidenceUrl?: string | null;
  operationalValidations?: {
    customerActive?: boolean;
    pointsSufficient?: boolean;
    productAvailable?: boolean;
    capturedAt?: string;
  } | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  customer: {
    id: string;
    code: string;
    fullName: string;
    phone: string;
    email?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    loyaltyLevel?: string | null;
    registrationSource?: string | null;
  };
  product: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    pointsValue: number;
    imageUrl?: string | null;
    requiresApproval?: boolean;
    isGiftCard?: boolean;
    category?: {
      id: string;
      code: string;
      name: string;
    } | null;
  };
  pickupStore?: {
    id: string;
    code: string;
    name: string;
  } | null;
  managedByInternalUser?: InternalUserRef | null;
  approvedByInternalUser?: InternalUserRef | null;
  sentToStoreByInternalUser?: InternalUserRef | null;
  preparedByInternalUser?: InternalUserRef | null;
  deliveredByInternalUser?: InternalUserRef | null;
  rejectedByInternalUser?: InternalUserRef | null;
  cancelledByInternalUser?: InternalUserRef | null;
  pointMovement?: {
    id: string;
    type: string;
    status: string;
    points: number;
    description?: string | null;
    createdAt: string;
  } | null;
  auditTrail?: AuditLogRow[];
};

const STATUS_LABELS: Record<RedemptionRequestStatus, string> = {
  PENDING_APPROVAL: 'Pendiente',
  APPROVED: 'Aprobado',
  SENT_TO_STORE: 'Enviado a tienda',
  READY: 'Preparado para entrega',
  DELIVERED: 'Entregado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Anulado',
  EXPIRED: 'Vencido',
};

const ACTION_LABELS: Record<string, string> = {
  'redemption_requests.request': 'Solicitud de canje creada',
  'redemption_requests.approve': 'Solicitud aprobada',
  'redemption_requests.mark_sent_to_store': 'Enviada a tienda',
  'redemption_requests.mark_ready': 'Preparada para entrega',
  'redemption_requests.mark_delivered': 'Premio entregado',
  'redemption_requests.reject': 'Solicitud rechazada',
  'redemption_requests.cancel': 'Solicitud anulada',
  'redemption_requests.customer_cancel': 'Anulada por cliente',
};

const STATUS_ORDER: RedemptionRequestStatus[] = ['PENDING_APPROVAL', 'APPROVED', 'SENT_TO_STORE', 'READY', 'DELIVERED', 'REJECTED', 'CANCELLED', 'EXPIRED'];

const ACTION_STEP: Record<RedemptionRequestStatus, string> = {
  PENDING_APPROVAL: 'Paso 1 de 4 · Acción requerida',
  APPROVED: 'Paso 2 de 4 · Acción requerida',
  SENT_TO_STORE: 'Paso 3 de 4 · Acción requerida',
  READY: 'Paso 4 de 4 · Acción requerida',
  DELIVERED: 'Completado',
  REJECTED: 'Finalizado',
  CANCELLED: 'Finalizado',
  EXPIRED: 'Finalizado',
};

const ACTION_TITLE: Record<RedemptionRequestStatus, string> = {
  PENDING_APPROVAL: 'Aprobar la solicitud de canje',
  APPROVED: 'Enviar el canje a la tienda',
  SENT_TO_STORE: 'Preparar el premio en tienda',
  READY: 'Entregar el premio al cliente',
  DELIVERED: 'Canje entregado',
  REJECTED: 'Canje rechazado',
  CANCELLED: 'Canje anulado',
  EXPIRED: 'Canje vencido',
};

const ACTION_HELP: Record<RedemptionRequestStatus, string> = {
  PENDING_APPROVAL: 'Revisa la elegibilidad del cliente y aprueba o rechaza el canje.',
  APPROVED: 'Confirma el envío del canje a la tienda donde el cliente lo recogerá.',
  SENT_TO_STORE: 'Prepara el premio y márcalo como listo para recoger.',
  READY: 'Muestra el código QR al cliente para que confirme la entrega, o márcalo entregado manualmente.',
  DELIVERED: '',
  REJECTED: '',
  CANCELLED: '',
  EXPIRED: '',
};

const POINT_MOVEMENT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  PENDING: 'Pendiente',
  REVERSED: 'Revertido',
  USED: 'Utilizado',
  EXPIRED: 'Vencido',
};

function pointMovementStatusLabel(status?: string | null) {
  if (!status) return 'No registrado';
  return POINT_MOVEMENT_STATUS_LABELS[status] || status;
}

// Convierte el id interno del movimiento en una referencia legible de 4 letras + 6 dígitos
// de forma determinística (el mismo movimiento siempre produce el mismo código).
function movementReference(id?: string | null) {
  if (!id) return 'No registrado';
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < id.length; i += 1) {
    const c = id.charCodeAt(i);
    h1 = (h1 * 31 + c) >>> 0;
    h2 = (h2 * 131 + c + 7) >>> 0;
  }
  let letterPart = '';
  let n = h1;
  for (let i = 0; i < 4; i += 1) {
    letterPart += letters[n % letters.length];
    n = Math.floor(n / letters.length);
  }
  const digitPart = (h2 % 1000000).toString().padStart(6, '0');
  return `${letterPart}${digitPart}`;
}

function actionBarTone(status: RedemptionRequestStatus) {
  if (status === 'PENDING_APPROVAL') return 'amber';
  if (status === 'READY') return 'green';
  return 'blue';
}

function redemptionStatusClass(status: RedemptionRequestStatus) {
  if (status === 'DELIVERED') return 'badge green';
  if (status === 'READY' || status === 'APPROVED' || status === 'SENT_TO_STORE') return 'badge blue';
  if (status === 'PENDING_APPROVAL') return 'badge amber';
  return 'badge red';
}

function statusTone(status?: RedemptionRequestStatus | string | null) {
  if (status === 'DELIVERED' || status === 'APPROVED' || status === 'READY') return 'green';
  if (status === 'PENDING_APPROVAL' || status === 'SENT_TO_STORE') return 'blue';
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED') return 'red';
  return 'neutral';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'No registrado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No registrado';
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDuration(start?: string | null, end?: string | null) {
  if (!start) return 'No registrado';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'No registrado';

  const totalMinutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function actorName(log?: AuditLogRow | null, fallback = 'No registrado') {
  if (!log) return fallback;
  if (log.actorInternalUser) return log.actorInternalUser.fullName;
  if (log.actorCustomer) return log.actorCustomer.fullName;
  return 'Sistema';
}

function actorRole(log?: AuditLogRow | null) {
  if (!log) return 'No registrado';
  if (log.actorInternalUser) return log.actorInternalUser.roleAssignments?.[0]?.role.name || 'Usuario interno';
  if (log.actorCustomer) return 'Cliente';
  return 'Sistema';
}

function userRole(user?: InternalUserRef | null) {
  return user?.roleAssignments?.[0]?.role.name || (user ? 'Usuario interno' : 'No registrado');
}

function metadataNumber(metadata: Record<string, unknown> | undefined | null, key: string) {
  const value = metadata?.[key];
  return typeof value === 'number' ? value : null;
}

function actionComment(log?: AuditLogRow | null) {
  if (!log) return 'Sin comentario registrado.';
  const comment = typeof log.metadata?.comment === 'string' ? log.metadata.comment : null;
  if (comment) return comment;
  const reason = typeof log.metadata?.reason === 'string' ? log.metadata.reason : null;
  if (reason) return reason;
  if (log.action === 'redemption_requests.request') return 'Canje solicitado desde el canal del cliente.';
  if (log.action === 'redemption_requests.approve') return 'Canje aprobado. Validaciones operativas registradas.';
  if (log.action === 'redemption_requests.mark_sent_to_store') return 'Canje enviado a tienda para preparación.';
  if (log.action === 'redemption_requests.mark_ready') return 'Premio preparado para entrega.';
  if (log.action === 'redemption_requests.mark_delivered') return 'Premio entregado al cliente.';
  return 'Sin comentario registrado.';
}

function registrationSourceLabel(source?: string | null) {
  if (!source) return 'No registrado';
  const normalized = source.toLowerCase();
  if (normalized.includes('admin')) return 'Administración';
  if (normalized.includes('app') || normalized.includes('pwa')) return 'PWA Cliente';
  return source;
}

function previousStatusFor(log: AuditLogRow, auditTrail: AuditLogRow[]) {
  const directPreviousStatus = log.metadata?.previousStatus;
  if (typeof directPreviousStatus === 'string') return directPreviousStatus;
  const index = auditTrail.findIndex((item) => item.id === log.id);
  for (let i = index - 1; i >= 0; i -= 1) {
    const status = auditTrail[i]?.metadata?.status;
    if (typeof status === 'string') return status;
  }
  return null;
}

function newStatusFor(log: AuditLogRow, redemption: RedemptionDetail) {
  const directNewStatus = log.metadata?.newStatus;
  if (typeof directNewStatus === 'string') return directNewStatus;
  const status = log.metadata?.status;
  if (typeof status === 'string') return status;
  if (log.action === 'redemption_requests.request') return redemption.product.requiresApproval ? 'PENDING_APPROVAL' : 'DELIVERED';
  if (log.action === 'redemption_requests.reject') return 'REJECTED';
  if (log.action === 'redemption_requests.cancel' || log.action === 'redemption_requests.customer_cancel') return 'CANCELLED';
  return null;
}

export default function CanjeDetallePage() {
  const params = useParams<{ id: string }>();
  const redemptionId = params.id;
  const [redemption, setRedemption] = useState<RedemptionDetail | null>(null);
  const [user, setUser] = useState<StoredAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reasonModal, setReasonModal] = useState<ReasonModalState | null>(null);
  const [deliveryModal, setDeliveryModal] = useState<{
    deliveredToName: string;
    validationCode: string;
    observation: string;
    evidenceFile: File | null;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const canApprove = Boolean(user?.permissions.includes('redemption_requests.approve'));
  const canSendToStore = Boolean(user?.permissions.includes('redemption_requests.mark_sent_to_store'));
  const canMarkReady = Boolean(user?.permissions.includes('redemption_requests.mark_ready'));
  const canMarkDelivered = Boolean(user?.permissions.includes('redemption_requests.mark_delivered'));
  const canReject = Boolean(user?.permissions.includes('redemption_requests.reject'));
  const canCancel = Boolean(user?.permissions.includes('redemption_requests.cancel'));

  useEffect(() => {
    setUser(getStoredAdminUser());
    void loadRedemption();
  }, [redemptionId]);

  useEffect(() => {
    if (!redemption || redemption.status !== 'READY') {
      setQrDataUrl(null);
      return;
    }
    const code = redemption.validationCode || redemption.requestCode;
    QRCode.toDataURL(`RDM:${code}`, { width: 240, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [redemption]);

  async function loadRedemption() {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await adminApiRequest<RedemptionDetail>(`/redemptions/${redemptionId}`);
      setRedemption(result);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo cargar la solicitud de canje.') });
    } finally {
      setIsLoading(false);
    }
  }

  async function approveRedemption() {
    if (!redemption) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/redemptions/${redemption.id}/approve`, { method: 'POST' });
      await loadRedemption();
      setMessage({ type: 'success', text: `Solicitud ${redemption.requestCode} aprobada.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo aprobar la solicitud.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markSentToStoreRedemption() {
    if (!redemption) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/redemptions/${redemption.id}/send-to-store`, { method: 'POST' });
      await loadRedemption();
      setMessage({ type: 'success', text: `Solicitud ${redemption.requestCode} enviada a tienda.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo enviar a tienda la solicitud.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markReadyRedemption() {
    if (!redemption) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      await adminApiRequest(`/redemptions/${redemption.id}/ready`, { method: 'POST' });
      await loadRedemption();
      setMessage({ type: 'success', text: `Solicitud ${redemption.requestCode} lista para recoger.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo marcar como lista la solicitud.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  function openDeliveryModal() {
    if (!redemption) return;
    setDeliveryModal({
      deliveredToName: redemption.deliveredToName || redemption.customer.fullName,
      validationCode: redemption.validationCode || redemption.requestCode,
      observation: redemption.deliveryObservation || '',
      evidenceFile: null,
    });
  }

  async function markDeliveredRedemption(input: { deliveredToName: string; validationCode: string; observation: string }) {
    if (!redemption) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      let evidenceUrl: string | undefined;
      if (deliveryModal?.evidenceFile) {
        const dataBase64 = await fileToBase64(deliveryModal.evidenceFile);
        const uploadResult = await adminApiRequest<{ publicUrl: string }>('/media/redemptions/evidence', {
          method: 'POST',
          body: JSON.stringify({
            purpose: 'REDEMPTION_EVIDENCE',
            filename: deliveryModal.evidenceFile.name,
            mimeType: deliveryModal.evidenceFile.type,
            dataBase64,
          }),
        });
        evidenceUrl = uploadResult.publicUrl;
      }

      await adminApiRequest(`/redemptions/${redemption.id}/deliver`, {
        method: 'POST',
        body: JSON.stringify({
          deliveredToName: input.deliveredToName,
          validationCode: input.validationCode,
          observation: input.observation,
          evidenceUrl,
        }),
      });
      await loadRedemption();
      setDeliveryModal(null);
      setMessage({ type: 'success', text: `Solicitud ${redemption.requestCode} marcada como entregada.` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorText(error, 'No se pudo marcar como entregada la solicitud.') });
    } finally {
      setIsSubmitting(false);
    }
  }

  function rejectRedemption() {
    if (!redemption) return;
    setReasonModal({
      title: 'Rechazar solicitud',
      description: `Indica la razón para rechazar la solicitud ${redemption.requestCode}. El cliente será notificado y sus puntos se liberarán.`,
      confirmLabel: 'Rechazar solicitud',
      onConfirm: async (reason) => {
        setIsSubmitting(true);
        setMessage(null);

        try {
          await adminApiRequest(`/redemptions/${redemption.id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
          });
          await loadRedemption();
          setMessage({ type: 'success', text: `Solicitud ${redemption.requestCode} rechazada. Puntos y stock liberados.` });
          setReasonModal(null);
        } catch (error) {
          setMessage({ type: 'error', text: getErrorText(error, 'No se pudo rechazar la solicitud.') });
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  }

  function cancelRedemption() {
    if (!redemption) return;
    setReasonModal({
      title: 'Anular solicitud',
      description: `Indica la razón para anular la solicitud ${redemption.requestCode}. El cliente será notificado y sus puntos se liberarán.`,
      confirmLabel: 'Anular solicitud',
      onConfirm: async (reason) => {
        setIsSubmitting(true);
        setMessage(null);

        try {
          await adminApiRequest(`/redemptions/${redemption.id}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
          });
          await loadRedemption();
          setMessage({ type: 'success', text: `Solicitud ${redemption.requestCode} anulada. Puntos y stock liberados.` });
          setReasonModal(null);
        } catch (error) {
          setMessage({ type: 'error', text: getErrorText(error, 'No se pudo anular la solicitud.') });
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  }

  const auditTrail = redemption?.auditTrail ?? [];
  const requestLog = auditTrail.find((log) => log.action === 'redemption_requests.request');
  const approvalLog = auditTrail.find((log) => log.action === 'redemption_requests.approve');
  const sentLog = auditTrail.find((log) => log.action === 'redemption_requests.mark_sent_to_store');
  const readyLog = auditTrail.find((log) => log.action === 'redemption_requests.mark_ready');
  const deliveredLog = auditTrail.find((log) => log.action === 'redemption_requests.mark_delivered');
  const releaseLog = auditTrail.find((log) => ['redemption_requests.reject', 'redemption_requests.cancel', 'redemption_requests.customer_cancel'].includes(log.action));
  const pointsBefore = metadataNumber(requestLog?.metadata, 'availablePointsBefore');
  const pointsAfter = metadataNumber(requestLog?.metadata, 'availablePointsAfter');
  const pointsUsed = redemption?.pointsReserved ?? 0;
  const processEnd = redemption?.deliveredAt || redemption?.rejectedAt || redemption?.cancelledAt || null;
  const imageUrl = redemption ? absoluteMediaUrl(redemption.productImageUrlSnapshot || redemption.product.imageUrl || '') : '';
  const approvalUser = redemption?.approvedByInternalUser || redemption?.managedByInternalUser || null;
  const sentUser = redemption?.sentToStoreByInternalUser || redemption?.managedByInternalUser || null;
  const preparedUser = redemption?.preparedByInternalUser || redemption?.managedByInternalUser || null;
  const deliveredUser = redemption?.deliveredByInternalUser || redemption?.managedByInternalUser || null;
  const releaseUser = redemption?.rejectedByInternalUser || redemption?.cancelledByInternalUser || redemption?.managedByInternalUser || null;

  const timeline = useMemo(() => {
    if (!redemption) return [];
    const requiresApproval = redemption.product.requiresApproval;

    const requested = {
      key: 'requested',
      label: 'Solicitado',
      icon: FileClock,
      date: redemption.requestedAt as string | null,
      user: actorName(requestLog, redemption.customer.fullName),
      comment: actionComment(requestLog),
      tone: 'blue',
    };

    const approvalFlow = [
      {
        key: 'review',
        label: 'En revisión',
        icon: Search,
        date: redemption.reviewStartedAt || (redemption.approvedAt || redemption.readyAt || redemption.deliveredAt ? redemption.requestedAt : null),
        user: approvalUser?.fullName || actorName(approvalLog, 'Pendiente de asignación'),
        comment: 'Validación de elegibilidad, puntos y disponibilidad.',
        tone: 'indigo',
      },
      {
        key: 'approved',
        label: 'Aprobado',
        icon: CheckCircle2,
        date: redemption.approvedAt,
        user: approvalUser?.fullName || actorName(approvalLog),
        comment: redemption.approvalComment || actionComment(approvalLog),
        tone: 'green',
      },
      {
        key: 'prepared',
        label: 'Preparado para entrega',
        icon: PackageCheck,
        date: redemption.readyAt,
        user: preparedUser?.fullName || sentUser?.fullName || actorName(readyLog || sentLog),
        comment: redemption.preparationComment || redemption.sentToStoreComment || actionComment(readyLog || sentLog),
        tone: 'purple',
      },
      {
        key: 'delivered',
        label: 'Entregado',
        icon: Truck,
        date: redemption.deliveredAt,
        user: deliveredUser?.fullName || actorName(deliveredLog),
        comment: redemption.deliveryObservation || actionComment(deliveredLog),
        tone: 'green',
      },
    ];

    const autoFlow = [
      {
        key: 'auto',
        label: 'Canjeado automáticamente',
        icon: CheckCircle2,
        date: redemption.deliveredAt,
        user: redemption.customer.fullName,
        comment: 'El cliente canjeó este premio directamente desde la app.',
        tone: 'green',
      },
    ];

    const items = [requested, ...(requiresApproval ? approvalFlow : autoFlow)];

    if (redemption.rejectedAt || redemption.cancelledAt) {
      items.push({
        key: 'release',
        label: redemption.rejectedAt ? 'Rechazado' : 'Anulado',
        icon: Ban,
        date: redemption.rejectedAt || redemption.cancelledAt,
        user: releaseUser?.fullName || actorName(releaseLog),
        comment: redemption.rejectionReason || redemption.cancellationReason || actionComment(releaseLog),
        tone: 'red',
      });
    }

    const realItems = items.filter((item) => Boolean(item.date));
    return realItems.map((item, index) => ({
      ...item,
      duration: formatDuration(item.date as string, realItems[index + 1]?.date ?? processEnd),
    }));
  }, [redemption, requestLog, approvalLog, sentLog, readyLog, deliveredLog, releaseLog, processEnd, approvalUser, sentUser, preparedUser, deliveredUser, releaseUser]);

  return (
    <AdminRoutedShell title="Solicitudes de Canje">
      <section className="redemption-detail-page">
        <header className="redemption-page-heading">
          <a aria-label="Volver a solicitudes de canje" className="customer-back-button" href="/canjes">
            <ArrowLeft size={22} />
          </a>
          <div>
            <h2>Detalle de solicitud de canje</h2>
            <p>Consulta la solicitud, cliente, producto y trazabilidad operativa.</p>
          </div>
        </header>

        {message ? <div className={`form-${message.type}`}>{message.text}</div> : null}
        {isLoading ? <div className="form-success">Cargando solicitud de canje...</div> : null}

        {redemption ? (
          <>
            <section className="redemption-operations-header">
              <div className="redemption-code-block">
                <span className="redemption-code-icon"><Gift size={30} /></span>
                <div>
                  <div className="redemption-code-line">
                    <h3>{redemption.requestCode}</h3>
                    <span className={redemptionStatusClass(redemption.status)}>{STATUS_LABELS[redemption.status]}</span>
                  </div>
                  <span>{redemption.productNameSnapshot || redemption.product.name}</span>
                </div>
              </div>
              <div className="redemption-header-stat">
                <Calendar size={22} />
                <span>Fecha de solicitud</span>
                <strong>{formatDate(redemption.requestedAt)}</strong>
              </div>
              <div className="redemption-header-stat">
                <Clock3 size={22} />
                <span>Tiempo total del proceso</span>
                <strong>{formatDuration(redemption.requestedAt, processEnd)}</strong>
              </div>
              <div className="redemption-header-stat">
                <Star size={22} />
                <span>Puntos utilizados</span>
                <strong>{formatNumber(pointsUsed)} puntos</strong>
              </div>
              <div className="redemption-header-stat">
                <Store size={22} />
                <span>Tienda</span>
                <strong>{redemption.pickupStore?.name || (redemption.product.requiresApproval ? 'Sin tienda' : 'No aplica')}</strong>
              </div>
            </section>

            {(redemption.status === 'PENDING_APPROVAL' && (canApprove || canReject))
              || (redemption.status === 'APPROVED' && (canSendToStore || canReject))
              || (redemption.status === 'SENT_TO_STORE' && (canMarkReady || canReject))
              || (redemption.status === 'READY' && (canMarkDelivered || canCancel)) ? (
              <section className={`redemption-action-bar ${actionBarTone(redemption.status)}`}>
                <div className="redemption-action-bar-info">
                  <span className="redemption-action-step">{ACTION_STEP[redemption.status]}</span>
                  <strong>{ACTION_TITLE[redemption.status]}</strong>
                  <p>{ACTION_HELP[redemption.status]}</p>
                </div>
                <div className="redemption-action-bar-buttons">
                  {redemption.status === 'PENDING_APPROVAL' ? (
                    <>
                      {canApprove ? <button className="admin-primary big" disabled={isSubmitting} onClick={() => void approveRedemption()} type="button"><CheckCircle2 size={18} /> Aprobar</button> : null}
                      {canReject ? <button className="admin-secondary danger" disabled={isSubmitting} onClick={() => void rejectRedemption()} type="button"><XCircle size={16} /> Rechazar</button> : null}
                    </>
                  ) : null}
                  {redemption.status === 'APPROVED' ? (
                    <>
                      {canSendToStore ? <button className="admin-primary big" disabled={isSubmitting} onClick={() => void markSentToStoreRedemption()} type="button"><Send size={18} /> Enviar a tienda</button> : null}
                      {canReject ? <button className="admin-secondary danger" disabled={isSubmitting} onClick={() => void rejectRedemption()} type="button"><XCircle size={16} /> Rechazar</button> : null}
                    </>
                  ) : null}
                  {redemption.status === 'SENT_TO_STORE' ? (
                    <>
                      {canMarkReady ? <button className="admin-primary big" disabled={isSubmitting} onClick={() => void markReadyRedemption()} type="button"><PackageCheck size={18} /> Preparar para entrega</button> : null}
                      {canReject ? <button className="admin-secondary danger" disabled={isSubmitting} onClick={() => void rejectRedemption()} type="button"><XCircle size={16} /> Rechazar</button> : null}
                    </>
                  ) : null}
                  {redemption.status === 'READY' ? (
                    <>
                      {canMarkDelivered ? <button className="admin-primary big" disabled={isSubmitting} onClick={openDeliveryModal} type="button"><Truck size={18} /> Marcar entregado</button> : null}
                      {canCancel ? <button className="admin-secondary danger" disabled={isSubmitting} onClick={() => void cancelRedemption()} type="button"><Ban size={16} /> Anular</button> : null}
                    </>
                  ) : null}
                </div>
              </section>
            ) : null}

            {redemption.status === 'READY' ? (
              <section className="redemption-qr-panel">
                <div className="redemption-qr-image">
                  {qrDataUrl ? <img alt={`QR del canje ${redemption.requestCode}`} src={qrDataUrl} /> : <span className="redemption-qr-placeholder"><QrCode size={48} /></span>}
                </div>
                <div className="redemption-qr-text">
                  <span className="redemption-action-step blue">Entrega con QR</span>
                  <strong>Pide al cliente que escanee este código</strong>
                  <p>Desde la app, en <b>Registro → lector de QR</b>, el cliente escanea este código y el canje pasa automáticamente a <b>Entregado</b>.</p>
                  <div className="redemption-qr-code">{redemption.validationCode || redemption.requestCode}</div>
                </div>
              </section>
            ) : null}

            <div className="redemption-expedient-grid">
              <main className="redemption-expedient-main">
                <section className="redemption-card redemption-summary-card">
                  <div className="redemption-card-title">
                    <Gift size={18} />
                    <h3>Resumen del canje</h3>
                  </div>
                  <div className="redemption-reward-summary">
                    <div className="redemption-reward-image">
                      {imageUrl ? <img alt={redemption.productNameSnapshot || redemption.product.name} src={imageUrl} /> : <Gift size={54} />}
                    </div>
                    <div className="redemption-reward-info">
                      <h4>{redemption.productNameSnapshot || redemption.product.name}</h4>
                      <p>{redemption.productDescriptionSnapshot || redemption.product.description || 'Descripción pendiente de registrar.'}</p>
                      <div className="redemption-info-grid compact">
                        <Info label="Código premio" value={redemption.product.code} />
                        <Info label="Categoría" value={redemption.product.category?.name || 'No registrada'} />
                        <Info label="Tipo de premio" value={redemption.productIsGiftCardSnapshot || redemption.product.isGiftCard ? 'Tarjeta de regalo' : 'Producto canjeable'} />
                        <Info label="Fecha de vencimiento" value={redemption.expiresAt ? formatDateTime(redemption.expiresAt) : 'No aplica'} />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="redemption-card-row">
                  <section className="redemption-card">
                    <div className="redemption-card-title">
                      <Star size={18} />
                      <h3>Movimiento de puntos</h3>
                    </div>
                    <div className="redemption-points-strip">
                      <Metric label="Antes del canje" value={pointsBefore !== null ? formatNumber(pointsBefore) : '—'} tone="blue" />
                      <Metric label="Puntos debitados" value={formatNumber(pointsUsed)} tone="red" />
                      <Metric label="Después del canje" value={pointsAfter !== null ? formatNumber(pointsAfter) : '—'} tone="green" />
                    </div>
                    <div className="redemption-info-list">
                      <Info label="ID movimiento" value={movementReference(redemption.pointMovement?.id)} />
                      <Info label="Fecha del débito" value={redemption.pointMovement?.createdAt ? formatDateTime(redemption.pointMovement.createdAt) : 'No registrado'} />
                      <Info label="Estado del movimiento" value={pointMovementStatusLabel(redemption.pointMovement?.status)} />
                    </div>
                  </section>

                  <section className="redemption-card">
                    <div className="redemption-card-title">
                      <ShieldCheck size={18} />
                      <h3>{redemption.product.requiresApproval ? 'Aprobación' : 'Validaciones del canje automático'}</h3>
                    </div>
                    {redemption.product.requiresApproval ? (
                      <div className="redemption-info-grid two">
                        <Info label="Aprobado por" value={redemption.approvedAt ? approvalUser?.fullName || actorName(approvalLog) : 'Pendiente'} />
                        <Info label="Rol" value={redemption.approvedAt ? userRole(approvalUser) : 'Pendiente'} />
                        <Info label="Fecha y hora" value={formatDateTime(redemption.approvedAt)} />
                        <Info label="Comentario" value={redemption.approvalComment || actionComment(approvalLog)} wide />
                      </div>
                    ) : (
                      <p className="redemption-auto-note">Este premio se canjea automáticamente desde la app. No requiere aprobación, preparación ni entrega manual.</p>
                    )}
                    <div className="redemption-validations">
                      <span><CheckCircle2 size={14} /> Cliente {redemption.operationalValidations?.customerActive === false ? 'inactivo' : 'activo'}</span>
                      <span><CheckCircle2 size={14} /> Puntos {redemption.operationalValidations?.pointsSufficient === false ? 'insuficientes' : 'suficientes'}</span>
                      <span><CheckCircle2 size={14} /> Premio {redemption.operationalValidations?.productAvailable === false ? 'no disponible' : 'disponible'}</span>
                    </div>
                  </section>
                </div>

                {redemption.product.requiresApproval ? (
                  <section className="redemption-card">
                    <div className="redemption-card-title">
                      <Truck size={18} />
                      <h3>Entrega</h3>
                    </div>
                    <div className="redemption-info-grid three">
                      <Info label="Tienda de entrega" value={redemption.pickupStore?.name || 'Pendiente'} />
                      <Info label="Usuario que entregó" value={redemption.deliveredAt ? deliveredUser?.fullName || actorName(deliveredLog) : 'Pendiente'} />
                      <Info label="Fecha y hora" value={formatDateTime(redemption.deliveredAt)} />
                      <Info label="Persona que recibió" value={redemption.deliveredAt ? redemption.deliveredToName || redemption.customer.fullName : 'Pendiente'} />
                      <Info label="Código / QR" value={<span className="redemption-code-value"><QrCode size={15} /> {redemption.validationCode || redemption.requestCode}</span>} />
                      <Info label="Observación de entrega" value={redemption.deliveryObservation || actionComment(deliveredLog)} />
                      <Info label="Evidencia de entrega" value={redemption.deliveryEvidenceUrl ? <a href={absoluteMediaUrl(redemption.deliveryEvidenceUrl)} rel="noreferrer" target="_blank">Ver evidencia</a> : 'No registrada'} wide />
                    </div>
                  </section>
                ) : null}
              </main>

              <aside className="redemption-expedient-side">
                <section className="redemption-card">
                  <div className="redemption-card-title">
                    <User size={18} />
                    <h3>Cliente que realizó el canje</h3>
                  </div>
                  <div className="redemption-customer-block">
                    <div className="redemption-customer-avatar"><User size={34} /></div>
                    <div className="redemption-info-list dense">
                      <Info label="Nombre" value={redemption.customer.fullName} />
                      <Info label="Código cliente" value={redemption.customer.code} />
                      <Info label="Correo" value={redemption.customer.email || 'No registrado'} />
                      <Info label="Teléfono" value={redemption.customer.phone || 'No registrado'} />
                      <Info label="Nivel" value={redemption.customer.loyaltyLevel || 'Básico'} />
                      <Info label="Canal" value={registrationSourceLabel(redemption.customer.registrationSource)} />
                      <Info label="Puntos antes" value={pointsBefore !== null ? formatNumber(pointsBefore) : 'No registrado'} />
                      <Info label="Puntos utilizados" value={formatNumber(pointsUsed)} />
                      <Info label="Puntos restantes" value={pointsAfter !== null ? formatNumber(pointsAfter) : 'No registrado'} />
                    </div>
                  </div>
                </section>

                <section className="redemption-card redemption-timeline-card">
                  <div className="redemption-card-title">
                    <Clock3 size={18} />
                    <h3>Línea de tiempo del canje</h3>
                  </div>
                  <div className="redemption-timeline">
                    {timeline.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div className={`redemption-timeline-item ${item.date ? 'done' : 'pending'} ${item.tone}`} key={item.key}>
                          <span className="redemption-timeline-icon"><Icon size={17} /></span>
                          <div>
                            <strong>{item.label}</strong>
                            <p>{item.date ? formatDateTime(item.date) : 'Pendiente'} · {item.user}</p>
                            <small>{item.comment}</small>
                          </div>
                          <em>{item.duration}</em>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </aside>
            </div>

            <section className="redemption-card redemption-audit-card" id="historial-auditoria">
              <div className="redemption-card-title">
                <History size={18} />
                <h3>Historial de auditoría</h3>
              </div>
              <div className="redemption-audit-table-wrap">
                <table className="redemption-audit-table">
                  <thead>
                    <tr>
                      <th>Fecha y hora</th>
                      <th>Acción realizada</th>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Comentario</th>
                      <th>Estado anterior</th>
                      <th>Estado nuevo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditTrail.map((log) => {
                      const previousStatus = previousStatusFor(log, auditTrail);
                      const newStatus = newStatusFor(log, redemption);
                      return (
                        <tr key={log.id}>
                          <td>{formatDateTime(log.createdAt)}</td>
                          <td>{ACTION_LABELS[log.action] || log.action}</td>
                          <td>{actorName(log)}</td>
                          <td>{actorRole(log)}</td>
                          <td>{actionComment(log)}</td>
                          <td>{previousStatus ? <span className={`soft-status ${statusTone(previousStatus)}`}>{STATUS_LABELS[previousStatus as RedemptionRequestStatus] || previousStatus}</span> : '—'}</td>
                          <td>{newStatus ? <span className={`soft-status ${statusTone(newStatus)}`}>{STATUS_LABELS[newStatus as RedemptionRequestStatus] || newStatus}</span> : '—'}</td>
                        </tr>
                      );
                    })}
                    {auditTrail.length === 0 ? (
                      <tr>
                        <td colSpan={7}>No hay auditoría registrada para esta solicitud.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </section>

      {reasonModal ? (
        <ReasonModal state={reasonModal} isSubmitting={isSubmitting} onClose={() => setReasonModal(null)} />
      ) : null}

      {deliveryModal ? (
        <div className="confirm-backdrop" role="presentation" onClick={() => setDeliveryModal(null)}>
          <form
            className="confirm-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              void markDeliveredRedemption(deliveryModal);
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Registrar entrega del canje</h3>
            <p>Confirma quién recibe, el código de validación y la observación operativa de entrega.</p>
            <label>
              Persona que recibió
              <input
                autoFocus
                minLength={2}
                required
                type="text"
                value={deliveryModal.deliveredToName}
                onChange={(event) => setDeliveryModal({ ...deliveryModal, deliveredToName: event.target.value })}
              />
            </label>
            <label>
              Código de validación / QR
              <input
                required
                type="text"
                value={deliveryModal.validationCode}
                onChange={(event) => setDeliveryModal({ ...deliveryModal, validationCode: event.target.value })}
              />
            </label>
            <label>
              Observación de entrega
              <textarea
                maxLength={500}
                placeholder="Ej. Premio entregado en buen estado."
                rows={4}
                value={deliveryModal.observation}
                onChange={(event) => setDeliveryModal({ ...deliveryModal, observation: event.target.value })}
              />
            </label>
            <label>
              Evidencia de entrega
              <input
                accept="image/png,image/jpeg,image/webp"
                type="file"
                onChange={(event) => setDeliveryModal({ ...deliveryModal, evidenceFile: event.target.files?.[0] ?? null })}
              />
            </label>
            <div className="confirm-actions">
              <button className="admin-secondary" disabled={isSubmitting} onClick={() => setDeliveryModal(null)} type="button">Cancelar</button>
              <button className="admin-primary" disabled={isSubmitting} type="submit"><Truck size={16} /> Confirmar entrega</button>
            </div>
          </form>
        </div>
      ) : null}
    </AdminRoutedShell>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Info({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'wide' : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'green' | 'red' }) {
  return (
    <div className={`redemption-point-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
