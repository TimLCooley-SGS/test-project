import React from 'react';
import {
  Lightbulb,
  Map,
  Tags,
  Users,
  Palette,
  Link,
  Package,
  Rocket,
  ChevronUp,
  Share2,
  FileText,
  Calendar,
  Search,
  X,
  Plus,
  Check,
  AlertCircle,
  Settings,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Code,
  Globe,
  Lock,
  Unlock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Menu,
  BarChart3,
  CreditCard,
  DollarSign,
  LucideIcon,
} from 'lucide-react';

// Map of icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  lightbulb: Lightbulb,
  map: Map,
  tags: Tags,
  users: Users,
  palette: Palette,
  link: Link,
  package: Package,
  rocket: Rocket,
  'chevron-up': ChevronUp,
  share: Share2,
  'file-text': FileText,
  calendar: Calendar,
  search: Search,
  x: X,
  plus: Plus,
  check: Check,
  alert: AlertCircle,
  settings: Settings,
  'external-link': ExternalLink,
  copy: Copy,
  eye: Eye,
  'eye-off': EyeOff,
  trash: Trash2,
  edit: Edit3,
  'toggle-left': ToggleLeft,
  'toggle-right': ToggleRight,
  code: Code,
  globe: Globe,
  lock: Lock,
  unlock: Unlock,
  'arrow-right': ArrowRight,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  menu: Menu,
  'bar-chart': BarChart3,
  'credit-card': CreditCard,
  'dollar-sign': DollarSign,
};

export type IconName = keyof typeof iconMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

function Icon({
  name,
  size = 20,
  color,
  className = '',
  strokeWidth = 2,
}: IconProps): React.ReactElement | null {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <IconComponent
      size={size}
      color={color || 'var(--color-icon)'}
      className={`icon ${className}`}
      strokeWidth={strokeWidth}
    />
  );
}

export default Icon;
