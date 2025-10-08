import { NextRequest, NextResponse } from 'next/server';
import { processPendingAlerts, processGoalAlerts } from '@/lib/notifications/processor';

// POST /api/notifications/process - Processar alertas pendentes
export async function POST(req: NextRequest) {
  try {
    // Verificar se é uma chamada interna ou de cron job
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';

    let processedCount = 0;

    switch (type) {
      case 'transactions':
        await processPendingAlerts();
        processedCount = 1;
        break;
      
      case 'goals':
        await processGoalAlerts();
        processedCount = 1;
        break;
      
      case 'all':
      default:
        await processPendingAlerts();
        await processGoalAlerts();
        processedCount = 2;
        break;
    }

    return NextResponse.json({ 
      success: true,
      message: `Processamento concluído`,
      type,
      processedTasks: processedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no processamento de alertas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}