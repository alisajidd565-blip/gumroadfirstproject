import clsx from 'clsx';
import type { Channel } from '@/types';
import { CHANNEL_CONFIGS } from '@/types';
import { ALLOWED_CHANNELS_BY_PLAN } from '@/lib/plans';
import type { PlanName } from '@/types';

interface ChannelSelectorProps {
  selected: Channel[];
  onChange: (channels: Channel[]) => void;
  disabled?: boolean;
  planName?: PlanName;
}

const ALL_CHANNELS: Channel[] = ['twitter', 'linkedin', 'instagram', 'email'];

export default function ChannelSelector({
  selected,
  onChange,
  disabled,
  planName = 'free',
}: ChannelSelectorProps) {
  const allowed = ALLOWED_CHANNELS_BY_PLAN[planName] ?? ALLOWED_CHANNELS_BY_PLAN.free;

  function toggle(channel: Channel) {
    if (!allowed.includes(channel)) return;
    if (selected.includes(channel)) {
      onChange(selected.filter((c) => c !== channel));
    } else {
      onChange([...selected, channel]);
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ALL_CHANNELS.map((channel) => {
        const config = CHANNEL_CONFIGS[channel];
        const isSelected = selected.includes(channel);
        const isLocked = !allowed.includes(channel);

        return (
          <button
            key={channel}
            type="button"
            onClick={() => !disabled && !isLocked && toggle(channel)}
            disabled={disabled || isLocked}
            title={isLocked ? 'Upgrade your plan to unlock this channel' : undefined}
            className={clsx(
              'relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center',
              'transition-all duration-200 select-none',
              isLocked && 'opacity-40 cursor-not-allowed',
              !isLocked && isSelected
                ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                : !isLocked &&
                    'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800',
              disabled && !isLocked && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSelected && !isLocked && (
              <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}

            {isLocked && (
              <span className="absolute top-2 right-2 text-[10px] font-bold text-amber-400 uppercase">
                Pro
              </span>
            )}

            <span className={clsx('text-xl font-bold', config.color)}>
              {config.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-200">{config.label}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{config.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
