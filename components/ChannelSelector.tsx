import clsx from 'clsx';
import type { Channel } from '@/types';
import { CHANNEL_CONFIGS } from '@/types';

interface ChannelSelectorProps {
  selected: Channel[];
  onChange: (channels: Channel[]) => void;
  disabled?: boolean;
}

const ALL_CHANNELS: Channel[] = ['twitter', 'linkedin', 'instagram', 'email'];

export default function ChannelSelector({ selected, onChange, disabled }: ChannelSelectorProps) {
  function toggle(channel: Channel) {
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

        return (
          <button
            key={channel}
            type="button"
            onClick={() => !disabled && toggle(channel)}
            disabled={disabled}
            className={clsx(
              'relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center',
              'transition-all duration-200 select-none',
              isSelected
                ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Selected indicator */}
            {isSelected && (
              <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
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
