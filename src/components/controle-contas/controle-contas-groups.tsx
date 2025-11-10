'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { WhatsAppIcon } from './icons';

interface Member {
  id: number;
  name: string;
  phone?: string;
}

interface BillWithGroup {
  id: number;
  name: string;
  value: number;
  createdAt: string;
  group: { id: number; name: string };
  shares?: { memberId: number; type: 'value' | 'percent'; amount: number }[];
}

interface GroupData {
  name: string;
  bills: BillWithGroup[];
}

interface ControleContasGroupsProps {
  groupedData: Record<number, GroupData>;
  groupMembers: Record<number, Member[]>;
  loading: boolean;
}

function formatPhoneForWhatsapp(phone?: string) {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 || cleaned.length === 11) return `55${cleaned}`;
  return cleaned;
}

function generateWhatsAppMessage(
  memberName: string,
  groupName: string,
  bills: BillWithGroup[],
  memberTotal: number,
  memberId: number
): string {
  let message = `Ola *${memberName}*!\n\n`;
  message += `Segue o resumo das contas do grupo *${groupName}*:\n\n`;
  message += `-----------------------------------\n\n`;
  
  bills.forEach((bill, index) => {
    message += `*Conta ${index + 1}: ${bill.name}*\n`;
    message += `Valor total: R$ ${bill.value.toFixed(2)}\n`;
    
    if (bill.shares && bill.shares.length > 0) {
      const memberShare = bill.shares.find((s) => s.memberId === memberId);
      if (memberShare) {
        if (memberShare.type === 'value') {
          message += `Sua parte: R$ ${memberShare.amount.toFixed(2)}\n`;
        } else {
          const amount = (memberShare.amount * bill.value) / 100;
          message += `Sua parte: R$ ${amount.toFixed(2)} (${memberShare.amount.toFixed(1)}%)\n`;
        }
      }
    } else {
      // Divisão igual entre todos os membros
      const equalShare = bill.value / bills.length;
      message += `Sua parte: R$ ${equalShare.toFixed(2)}\n`;
    }
    message += `\n`;
  });
  
  message += `-----------------------------------\n`;
  message += `*TOTAL A PAGAR: R$ ${memberTotal.toFixed(2)}*\n\n`;
  message += `Mensagem gerada automaticamente pelo Sistema Financeiro`;
  
  return encodeURIComponent(message);
}

export function ControleContasGroups({ groupedData, groupMembers, loading }: ControleContasGroupsProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const entries = Object.entries(groupedData);

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conta encontrada.</p>
            <p className="text-sm mt-2">Adicione contas para começar.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {entries.map(([groupId, groupData]) => {
        const subtotal = groupData.bills.reduce((sum: number, b: BillWithGroup) => sum + b.value, 0);
        const membersArray = groupMembers[Number(groupId)] ?? [];
        const membersCount = membersArray.length;

        // Calcular total por membro dentro deste grupo
        const totalsByMember: Record<number, number> = {};
        
        // Inicializa
        membersArray.forEach((m) => {
          totalsByMember[m.id] = 0;
        });

        // Para cada conta do grupo, acumula no membro correspondente
        groupData.bills.forEach((bill) => {
          if (Array.isArray(bill.shares) && bill.shares.length > 0) {
            // Usa os shares para distribuir
            membersArray.forEach((m) => {
              const share = (bill.shares || []).find((s: any) => s.memberId === m.id);
              if (share) {
                if (share.type === 'value') totalsByMember[m.id] += share.amount;
                else totalsByMember[m.id] += (share.amount * bill.value) / 100;
              }
            });
          } else {
            // Dividir igualmente entre membros do grupo
            if (membersCount > 0) {
              const base = bill.value / membersCount;
              membersArray.forEach((m) => {
                totalsByMember[m.id] += base;
              });
            }
          }
        });

        return (
          <Card
            key={groupId}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => (window.location.href = `/controle-contas/contas?groupId=${groupId}`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {groupData.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informações do Grupo */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Subtotal:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pessoas no grupo:</span>
                  <span className="font-semibold">{membersCount}</span>
                </div>
              </div>

              {/* Divisão por Membro */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Totais por membro:</h4>
                {membersArray.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
                ) : (
                  <div className="space-y-3">
                    {membersArray.map((member) => {
                      const memberTotal = totalsByMember[member.id] ?? 0;
                      
                      // Gerar mensagem do WhatsApp
                      const message = generateWhatsAppMessage(
                        member.name,
                        groupData.name,
                        groupData.bills,
                        memberTotal,
                        member.id
                      );
                      
                      const phone = formatPhoneForWhatsapp(member.phone);
                      const whatsappUrl = phone ? `https://wa.me/${phone}?text=${message}` : null;
                      
                      return (
                        <div key={member.id} className="flex justify-between items-center gap-3 text-sm">
                          <span className="font-medium flex-1">{member.name}</span>
                          <span className="font-semibold">
                            {memberTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          {whatsappUrl && (
                            <Button
                              size="default"
                              variant="outline"
                              className="h-9 px-3 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 dark:border-green-800 dark:hover:bg-green-950"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(whatsappUrl, '_blank');
                              }}
                              title={`Enviar detalhes para ${member.name}`}
                            >
                              <WhatsAppIcon className="h-5 w-5 mr-2" />
                              <span className="text-xs font-semibold">Enviar</span>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
