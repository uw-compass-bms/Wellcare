/**
 * Color system for distinguishing recipients in signature fields
 */

export const recipientColors = [
  {
    name: 'blue',
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-500',
    dot: 'bg-blue-500',
  },
  {
    name: 'green',
    border: 'border-green-500',
    bg: 'bg-green-50',
    text: 'text-green-700',
    ring: 'ring-green-500',
    dot: 'bg-green-500',
  },
  {
    name: 'purple',
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    ring: 'ring-purple-500',
    dot: 'bg-purple-500',
  },
  {
    name: 'orange',
    border: 'border-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    ring: 'ring-orange-500',
    dot: 'bg-orange-500',
  },
  {
    name: 'pink',
    border: 'border-pink-500',
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    ring: 'ring-pink-500',
    dot: 'bg-pink-500',
  },
  {
    name: 'teal',
    border: 'border-teal-500',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    ring: 'ring-teal-500',
    dot: 'bg-teal-500',
  },
  {
    name: 'indigo',
    border: 'border-indigo-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    ring: 'ring-indigo-500',
    dot: 'bg-indigo-500',
  },
  {
    name: 'yellow',
    border: 'border-yellow-500',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    ring: 'ring-yellow-500',
    dot: 'bg-yellow-500',
  },
];

/**
 * Get color scheme for a recipient based on their index
 */
export function getRecipientColor(index: number) {
  return recipientColors[index % recipientColors.length];
}

/**
 * Get color scheme for a recipient by ID from a list of recipients
 */
export function getRecipientColorById(recipientId: string, recipients: Array<{ id: string }>) {
  const index = recipients.findIndex(r => r.id === recipientId);
  return index >= 0 ? getRecipientColor(index) : recipientColors[0];
}