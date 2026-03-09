'use client';

import { useTeamDataContext } from '@/context/TeamDataContext';
import Settings from '@/components/Settings';

export default function SettingsContainer() {
  const data = useTeamDataContext();

  const handleExportDatabase = () => {
    const exportData = {
      participants: data.participants,
      payments: data.payments,
      expenses: data.expenses,
      config: data.config,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smata-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDatabase = async (file: File) => {
    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as {
        participants?: unknown[];
        payments?: unknown[];
        expenses?: unknown[];
        config?: unknown;
      };
      const result = await data.request<{
        imported: { participants: number; payments: number; expenses: number; config: boolean };
      }>('/api/backup/import', {
        method: 'POST',
        body: {
          teamId: data.currentTeamId!,
          participants: parsed.participants ?? [],
          payments: parsed.payments ?? [],
          expenses: parsed.expenses ?? [],
          config: parsed.config,
        },
        disableAutoParams: true,
      });
      if (result != null) {
        const { imported } = result;
        data.addToast(
          `Importado: ${imported.participants} participantes, ${imported.payments} pagos, ${imported.expenses} gastos${imported.config ? ', config' : ''}`,
          'success'
        );
        await data.loadAllData();
      }
    } catch (error) {
      data.addToast(
        'Error al importar: ' + (error instanceof Error ? error.message : 'Unknown error'),
        'error'
      );
    }
  };

  return (
    <Settings
      config={data.config}
      currentMonth={data.currentMonth}
      onSave={data.handleSaveConfig}
      onReset={data.handleResetConfig}
      onExport={handleExportDatabase}
      onImport={handleImportDatabase}
      addToast={data.addToast}
    />
  );
}
