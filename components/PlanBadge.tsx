import type { PlanName } from '@/types';

export default function PlanBadge({ plan }: { plan: PlanName }) {
  return (
    <span className={`badge badge-${plan}`}>
      {plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro ✦' : 'Business ✦✦'}
    </span>
  );
}
