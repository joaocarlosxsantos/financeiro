import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processTelegramCommand, sendTelegramMessage } from '@/lib/telegram';

/**
 * POST /api/integrations/telegram/webhook
 * Recebe updates do Telegram Bot API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verifica se é uma mensagem
    if (!body.message || !body.message.text) {
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    const chatId = message.chat.id.toString();
    const text = message.text;

    // Busca integração ativa para este chat
    const integration = await prisma.integration.findFirst({
      where: {
        platform: 'TELEGRAM',
        chatId,
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    if (!integration) {
      // Chat não vinculado
      await sendTelegramMessage(
        process.env.TELEGRAM_BOT_TOKEN || '',
        {
          chat_id: chatId,
          text: '❌ Este chat não está vinculado a nenhuma conta. Configure a integração no app primeiro.',
        }
      );
      return NextResponse.json({ ok: true });
    }

    // Verifica se é um comando
    if (text.startsWith('/')) {
      const parts = text.split(' ');
      const command = parts[0];
      const args = parts.slice(1);

      // Verifica se o comando está habilitado
      const commandName = command.replace('/', '');
      if (!integration.enabledCommands.includes(commandName)) {
        await sendTelegramMessage(
          integration.token || process.env.TELEGRAM_BOT_TOKEN || '',
          {
            chat_id: chatId,
            text: '⚠️ Este comando não está habilitado para este chat.',
          }
        );
        return NextResponse.json({ ok: true });
      }

      // Processa comando
      const response = await processTelegramCommand(
        integration.userId,
        command,
        args
      );

      // Envia resposta
      await sendTelegramMessage(
        integration.token || process.env.TELEGRAM_BOT_TOKEN || '',
        {
          chat_id: chatId,
          text: response,
          parse_mode: 'Markdown',
        }
      );

      // Atualiza estatísticas
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastUsed: new Date(),
          usageCount: { increment: 1 },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
