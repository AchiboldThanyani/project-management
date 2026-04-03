export interface Label {
  id: string;
  name: string;
  color: LabelColor;
  projectId: string;
}

export type LabelColor = 'violet' | 'blue' | 'teal' | 'emerald' | 'amber' | 'rose' | 'soft';

export const LABEL_COLOR_CLASSES: Record<LabelColor, string> = {
  violet:  'label-violet',
  blue:    'label-blue',
  teal:    'label-teal',
  emerald: 'label-emerald',
  amber:   'label-amber',
  rose:    'label-rose',
  soft:    'label-soft',
};

export const LABEL_COLORS: { value: LabelColor; label: string }[] = [
  { value: 'violet',  label: 'Purple'  },
  { value: 'blue',    label: 'Blue'    },
  { value: 'teal',    label: 'Teal'    },
  { value: 'emerald', label: 'Green'   },
  { value: 'amber',   label: 'Yellow'  },
  { value: 'rose',    label: 'Red'     },
  { value: 'soft',    label: 'Grey'    },
];
