import type { PlanName } from '@/types';
import clsx from 'clsx';

export default function PlanBadge({ plan }: { plan: PlanName }) {
  return (
    <span
      className={clsx(
        'badge',
        plan === 'free'     && 'badge-free',
        plan === 'pro'      && 'badge-pro',
        plan === 'business' && 'badge-business'
      )}
    >
      {plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro ✦' : 'Business ✦✦'}
    </span>
  );
}
