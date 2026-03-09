'use client';

import { useTeamDataContext } from '@/context/TeamDataContext';
import Participants from '@/components/Participants';

interface ParticipantsContainerProps {
  onShowHistory: (id: number, name: string) => void;
}

export default function ParticipantsContainer({ onShowHistory }: ParticipantsContainerProps) {
  const data = useTeamDataContext();
  return (
    <Participants
      participants={data.participants}
      payments={data.payments}
      currentMonth={data.currentMonth}
      getRequiredAmount={data.getRequiredAmount}
      onAdd={data.handleAddParticipant}
      onUpdate={data.handleUpdateParticipant}
      onRemove={data.handleRemoveParticipant}
      onToggle={data.handleToggleParticipant}
      onShowHistory={onShowHistory}
    />
  );
}
