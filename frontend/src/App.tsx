import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Wrench, 
  BarChart3, 
  Settings, 
  Bell, 
  User as UserIcon,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  UserPlus,
  Play,
  Pause,
  XCircle,
  ClipboardCheck,
  History,
  LogOut,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Camera,
  Send,
  RotateCcw,
  Menu,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'motion/react';
import API_BASE_URL from './config';

// --- Types ---
type View = 'dashboard' | 'work-requests' | 'work-orders' | 'reports' | 'settings' | 'work-request-detail' | 'user-management';

interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'supervisor' | 'technician' | 'staff';
  department: string;
  avatar?: string;
}

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  pendingConfirm: number;
  closed: number;
  slaCompliance: number;
  categories?: { name: string, value: number }[];
  trend?: { name: string, total: number, closed: number, open: number }[];
  technicians?: { name: string, completed: number }[];
}

interface WorkRequest {
  _id: string;
  wrId: string;
  userId: string;
  userName: string;
  department: string;
  block?: string;
  floor?: string;
  room?: string;
  location: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  description: string;
  imageUrl?: string;
  activities?: {
    action: string;
    user: string;
    timestamp: string;
    note?: string;
    imageUrl?: string;
  }[];
  createdAt: string;
}

interface WorkOrder {
  _id: string;
  woId: string;
  wrId: string;
  category: string;
  assignedTechnician: string;
  technicianName: string;
  status: 'ASSIGNED' | 'IN PROGRESS' | 'COMPLETED' | 'ON HOLD';
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

// --- Mock Data for Charts ---
const categoryData = [
  { name: 'Medical Equipment', value: 36 },
  { name: 'HVAC', value: 28 },
  { name: 'Electrical', value: 22 },
  { name: 'Plumbing', value: 18 },
  { name: 'IT Infrastructure', value: 25 },
  { name: 'Cleaning', value: 15 },
  { name: 'Security', value: 12 },
];

const slaData = [
  { name: 'On Time', value: 142, color: '#22c55e' },
  { name: 'Delayed', value: 14, color: '#f59e0b' },
];

const trendData = [
  { name: 'Jan', total: 145, closed: 130, open: 15 },
  { name: 'Feb', total: 158, closed: 141, open: 17 },
  { name: 'Mar', total: 162, closed: 148, open: 14 },
  { name: 'Apr', total: 156, closed: 113, open: 43 },
];

// --- Helpers ---
const isAdminLike = (user: User | null) => user?.role === 'admin' || user?.role === 'manager' || user?.role === 'supervisor';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'IN PROGRESS': return 'bg-orange-100 text-orange-700 hover:bg-orange-100';
    case 'ASSIGNED': return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
    case 'OPEN': return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
    case 'CLOSED': return 'bg-teal-100 text-teal-700 hover:bg-teal-100';
    case 'PENDING USER CONFIRMATION': return 'bg-purple-100 text-purple-700 hover:bg-purple-100';
    case 'ON HOLD': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100';
    default: return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'CRITICAL': return 'bg-red-50 text-red-600 border-red-200';
    case 'HIGH': return 'bg-orange-50 text-orange-600 border-orange-200';
    case 'MEDIUM': return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'LOW': return 'bg-gray-50 text-gray-600 border-gray-200';
    default: return 'bg-blue-50 text-blue-600 border-blue-200';
  }
};

