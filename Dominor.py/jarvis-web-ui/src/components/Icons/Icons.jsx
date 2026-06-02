// Icon component using lucide-react
import {
  Rocket, Sparkles, FileText, Bot, LayoutDashboard, Music, Cpu,
  FolderOpen, Mail, Timer, Settings, Phone, Search, Zap, User,
  Activity, ArrowRight, Calendar, Calculator, Globe, AlarmClock,
  Wand2, Clipboard, RefreshCw, Send, Trash2, Wifi, Mic, Volume2,
  Power, Lock, Play, Pause, SkipForward, SkipBack, Shuffle, Brain, Camera,
  Folder, FolderPlus, Quote, Check, X, Menu, StopCircle, RotateCcw,
  MessageSquare, Info, BatteryMedium, Sun, Terminal, ChevronRight,
  TrendingUp, Layers, Command, Radio, Shield, Database, Clock,
  ChevronDown, Download, Moon
} from "lucide-react";

export const iconMap = {
  Rocket, Sparkles, FileText, Bot, LayoutDashboard, Music, Cpu,
  FolderOpen, Mail, Timer, Settings, Phone, Search, Zap, User,
  Activity, ArrowRight, Calendar, Calculator, Globe, AlarmClock,
  Wand2, Clipboard, RefreshCw, Send, Trash2, Wifi, Mic, Volume2,
  Power, Lock, Play, Pause, SkipForward, SkipBack, Shuffle, Brain, Camera,
  Folder, FolderPlus, Quote, Check, X, Menu, StopCircle, MessageSquare,
  Info, Sun, Terminal, ChevronRight, TrendingUp, Layers, Command, Radio,
  Shield, Database, Clock, ChevronDown, Download, Moon, RotateCcw,
  // Aliases
  Close: X,
  File: FileText,
  AI: Bot,
  Dashboard: LayoutDashboard,
  Files: FolderOpen,
  Alarm: AlarmClock,
  Wand: Wand2,
  Refresh: RefreshCw,
  Trash: Trash2,
  Volume: Volume2,
  Screenshot: Camera,
  System: Cpu,
  Stop: StopCircle,
  Restart: RotateCcw,
  Sleep: Power,
  Battery: BatteryMedium,
  Weather: Sun,
  Back: SkipBack,
  Forward: SkipForward,
  Robot: Bot,
  Communication: Mail,
};

export function Icon({ name, size = 24, className = "", style, ...props }) {
  const IconComponent = iconMap[name] || Activity;
  return <IconComponent size={size} className={className} style={style} {...props} />;
}
