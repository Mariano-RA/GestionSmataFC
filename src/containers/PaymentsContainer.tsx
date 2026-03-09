'use client';

import { useTeamDataContext } from '@/context/TeamDataContext';
import Payments from '@/components/Payments';

export default function PaymentsContainer() {
  const data = useTeamDataContext();
  return (
    <Payments
      payments={data.payments}
      participants={data.participants}
      currentMonth={data.currentMonth}
      onAdd={data.handleAddPayment}
      onUpdate={data.handleUpdatePayment}
      onDelete={data.handleDeletePayment}
      addToast={data.addToast}
    />
  );
}