const SortButton = ({ label, sortKey, currentSort, onSort }: { label: string, sortKey: string, currentSort: { key: string, direction: 'asc' | 'desc' } | null, onSort: (key: string) => void }) => {
  const isActive = currentSort?.key === sortKey;
  return (
    <button 
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 hover:text-blue-600 transition-colors ${isActive ? 'text-blue-600 font-bold' : ''}`}
    >
      {label}
      {isActive ? (
        currentSort.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
      ) : (
        <ArrowUpDown size={14} className="opacity-30" />
      )}
    </button>
  );
};

// --- Components ---

const Sidebar = ({ currentView, setView, user, onSignOut, isOpen, onClose }: { currentView: View, setView: (v: View) => void, user: User | null, onSignOut: () => void, isOpen: boolean, onClose: () => void }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'supervisor', 'technician', 'staff'] },
    { id: 'work-requests', label: 'Work Requests', icon: ClipboardList, roles: ['admin', 'manager', 'supervisor', 'staff'] },
    { id: 'work-orders', label: 'Work Orders', icon: Wrench, roles: ['admin', 'manager', 'supervisor', 'technician'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { id: 'user-management', label: 'User Management', icon: UserPlus, roles: ['admin', 'manager'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager', 'supervisor'] },
  ];

  const filteredItems = menuItems.filter(item => !user || item.roles.includes(user.role));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">MAHSA Hospital</h1>
              <p className="text-xs text-muted-foreground">Facilities System</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id as View);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 p-2">
            <Avatar>
              <AvatarImage src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} />
              <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50" onClick={onSignOut} title="Sign Out">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

const Header = ({ title, user, onSignOut, setView, onMenuClick }: { title: string, user: User | null, onSignOut: () => void, setView: (v: View) => void, onMenuClick: () => void }) => {
  const notifications = [
    { id: 1, title: 'New Work Request', description: 'WR-2026-045 has been submitted.', time: '5m ago', unread: true },
    { id: 2, title: 'Work Order Assigned', description: 'You have been assigned to WO-2026-012.', time: '1h ago', unread: false },
    { id: 3, title: 'SLA Warning', description: 'WR-2026-038 is approaching SLA limit.', time: '2h ago', unread: true },
  ];

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu size={20} />
        </Button>
        <div>
          <h2 className="text-lg lg:text-xl font-bold truncate max-w-[150px] lg:max-w-none">{title}</h2>
          <p className="hidden sm:block text-xs text-muted-foreground">Wednesday, April 8, 2026</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
              <Bell className="text-gray-500" size={20} />
              {notifications.some(n => n.unread) && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-semibold">Notifications</span>
                <Badge variant="outline" className="text-[10px] h-4">New</Badge>
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.map(n => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-sm font-semibold ${n.unread ? 'text-blue-600' : ''}`}>{n.title}</span>
                      <span className="text-[10px] text-muted-foreground">{n.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-blue-600 text-xs font-medium cursor-pointer">
                View all notifications
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-10 px-2 rounded-full transition-colors">
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} />
                <AvatarFallback>{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold leading-none">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">My Account</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => setView('settings')}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setView('settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Preferences</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

const StatCard = ({ label, value, subtext, icon: Icon, colorClass, trend }: any) => (
  <Card className="overflow-hidden">
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
          <h3 className="text-3xl font-bold">{value}</h3>
          {trend && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <ArrowUpRight size={12} />
              {Math.abs(trend)}% from last month
            </p>
          )}
          {subtext && <p className="text-xs text-muted-foreground mt-2">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-full ${colorClass}`}>
          <Icon size={24} className="text-current" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const TechnicianDashboard = ({ requests = [], orders = [], user, onSelectRequest }: { requests: WorkRequest[], orders: WorkOrder[], user: User | null, onSelectRequest: (id: string) => void }) => {
  const myOrders = orders.filter(o => String(o.assignedTechnician) === String(user?._id));
  const activeTasks = myOrders.filter(o => o.status !== 'COMPLETED');
  const completedTasks = myOrders.filter(o => o.status === 'COMPLETED');

  return (
    <div className="p-4 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold">Welcome back, {user?.name}</h2>
          <p className="text-muted-foreground text-sm lg:text-base">You have {activeTasks.length} active tasks today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Active Tasks" 
          value={activeTasks.length} 
          icon={Clock} 
          colorClass="bg-orange-100 text-orange-600" 
        />
        <StatCard 
          label="Completed (Total)" 
          value={completedTasks.length} 
          icon={CheckCircle2} 
          colorClass="bg-green-100 text-green-600" 
        />
        <StatCard 
          label="Performance" 
          value="98%" 
          icon={BarChart3} 
          colorClass="bg-blue-100 text-blue-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">My Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTasks.length > 0 ? activeTasks.map(task => (
                <div key={task._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => {
                        const req = requests.find(r => r.wrId === task.wrId);
                        if (req) onSelectRequest(req._id);
                      }}>
                        {task.wrId}
                      </span>
                      <Badge variant="outline" className={task.status === 'IN PROGRESS' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}>
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{task.category}</p>
                    <p className="text-xs text-muted-foreground">Assigned: {new Date(task.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    const req = requests.find(r => r.wrId === task.wrId);
                    if (req) onSelectRequest(req._id);
                  }}>
                    View Details
                  </Button>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">No active tasks. Good job!</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {completedTasks.slice(0, 5).map((task, i) => (
                <div key={task._id} className="flex gap-4">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle2 size={16} />
                    </div>
                    {i !== completedTasks.slice(0, 5).length - 1 && (
                      <div className="absolute top-8 left-4 w-px h-full bg-gray-200 -translate-x-1/2"></div>
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-medium">Completed {task.wrId}</p>
                    <p className="text-xs text-muted-foreground">{new Date(task.endTime || task.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {completedTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No recent activity.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Dashboard = ({ stats, requests = [], orders = [], onSelectRequest, user }: { stats: Stats, requests: WorkRequest[], orders: WorkOrder[], onSelectRequest: (id: string) => void, user: User | null }) => {
  const safeRequests = Array.isArray(requests) ? requests : [];
  
  // Real data for charts
  const categoryData = stats.categories || [];
  const slaData = [
    { name: 'On Time', value: stats.closed, color: '#22c55e' },
    { name: 'Delayed', value: stats.total - stats.closed, color: '#f59e0b' },
  ];

  // Filter requests based on role for the table
  const tableRequests = user?.role === 'staff' 
    ? safeRequests.filter(r => r.userId === user._id)
    : safeRequests;

  if (user?.role === 'technician') {
    return <TechnicianDashboard requests={safeRequests} orders={orders} user={user} onSelectRequest={onSelectRequest} />;
  }

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        <StatCard 
          label={user?.role === 'staff' ? "My Total Requests" : "Total Tickets"} 
          value={user?.role === 'staff' ? tableRequests.length : stats.total} 
          trend={12} 
          icon={ClipboardList} 
          colorClass="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          label="Open" 
          value={user?.role === 'staff' ? tableRequests.filter(r => r.status === 'OPEN').length : stats.open} 
          subtext={user?.role === 'staff' ? "Awaiting action" : "Awaiting assignment"} 
          icon={AlertCircle} 
          colorClass="bg-gray-100 text-gray-600" 
        />
        <StatCard 
          label="In Progress" 
          value={user?.role === 'staff' ? tableRequests.filter(r => r.status === 'IN PROGRESS').length : stats.inProgress} 
          subtext="Being worked on" 
          icon={Clock} 
          colorClass="bg-orange-100 text-orange-600" 
        />
        <StatCard 
          label="Pending Confirm" 
          value={user?.role === 'staff' ? tableRequests.filter(r => r.status === 'PENDING USER CONFIRMATION').length : stats.pendingConfirm} 
          subtext="User verification" 
          icon={AlertCircle} 
          colorClass="bg-teal-100 text-teal-600" 
        />
        <StatCard 
          label="Closed" 
          value={user?.role === 'staff' ? tableRequests.filter(r => r.status === 'CLOSED').length : stats.closed} 
          subtext={user?.role === 'staff' ? "Completed requests" : `${stats.slaCompliance}% SLA compliance`} 
          icon={CheckCircle2} 
          colorClass="bg-green-100 text-green-600" 
        />
      </div>

      {/* Charts Row - Only for Admin/Supervisor/Manager */}
      {isAdminLike(user) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Tickets by Category</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">SLA Compliance</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={slaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {slaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-4">
                {slaData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs font-medium text-gray-600">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Tickets Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">{user?.role === 'staff' ? "My Recent Requests" : "Recent Tickets"}</CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600">View All</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WR ID</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>User Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRequests.slice(0, 5).map((req) => (
                <TableRow key={req._id}>
                  <TableCell className="font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => onSelectRequest(req._id)}>{req.wrId}</TableCell>
                  <TableCell>
                    {req.imageUrl ? (
                      <div className="w-8 h-8 rounded border overflow-hidden">
                        <img src={req.imageUrl} alt="Request" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded border bg-gray-50 flex items-center justify-center text-[8px] text-gray-400">
                        None
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{req.userName}</TableCell>
                  <TableCell>{req.department}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{req.location}</TableCell>
                  <TableCell>{req.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      req.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-200' :
                      req.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                      'bg-blue-50 text-blue-600 border-blue-200'
                    }>
                      {req.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      req.status === 'IN PROGRESS' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                      req.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                      'bg-gray-100 text-gray-700 hover:bg-gray-100'
                    }>
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const WorkRequestsView = ({ requests = [], user, onRefresh, onSelectRequest }: { requests: WorkRequest[], user: User | null, onRefresh: () => void, onSelectRequest: (id: string) => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
  const [newRequest, setNewRequest] = useState({
    userName: user?.name || '',
    department: user?.department || '',
    block: '',
    floor: '',
    room: '',
    category: '',
    priority: 'MEDIUM',
    description: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (user) {
      setNewRequest(prev => ({
        ...prev,
        userName: user.name,
        department: user.department
      }));
    }
  }, [user]);

  const safeRequests = Array.isArray(requests) ? requests : [];
  const displayRequests = user?.role === 'staff'
    ? safeRequests.filter(r => r.userId === user._id)
    : safeRequests;

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredRequests = displayRequests.filter(req => {
    const matchesSearch = 
      req.wrId.toLowerCase().includes(search.toLowerCase()) ||
      req.userName?.toLowerCase().includes(search.toLowerCase()) ||
      req.description?.toLowerCase().includes(search.toLowerCase()) ||
      req.location?.toLowerCase().includes(search.toLowerCase()) ||
      req.category.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || req.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let aValue = (a as any)[key];
    let bValue = (b as any)[key];

    if (key === 'createdAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRequest(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/work-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRequest,
          userId: user?._id,
          location: `${newRequest.block}, ${newRequest.floor}, ${newRequest.room}`
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        onRefresh();
        setNewRequest({ 
          userName: user?.name || '', 
          department: user?.department || '', 
          block: '', 
          floor: '', 
          room: '', 
          category: '', 
          priority: 'MEDIUM', 
          description: '', 
          imageUrl: '' 
        });
      }
    } catch (err) {
      console.error('Failed to create request:', err);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-muted-foreground order-2 sm:order-1">Showing {sortedRequests.length} of {displayRequests.length} requests</p>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 order-1 sm:order-2">
              <Plus size={18} className="mr-2" /> Create Work Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Work Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">Requestor Name</Label>
                  <Input 
                    id="userName"
                    placeholder="Enter your name" 
                    value={newRequest.userName}
                    onChange={(e) => setNewRequest({...newRequest, userName: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input 
                    id="department"
                    placeholder="e.g., Cardiology" 
                    value={newRequest.department}
                    onChange={(e) => setNewRequest({...newRequest, department: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="block">Block</Label>
                  <Input 
                    id="block"
                    placeholder="e.g., Block A" 
                    value={newRequest.block}
                    onChange={(e) => setNewRequest({...newRequest, block: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input 
                    id="floor"
                    placeholder="e.g., 3rd Floor" 
                    value={newRequest.floor}
                    onChange={(e) => setNewRequest({...newRequest, floor: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Input 
                    id="room"
                    placeholder="e.g., Room 305" 
                    value={newRequest.room}
                    onChange={(e) => setNewRequest({...newRequest, room: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select onValueChange={(v) => setNewRequest({...newRequest, category: v})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Medical Equipment">Medical Equipment</SelectItem>
                      <SelectItem value="HVAC">HVAC</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="Plumbing">Plumbing</SelectItem>
                      <SelectItem value="Cleaning">Cleaning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select onValueChange={(v) => setNewRequest({...newRequest, priority: v as any})} defaultValue="MEDIUM">
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea 
                  id="description"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the issue in detail..." 
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Attach Image (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="image"
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
                {newRequest.imageUrl && (
                  <div className="mt-2 relative w-20 h-20 border rounded overflow-hidden">
                    <img src={newRequest.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setNewRequest(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl text-[10px]"
                    >
                      X
                    </button>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Submit Request</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex flex-col md:flex-row items-center gap-4 bg-gray-50/30">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input 
                className="pl-10 bg-white" 
                placeholder="Search by ID, name, location, or description..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px] bg-white">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    <span>{statusFilter === 'ALL' ? 'All Status' : statusFilter}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="IN PROGRESS">In Progress</SelectItem>
                  <SelectItem value="PENDING USER CONFIRMATION">Pending User</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-[150px] bg-white">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-gray-400" />
                    <span>{priorityFilter === 'ALL' ? 'All Priority' : priorityFilter}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priority</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortButton label="WR ID" sortKey="wrId" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead>Image</TableHead>
                <TableHead><SortButton label="User Name" sortKey="userName" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Department" sortKey="department" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead>Location</TableHead>
                <TableHead><SortButton label="Category" sortKey="category" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Priority" sortKey="priority" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Created Date" sortKey="createdAt" currentSort={sortConfig} onSort={handleSort} /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRequests.map((req) => (
                <TableRow key={req._id}>
                  <TableCell className="font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => onSelectRequest(req._id)}>{req.wrId}</TableCell>
                  <TableCell>
                    {req.imageUrl ? (
                      <div className="w-10 h-10 rounded border overflow-hidden">
                        <img src={req.imageUrl} alt="Request" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded border bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{req.userName}</TableCell>
                  <TableCell>{req.department}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{req.location}</TableCell>
                  <TableCell>{req.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      req.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-200' :
                      req.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                      'bg-blue-50 text-blue-600 border-blue-200'
                    }>
                      {req.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(req.status)}>
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const WorkRequestDetailView = ({ request, onBack, onRefresh, user }: { request: WorkRequest | undefined, onBack: () => void, onRefresh: () => void, user: User | null }) => {
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [updateNote, setUpdateNote] = useState('');
  const [updateImage, setUpdateImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    const fetchTechs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setTechnicians(data.filter(u => u.role === 'technician'));
        }
      } catch (err) {
        console.error('Failed to fetch technicians:', err);
      }
    };
    fetchTechs();
  }, []);

  if (!request) return <div className="p-8">Request not found</div>;

  const handleStatusUpdate = async (status: string, note: string) => {
    try {
      const activity = {
        action: status,
        user: user?.name || 'System',
        timestamp: new Date(),
        note
      };
      
      const res = await fetch(`${API_BASE_URL}/api/work-requests/${request._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, activity })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAssign = async () => {
    const tech = technicians.find(t => t._id === selectedTech);
    if (!tech) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wrId: request.wrId,
          category: request.category,
          assignedTechnician: tech._id,
          technicianName: tech.name,
          status: 'ASSIGNED',
          adminName: user?.name || 'Admin'
        })
      });
      if (res.ok) {
        setIsAssignModalOpen(false);
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to assign technician:', err);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateNote.trim() && !updateImage) return;

    setIsPosting(true);
    try {
      const activity = {
        action: 'UPDATE',
        user: user?.name || 'User',
        timestamp: new Date(),
        note: updateNote,
        imageUrl: updateImage || undefined
      };

      const res = await fetch(`${API_BASE_URL}/api/work-requests/${request._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity })
      });

      if (res.ok) {
        setUpdateNote('');
        setUpdateImage(null);
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to add activity:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const slaRemaining = "-25h -57m remaining"; // Mocked for UI

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold">{request.wrId}</h2>
            <p className="text-xs lg:text-sm text-muted-foreground">
              Created on {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(request.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 px-4 py-1 self-start sm:self-auto">
          SLA: {slaRemaining}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded text-gray-500">
                  <UserIcon size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requestor</p>
                  <p className="text-sm font-medium">{request.userName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded text-gray-500">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium">{request.department}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded text-gray-500">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{request.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded text-gray-500">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Badge variant="outline" className={
                    request.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border-red-200' :
                    request.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                    'bg-blue-50 text-blue-600 border-blue-200'
                  }>
                    {request.priority}
                  </Badge>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded text-gray-500">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-medium">{request.category}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded text-gray-500">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={
                    request.status === 'IN PROGRESS' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                    request.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                    request.status === 'OPEN' ? 'bg-gray-100 text-gray-700 hover:bg-gray-100' :
                    'bg-teal-100 text-teal-700 hover:bg-teal-100'
                  }>
                    {request.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 leading-relaxed">
                {request.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          {/* Attachment */}
          {request.imageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Initial Attachment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden bg-gray-50">
                  <img src={request.imageUrl} alt="Request Attachment" className="w-full h-auto max-h-[500px] object-contain mx-auto" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Post Update Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Post an Update</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div className="space-y-2">
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    placeholder="Enter your update here..."
                    value={updateNote}
                    onChange={(e) => setUpdateNote(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="update-image" className="cursor-pointer flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                      <Camera size={18} />
                      <span>{updateImage ? 'Change Image' : 'Add Image'}</span>
                      <input 
                        id="update-image" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setUpdateImage(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </Label>
                    {updateImage && (
                      <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setUpdateImage(null)}>Remove</Button>
                    )}
                  </div>
                  <Button type="submit" disabled={isPosting || (!updateNote.trim() && !updateImage)} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 px-6">
                    <Send size={16} />
                    {isPosting ? 'Posting...' : 'Post Update'}
                  </Button>
                </div>

                {updateImage && (
                  <div className="mt-4 relative w-32 h-32 rounded-md border overflow-hidden group">
                    <img src={updateImage} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-[10px] font-medium">Preview</p>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {request.activities && request.activities.length > 0 ? (
                request.activities.map((activity, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="relative">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white z-10 relative">
                        <CheckCircle2 size={16} />
                      </div>
                      {i !== request.activities!.length - 1 && (
                        <div className="absolute top-8 left-4 w-0.5 h-full bg-gray-100 -translate-x-1/2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <p className="text-sm font-semibold">{activity.action}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{activity.note} by <span className="font-medium text-gray-700">{activity.user}</span></p>
                          {activity.imageUrl && (
                            <div className="mt-3 rounded-lg border overflow-hidden max-w-sm bg-gray-50">
                              <img 
                                src={activity.imageUrl} 
                                alt="Activity attachment" 
                                className="w-full h-auto max-h-[300px] object-contain" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground bg-gray-50 px-2 py-1 rounded border">
                          {new Date(activity.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex gap-4">
                  <div className="relative">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white z-10 relative">
                      <CheckCircle2 size={16} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold">Ticket Created</p>
                        <p className="text-xs text-muted-foreground">Work request submitted by {request.userName}</p>
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground bg-gray-50 px-2 py-1 rounded border">
                        {new Date(request.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {isAdminLike(user) || user?.role === 'technician' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isAdminLike(user) && (
                  <>
                    {request.status === 'OPEN' && (
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2" 
                        onClick={() => setIsAssignModalOpen(true)}
                      >
                        <ClipboardCheck size={18} /> Approve & Convert to WO
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-start gap-3 text-gray-600" 
                      onClick={() => setIsAssignModalOpen(true)}
                      disabled={request.status === 'CLOSED'}
                    >
                      <UserPlus size={18} /> Assign Technician
                    </Button>
                  </>
                )}
                
                {(isAdminLike(user) || user?.role === 'technician') && (
                  <>
                    {request.status !== 'IN PROGRESS' && (
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-start gap-3 text-gray-600" 
                        onClick={() => handleStatusUpdate('IN PROGRESS', 'Work started')}
                        disabled={request.status === 'CLOSED'}
                      >
                        <Play size={18} /> Start Work
                      </Button>
                    )}
                    
                    {request.status !== 'ON HOLD' && request.status !== 'CLOSED' && (
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-start gap-3 text-gray-600" 
                        onClick={() => handleStatusUpdate('ON HOLD', 'Work put on hold')}
                      >
                        <Pause size={18} /> Put On Hold
                      </Button>
                    )}
                    
                    {request.status !== 'CLOSED' && (
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-start gap-3 text-gray-600" 
                        onClick={() => handleStatusUpdate('CLOSED', 'Work completed')}
                      >
                        <CheckCircle2 size={18} /> Mark as Completed
                      </Button>
                    )}
                  </>
                )}
                
                {isAdminLike(user) && (
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100" 
                    onClick={() => handleStatusUpdate('CLOSED', 'Request rejected')}
                    disabled={request.status === 'CLOSED'}
                  >
                    <XCircle size={18} /> Reject Request
                  </Button>
                )}

                {request.status === 'CLOSED' && (isAdminLike(user) || user?.role === 'technician') && (
                  <Button variant="outline" className="w-full flex items-center justify-start gap-3 text-blue-600 hover:bg-blue-50 border-blue-100" onClick={() => handleStatusUpdate('OPEN', 'Request reopened')}>
                    <RotateCcw size={18} /> Reopen Request
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Assign Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Technician</Label>
              <Select onValueChange={setSelectedTech}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map(tech => (
                    <SelectItem key={tech._id} value={tech._id}>{tech.name} ({tech.department})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600" onClick={handleAssign} disabled={!selectedTech}>Assign & Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const WorkOrdersView = ({ requests = [], orders = [], onRefresh, user, onSelectRequest }: { requests: WorkRequest[], orders: WorkOrder[], onRefresh: () => void, user: User | null, onSelectRequest: (id: string) => void }) => {
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedWR, setSelectedWR] = useState<WorkRequest | null>(null);
  const [selectedTech, setSelectedTech] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });

  const fetchTechs = async () => {
    const res = await fetch(`${API_BASE_URL}/api/users`);
    const data = await res.json();
    setTechnicians(Array.isArray(data) ? data.filter((u: User) => u.role === 'technician') : []);
  };

  useEffect(() => {
    fetchTechs();
  }, []);

  const handleAssign = async () => {
    if (!selectedWR || !selectedTech) return;
    const tech = technicians.find(t => t._id === selectedTech);
    try {
      const res = await fetch(`${API_BASE_URL}/api/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wrId: selectedWR.wrId,
          category: selectedWR.category,
          assignedTechnician: tech?._id,
          technicianName: tech?.name,
          status: 'ASSIGNED'
        })
      });
      if (res.ok) {
        setIsAssignModalOpen(false);
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to assign:', err);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/work-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          startTime: status === 'IN PROGRESS' ? new Date() : undefined,
          endTime: status === 'COMPLETED' ? new Date() : undefined
        })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const unassignedRequests = requests.filter(r => r.status === 'OPEN');

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const myOrders = user?.role === 'technician' 
    ? orders.filter(o => String(o.assignedTechnician) === String(user._id))
    : orders;

  const filteredOrders = myOrders.filter(order => {
    const matchesSearch = 
      order.woId.toLowerCase().includes(search.toLowerCase()) ||
      order.wrId.toLowerCase().includes(search.toLowerCase()) ||
      order.technicianName?.toLowerCase().includes(search.toLowerCase()) ||
      order.category?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let aValue = (a as any)[key];
    let bValue = (b as any)[key];

    if (key === 'createdAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard label="Total Work Orders" value={orders.length} icon={Wrench} colorClass="bg-blue-100 text-blue-600" />
        <StatCard label="Assigned" value={orders.filter(o => o.status === 'ASSIGNED').length} icon={Clock} colorClass="bg-purple-100 text-purple-600" />
        <StatCard label="In Progress" value={orders.filter(o => o.status === 'IN PROGRESS').length} icon={Clock} colorClass="bg-orange-100 text-orange-600" />
        <StatCard label="Completed" value={orders.filter(o => o.status === 'COMPLETED').length} icon={CheckCircle2} colorClass="bg-green-100 text-green-600" />
      </div>

      {isAdminLike(user) && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Unassigned Requests</h3>
            <p className="text-sm text-muted-foreground">{unassignedRequests.length} pending assignment</p>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>WR ID</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassignedRequests.map(wr => (
                    <TableRow key={wr._id}>
                      <TableCell className="font-medium">{wr.wrId}</TableCell>
                      <TableCell>{wr.category}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{wr.priority}</Badge>
                      </TableCell>
                      <TableCell>{wr.department}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => { setSelectedWR(wr); setIsAssignModalOpen(true); }}>
                          Assign Technician
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {unassignedRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pending requests</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Technician to {selectedWR?.wrId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Technician</Label>
              <Select onValueChange={setSelectedTech}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a technician..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map(tech => (
                    <SelectItem key={tech._id} value={tech._id}>{tech.name} ({tech.department})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-blue-600" onClick={handleAssign}>Confirm Assignment</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold">Active Work Orders</CardTitle>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input 
                className="pl-9 h-9" 
                placeholder="Search orders..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full md:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="IN PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortButton label="WO ID" sortKey="woId" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Linked WR ID" sortKey="wrId" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Category" sortKey="category" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Assigned Technician" sortKey="technicianName" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((wo) => {
                const linkedRequest = requests.find(r => r.wrId === wo.wrId);
                return (
                  <TableRow key={wo._id}>
                    <TableCell className="font-medium">{wo.woId}</TableCell>
                    <TableCell 
                      className="text-blue-600 cursor-pointer hover:underline"
                      onClick={() => linkedRequest && onSelectRequest(linkedRequest._id)}
                    >
                      {wo.wrId}
                    </TableCell>
                    <TableCell>{wo.category}</TableCell>
                    <TableCell>{wo.technicianName}</TableCell>
                    <TableCell>
                      <Badge className={
                        wo.status === 'IN PROGRESS' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                        wo.status === 'ASSIGNED' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' :
                        wo.status === 'ON HOLD' ? 'bg-gray-100 text-gray-700 hover:bg-gray-100' :
                        'bg-green-100 text-green-700 hover:bg-green-100'
                      }>
                        {wo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {wo.status === 'ASSIGNED' && (
                        <Button variant="outline" size="sm" onClick={() => updateStatus(wo._id, 'IN PROGRESS')}>Start</Button>
                      )}
                      {wo.status === 'IN PROGRESS' && (
                        <Button variant="outline" size="sm" onClick={() => updateStatus(wo._id, 'COMPLETED')}>Complete</Button>
                      )}
                      {wo.status === 'ON HOLD' && (
                        <Button variant="outline" size="sm" onClick={() => updateStatus(wo._id, 'IN PROGRESS')}>Resume</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {sortedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No work orders found matching your criteria</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const ReportsView = ({ stats, requests, orders, user }: { stats: Stats, requests: WorkRequest[], orders: WorkOrder[], user: User | null }) => {
  const categoryData = stats.categories || [];
  const trendData = stats.trend || [];
  const techData = stats.technicians || [];

  const handleExport = () => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      alert('Only Admins and Managers can export reports.');
      return;
    }

    // Prepare report data
    const reportData = requests.map(req => {
      const order = orders.find(o => o.wrId === req.wrId);
      const assignedTo = order ? order.technicianName : 'Unassigned';
      const resolvedAt = order && order.status === 'COMPLETED' ? new Date(order.endTime!).toLocaleString() : 'N/A';
      
      // Find who assigned it from activities
      const assignmentActivity = req.activities?.find(a => a.action === 'ASSIGNED' || a.action === 'RE-ASSIGNED');
      const assignedBy = assignmentActivity ? assignmentActivity.user : 'N/A';

      return {
        'Request ID': req.wrId,
        'Date Raised': new Date(req.createdAt).toLocaleString(),
        'Raised By': req.userName,
        'Department': req.department,
        'Location': `${req.block || ''} ${req.floor || ''} ${req.room || ''}`.trim(),
        'Category': req.category,
        'Priority': req.priority,
        'Status': req.status,
        'Assigned By': assignedBy,
        'Assigned To': assignedTo,
        'Resolved Date': resolvedAt,
        'Description': req.description.replace(/,/g, ';') // Avoid CSV issues
      };
    });

    // Convert to CSV
    const headers = Object.keys(reportData[0]);
    const csvRows = [
      headers.join(','),
      ...reportData.map(row => headers.map(header => `"${(row as any)[header]}"`).join(','))
    ];
    const csvContent = csvRows.join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Facility_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPrivileged = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="p-4 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold">System Reports</h2>
          <p className="text-sm text-muted-foreground">Generate and view facility reports based on real system data</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {isPrivileged && (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleExport}>
              <ArrowUpRight size={18} className="mr-2" /> Extract Full Report (CSV)
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Monthly Ticket Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="closed" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="open" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs font-medium">Total Tickets</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs font-medium">Closed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-xs font-medium">Open</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tickets by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'][index % 7]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">SLA Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'On Time', value: stats.closed }, { name: 'Delayed', value: stats.total - stats.closed }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                  {[1, 2].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
              <p className="text-2xl font-bold text-green-600">{stats.slaCompliance}%</p>
              <p className="text-xs text-muted-foreground font-medium">Overall SLA Compliance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technician Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Technician Name</TableHead>
                <TableHead>Completed Tickets</TableHead>
                <TableHead>Performance Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {techData.length > 0 ? techData.map((tech) => (
                <TableRow key={tech.name}>
                  <TableCell className="font-medium">{tech.name}</TableCell>
                  <TableCell>{tech.completed}</TableCell>
                  <TableCell className="w-[300px]">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${Math.min(tech.completed * 10, 100)}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-gray-500">{Math.min(tech.completed * 10, 100)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No technician data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Detailed Request Log</CardTitle>
          <CardDescription>Comprehensive list of all facility maintenance activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">ID</TableHead>
                  <TableHead className="whitespace-nowrap">Raised Date</TableHead>
                  <TableHead className="whitespace-nowrap">Raised By</TableHead>
                  <TableHead className="whitespace-nowrap">Assigned To</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Resolved Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.slice(0, 10).map((req) => {
                  const order = orders.find(o => o.wrId === req.wrId);
                  return (
                    <TableRow key={req._id}>
                      <TableCell className="font-medium">{req.wrId}</TableCell>
                      <TableCell className="text-xs">{new Date(req.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{req.userName}</TableCell>
                      <TableCell className="text-xs">{order ? order.technicianName : 'Unassigned'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(req.status)}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {order && order.status === 'COMPLETED' ? new Date(order.endTime!).toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {requests.length > 10 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground italic">
                      Showing latest 10 requests. Use "Extract Full Report" for complete data.
                    </TableCell>
                  </TableRow>
                )}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const UserManagementView = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'staff' as const,
    department: ''
  });

  const fetchUsers = async () => {
    const res = await fetch(`${API_BASE_URL}/api/users`);
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        fetchUsers();
        setNewUser({ name: '', username: '', email: '', password: '', role: 'staff', department: '' });
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${editingUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        fetchUsers();
        setEditingUser(null);
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let aValue = (a as any)[key] || '';
    let bValue = (b as any)[key] || '';

    if (key === 'createdAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl lg:text-2xl font-bold">User Management</h3>
          <p className="text-sm text-muted-foreground">Manage system users, roles, and permissions</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingUser(null); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2">
              <UserPlus size={18} /> Add New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
              <CardDescription>
                Enter user details and assign a role within the facility system.
              </CardDescription>
            </DialogHeader>
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    placeholder="John Doe" 
                    value={editingUser ? editingUser.name : newUser.name}
                    onChange={(e) => editingUser ? setEditingUser({...editingUser, name: e.target.value}) : setNewUser({...newUser, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input 
                    placeholder="johndoe" 
                    value={editingUser ? editingUser.username : newUser.username}
                    onChange={(e) => editingUser ? setEditingUser({...editingUser, username: e.target.value}) : setNewUser({...newUser, username: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input 
                  type="email"
                  placeholder="john@mahsa.edu.my" 
                  value={editingUser ? editingUser.email : newUser.email}
                  onChange={(e) => editingUser ? setEditingUser({...editingUser, email: e.target.value}) : setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password {editingUser && '(Leave blank to keep current)'}</Label>
                <Input 
                  type="password"
                  placeholder="••••••••" 
                  value={editingUser ? '' : newUser.password}
                  onChange={(e) => editingUser ? setEditingUser({...editingUser, password: e.target.value} as any) : setNewUser({...newUser, password: e.target.value})}
                  required={!editingUser}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select 
                    onValueChange={(v) => editingUser ? setEditingUser({...editingUser, role: v as any}) : setNewUser({...newUser, role: v as any})} 
                    value={editingUser ? editingUser.role : newUser.role}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input 
                    placeholder="Facilities" 
                    value={editingUser ? editingUser.department : newUser.department}
                    onChange={(e) => editingUser ? setEditingUser({...editingUser, department: e.target.value}) : setNewUser({...newUser, department: e.target.value})}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingUser ? 'Save Changes' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/30 border-b flex flex-col md:flex-row items-center justify-between gap-4 p-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              className="pl-10 bg-white" 
              placeholder="Search by name, email, or department..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[160px] bg-white">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-gray-400" />
                  <span>{roleFilter === 'ALL' ? 'All Roles' : roleFilter}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {sortedUsers.length} users found
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[300px]"><SortButton label="User Details" sortKey="name" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Role" sortKey="role" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Department" sortKey="department" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortButton label="Joined Date" sortKey="createdAt" currentSort={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((u) => (
                <TableRow key={u._id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarImage src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`capitalize font-medium ${
                      u.role === 'admin' ? 'bg-red-50 text-red-700 border-red-100' :
                      u.role === 'manager' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      u.role === 'supervisor' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      u.role === 'technician' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      'bg-gray-50 text-gray-700 border-gray-100'
                    }`}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-600">{u.department}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => { setEditingUser(u); setIsModalOpen(true); }}
                      >
                        <Settings size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteUser(u._id)}
                      >
                        <XCircle size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const SettingsView = ({ user }: { user: User | null }) => {
  return (
    <div className="p-4 lg:p-8 max-w-2xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Manage your personal information and account preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b text-center sm:text-left">
            <Avatar className="h-20 w-20 border-4 border-white shadow-md">
              <AvatarImage src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} />
              <AvatarFallback className="text-2xl">{user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h4 className="text-xl font-bold">{user?.name}</h4>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge className="mt-2 capitalize mx-auto sm:mx-0 w-fit">{user?.role}</Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={user?.name} readOnly className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user?.username} readOnly className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={user?.email} readOnly className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={user?.department} readOnly className="bg-gray-50" />
            </div>
          </div>
          
          <div className="pt-4">
            <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">Change Password</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure how you receive alerts and updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="text-sm font-semibold">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive updates about your work requests via email.</p>
            </div>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative">
              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="text-sm font-semibold">Push Notifications</p>
              <p className="text-xs text-muted-foreground">Receive real-time alerts in your browser.</p>
            </div>
            <div className="w-10 h-5 bg-gray-200 rounded-full relative">
              <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Main App ---

const LoginView = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data);
      } else {
        setError(data.error || 'Login failed. Try admin / password123');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4">
            <Wrench size={28} />
          </div>
          <CardTitle className="text-2xl font-bold">Facility Management</CardTitle>
          <CardDescription>Enter your credentials to access the MAHSA system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="admin" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              <p>Demo accounts:</p>
              <p>Admin: admin / password123</p>
              <p>Manager: manager / password123</p>
              <p>Tech: mike / password123</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0, open: 0, inProgress: 0, pendingConfirm: 0, closed: 0, slaCompliance: 0
  });
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, requestsRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/stats`),
        fetch(`${API_BASE_URL}/api/work-requests`),
        fetch(`${API_BASE_URL}/api/work-orders`)
      ]);
      const statsData = await statsRes.json();
      const requestsData = await requestsRes.json();
      const ordersData = await ordersRes.json();
      
      if (statsData && !statsData.error) {
        setStats(statsData);
      }
      
      if (Array.isArray(requestsData)) {
        setRequests(requestsData);
      } else {
        setRequests([]);
      }

      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setRequests([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('facility_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      if (parsed.role === 'technician') setView('work-orders');
      if (parsed.role === 'staff') setView('work-requests');
    }
    fetchData();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('facility_user', JSON.stringify(userData));
    if (userData.role === 'technician') setView('work-orders');
    else if (userData.role === 'staff') setView('work-requests');
    else setView('dashboard');
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('facility_user');
    setView('dashboard');
    setSelectedRequestId(null);
  };

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard stats={stats} requests={requests} orders={orders} onSelectRequest={(id) => { setSelectedRequestId(id); setView('work-request-detail'); }} user={user} />;
      case 'work-requests':
        return <WorkRequestsView requests={requests} user={user} onRefresh={fetchData} onSelectRequest={(id) => { setSelectedRequestId(id); setView('work-request-detail'); }} />;
      case 'work-request-detail':
        const selectedReq = requests.find(r => r._id === selectedRequestId);
        return <WorkRequestDetailView 
          request={selectedReq} 
          onBack={() => {
            if (user?.role === 'technician') {
              setView('work-orders');
            } else {
              setView('work-requests');
            }
          }} 
          onRefresh={fetchData} 
          user={user} 
        />;
      case 'work-orders':
        return <WorkOrdersView requests={requests} orders={orders} onRefresh={fetchData} user={user} onSelectRequest={(id) => { setSelectedRequestId(id); setView('work-request-detail'); }} />;
      case 'reports':
        if (user?.role !== 'admin' && user?.role !== 'manager') {
          return <Dashboard stats={stats} requests={requests} orders={orders} onSelectRequest={(id) => { setSelectedRequestId(id); setView('work-request-detail'); }} user={user} />;
        }
        return <ReportsView stats={stats} requests={requests} orders={orders} user={user} />;
      case 'user-management':
        return <UserManagementView />;
      case 'settings':
        return <SettingsView user={user} />;
      default:
        return <Dashboard stats={stats} requests={requests} orders={orders} onSelectRequest={(id) => { setSelectedRequestId(id); setView('work-request-detail'); }} user={user} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900 overflow-x-hidden">
      <Sidebar 
        currentView={view} 
        setView={setView} 
        user={user} 
        onSignOut={handleSignOut} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title={view.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} 
          user={user} 
          onSignOut={handleSignOut} 
          setView={setView} 
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
