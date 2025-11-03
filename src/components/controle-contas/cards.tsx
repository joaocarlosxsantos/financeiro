import React from "react";
import { WhatsAppIcon } from './icons';

function formatPhoneForWhatsapp(phone?: string) {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 || cleaned.length === 11) return `55${cleaned}`;
  return cleaned;
}

interface BaseCardProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "blue" | "green" | "neutral";
}

function BaseCard({ onClick, children, variant = "neutral" }: BaseCardProps) {
  const variantClasses = {
    blue: "from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-950/30 border-blue-200/60 dark:border-blue-800/50",
    green: "from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/50",
    neutral: "from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 border-neutral-200 dark:border-neutral-700",
  }[variant];

  const isClickable = typeof onClick === 'function';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isClickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick!();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`group relative flex flex-col gap-3 overflow-hidden rounded-xl border p-4 transition-all ${variantClasses} card-shadow ${isClickable ? 'clickable' : ''}`}
    >
      <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none bg-white/10 dark:bg-white/5" />
      {children}
    </div>
  );
}

// WhatsAppIcon moved to src/components/controle-contas/icons.tsx

interface Member {
  id: number;
  name?: string;
  phone?: string;
}

interface BillShare {
  memberId: number;
  type: "value" | "percent";
  amount: number;
}

export const GroupCard = React.memo(function GroupCard({ name, phone, onClick, children }: { name: string; phone: string; onClick?: () => void; children?: React.ReactNode }) {
  return (
    <BaseCard onClick={onClick} variant="blue">
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg md:text-2xl text-blue-900 dark:text-blue-200 line-clamp-1">{name}</div>
          <div className="mt-0.5 text-sm md:text-base text-blue-700 dark:text-blue-300">
            <span className="truncate">{phone}</span>
          </div>
        </div>
          <div className="text-sm font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400 md:text-xs">Ver detalhes →</div>
      </div>
      {children && (
        <div className="mt-3 w-full flex flex-col gap-3">
          {children}
        </div>
      )}
    </BaseCard>
  );
});
function shallowEqualShares(a?: BillShare[], b?: BillShare[]) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].memberId !== b[i].memberId) return false;
    if (a[i].type !== b[i].type) return false;
    if (Number(a[i].amount) !== Number(b[i].amount)) return false;
  }
  return true;
}

function shallowEqualMembers(a?: Member[], b?: Member[]) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
    if ((a[i].name || '') !== (b[i].name || '')) return false;
    if ((a[i].phone || '') !== (b[i].phone || '')) return false;
  }
  return true;
}

function billCardComparator(prev: any, next: any) {
  if (prev.name !== next.name) return false;
  if (prev.value !== next.value) return false;
  if (prev.onClick !== next.onClick) return false;
  if (!shallowEqualShares(prev.shares, next.shares)) return false;
  if (!shallowEqualMembers(prev.members, next.members)) return false;
  return true; // equal -> skip update
}

function BillCardComp({ name, value, onClick, children, shares, members }: { name: string; value: number; onClick?: () => void; children?: React.ReactNode; shares?: BillShare[]; members?: Member[] }) {
  return (
    <BaseCard onClick={onClick} variant="green">
      <div className="flex items-start gap-3 w-full">
        <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-xl bg-emerald-200/70 dark:bg-emerald-900/40">
          <svg className="h-7 w-7 text-emerald-700 dark:text-emerald-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg md:text-2xl text-emerald-900 dark:text-emerald-200 line-clamp-1">{name}</div>
          <div className={`mt-0.5 text-sm md:text-lg ${value < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
            R$ {value < 0 ? `-${Math.abs(value).toFixed(2)}` : value.toFixed(2)}
          </div>
        </div>
      </div>

      {/* breakdown */}
      {((shares && shares.length > 0) || (members && members.length > 0)) && (
        <div className="mt-3 w-full flex flex-col gap-2 text-sm text-emerald-900 dark:text-emerald-200">
          {shares && shares.length > 0 ? (
            shares.map((share) => {
              const member = members?.find((m) => m.id === share.memberId);
              let amount = 0;
              if (share.type === 'value') amount = share.amount;
              if (share.type === 'percent') amount = (share.amount * value) / 100;
              return (
                <div key={share.memberId} className="flex gap-2 items-center">
                  <span className="font-semibold">{member?.name || 'Membro'}</span>
                  <span>R$ {amount.toFixed(2)}</span>
                  {share.type === 'percent' && <span className="text-emerald-700 dark:text-emerald-300">({share.amount.toFixed(1)}%)</span>}
                  {/* WhatsApp removed from individual bill breakdown; action now in subtotal */}
                </div>
              );
            })
          ) : (
            members?.map((member) => (
              <div key={member.id} className="flex gap-2 items-center">
                <span className="font-semibold">{member.name}</span>
                <span>R$ {(value / Math.max(members.length, 1)).toFixed(2)}</span>
                {/* WhatsApp removed from individual bill breakdown; action now in subtotal */}
              </div>
            ))
          )}
        </div>
      )}
    </BaseCard>
  );
}
export const BillCard = React.memo(BillCardComp, billCardComparator);

export default BaseCard;
