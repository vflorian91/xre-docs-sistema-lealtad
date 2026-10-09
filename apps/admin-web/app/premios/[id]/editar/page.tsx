'use client';

import { useParams } from 'next/navigation';
import RewardFormPage from '../../RewardFormPage';

export default function EditarPremioPage() {
  const params = useParams<{ id: string }>();
  return <RewardFormPage mode="edit" rewardId={params.id} />;
}
