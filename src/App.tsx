import React, { useState, useEffect } from 'react';
import { useAuth } from './lib/auth.tsx';
import { Button } from '../components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { ScrollArea } from '../components/ui/scroll-area.tsx';
import { Users, LayoutDashboard, CheckSquare, Wallet, Send, Settings, LogOut, Loader2, CreditCard, Search, Ban, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user, loading, login, logout, getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-4 font-sans">
        <Card className="w-full max-w-md bg-card border-border shadow-2xl">
          <CardHeader className="text-center border-b border-border pb-6">
            <div className="w-12 h-12 bg-primary rounded mx-auto mb-4 flex items-center justify-center font-bold text-primary-foreground text-xl">TB</div>
            <CardTitle className="text-xl font-bold uppercase tracking-tight">BotAdmin <span className="text-primary">v3.12</span></CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-8">
            <div className="space-y-1 text-center">
              <p className="text-foreground font-medium">Terminal Authorization</p>
              <p className="text-muted-foreground text-xs uppercase tracking-widest">Secure Admin Portal</p>
            </div>
            <Button onClick={login} className="w-full py-6 font-bold uppercase tracking-wider">
              Authenticate via Google
            </Button>
            <div className="text-[10px] text-center text-muted-foreground uppercase tracking-tighter">
              Authorized personnel only. All access is logged.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground font-sans">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-primary-foreground">TB</div>
            <h1 className="text-lg font-semibold tracking-tight uppercase">BotAdmin <span className="text-muted-foreground font-normal ml-2 text-sm">v3.12.4</span></h1>
          </div>
          <div className="flex items-center gap-8 text-xs font-mono">
            <div className="flex flex-col">
              <span className="text-muted-foreground uppercase text-[10px]">System Health</span>
              <span className="text-primary">Operational</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground uppercase text-[10px]">Webhook Status</span>
              <span className="text-primary">200 OK</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground uppercase text-[10px]">Redis Cache</span>
              <span className="text-blue-400 font-bold">HIT (98.2%)</span>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-bold">{user.displayName || 'Admin_Root'}</div>
                <div className="text-muted-foreground text-[10px]">Superuser</div>
              </div>
              <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-border bg-muted" />
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside className="w-60 border-r border-border bg-card/20 p-4 flex flex-col gap-1">
            <div className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest mb-3 px-2">Navigation</div>
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <NavItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18} />} label="User Management" />
            <NavItem active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={18} />} label="Task Configuration" />
            <NavItem active={activeTab === 'withdrawals'} onClick={() => setActiveTab('withdrawals')} icon={<Wallet size={18} />} label="TON Withdrawals" />
            <NavItem active={activeTab === 'deposits'} onClick={() => setActiveTab('deposits')} icon={<CreditCard size={18} />} label="Deposit Requests" />
            <NavItem active={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} icon={<Send size={18} />} label="Broadcast System" />
            
            <div className="mt-auto">
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded text-red-400 text-sm hover:bg-red-500/10 transition-colors cursor-pointer">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-background/50">
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'dashboard' && <Dashboard />}
                  {activeTab === 'users' && <UsersList />}
                  {activeTab === 'tasks' && <TasksManager />}
                  {activeTab === 'withdrawals' && <WithdrawalsManager />}
                  {activeTab === 'deposits' && <DepositsManager />}
                  {activeTab === 'broadcast' && <BroadcastManager />}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="h-8 bg-card border-t border-border px-6 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex gap-4">
            <span>CPU: 12%</span>
            <span>RAM: 1.2GB / 4GB</span>
            <span>PostgreSQL: Connected</span>
          </div>
          <div>
            <span>Last Sync: {new Date().toLocaleString()}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors cursor-pointer ${
        active 
          ? 'bg-primary/10 text-primary border border-primary/20 font-medium' 
          : 'text-muted-foreground hover:bg-secondary/50'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        {label}
      </div>
      {badge !== undefined && (
        <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{badge}</span>
      )}
    </button>
  );
}

// Sub-components for pages
function Dashboard() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      } else {
        setStats({ error: data.error || 'Failed to fetch stats' });
      }
    } catch (e) {
      setStats({ error: 'Network error' });
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;
  if (stats.error) return <div className="p-12 text-center text-red-400 font-mono text-xs uppercase tracking-widest">{stats.error}</div>;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 flex justify-between items-center bg-secondary/20 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">System Live</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">LAST_SYNC: {new Date().toLocaleTimeString()}</span>
      </div>
      <div className="col-span-4 bg-card border border-border rounded-lg p-4 flex flex-col justify-between min-h-[100px]">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Users</span>
        <div className="flex items-end justify-between">
          <span className="text-3xl font-mono text-foreground">{(stats.totalUsers || 0).toLocaleString()}</span>
          <span className="text-primary text-xs font-bold">+12% ↑</span>
        </div>
      </div>
      <div className="col-span-4 bg-card border border-border rounded-lg p-4 flex flex-col justify-between min-h-[100px]">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Today's Joins</span>
        <div className="flex items-end justify-between">
          <span className="text-3xl font-mono text-foreground">{(stats.todayUsers || 0).toLocaleString()}</span>
          <span className="text-muted-foreground text-[10px]">REAL-TIME</span>
        </div>
      </div>
      <div className="col-span-4 bg-card border border-border rounded-lg p-4 flex flex-col justify-between min-h-[100px]">
        <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Pending Withdrawals</span>
        <div className="flex items-end justify-between">
          <span className={`text-3xl font-mono ${(stats.pendingWithdraws || 0) > 0 ? 'text-amber-500' : 'text-foreground'}`}>{stats.pendingWithdraws || 0}</span>
          <span className="text-blue-400 text-xs font-bold">ACTION REQ</span>
        </div>
      </div>

      <div className="col-span-8 bg-card border border-border rounded-lg flex flex-col overflow-hidden h-[400px]">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase">System Monitoring</h3>
          <button className="text-[10px] bg-secondary px-2 py-1 rounded text-muted-foreground">Detailed Logs</button>
        </div>
        <div className="p-6 flex-1 flex items-center justify-center border-b border-border">
          <div className="text-center">
            <p className="text-muted-foreground text-sm font-mono mb-2">Live traffic and event streaming</p>
            <div className="flex gap-1 justify-center">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-primary/30 rounded-full"
                  animate={{ height: [10, Math.random() * 40 + 10, 10] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 bg-card/50">
          <div className="font-mono text-[10px] space-y-1 text-muted-foreground">
             <div><span className="text-blue-500">[2024-05-24 14:22:11]</span> <span className="text-foreground font-bold">USER_JOIN:</span> New registration verified via referral</div>
             <div><span className="text-blue-500">[2024-05-24 14:22:15]</span> <span className="text-foreground font-bold">TASK_VERIFY:</span> User completed mandatory channel join</div>
          </div>
        </div>
      </div>

      <div className="col-span-4 bg-card border border-border rounded-lg p-4 flex flex-col h-[400px]">
        <h3 className="text-sm font-bold uppercase mb-4">Distribution Analysis</h3>
        <div className="space-y-4 flex-1">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] uppercase font-bold">
              <span>TON Network</span>
              <span className="text-muted-foreground">45%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[45%]"></div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] uppercase font-bold">
              <span>Solana (SPL)</span>
              <span className="text-muted-foreground">32%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[32%]"></div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] uppercase font-bold">
              <span>Polygon (BEP20)</span>
              <span className="text-muted-foreground">18%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-[18%]"></div>
            </div>
          </div>
        </div>
        <div className="pt-4 mt-auto border-t border-border flex justify-between">
           <div className="text-center">
             <div className="text-foreground font-mono font-bold">152k</div>
             <div className="text-[10px] text-muted-foreground uppercase">Tx Count</div>
           </div>
           <div className="text-center">
             <div className="text-foreground font-mono font-bold">0.02s</div>
             <div className="text-[10px] text-muted-foreground uppercase">DB Latency</div>
           </div>
           <div className="text-center">
             <div className="text-foreground font-mono font-bold">4.2/s</div>
             <div className="text-[10px] text-muted-foreground uppercase">Req/Sec</div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, highlight = false }: { title: string, value: string | number, subValue: string, highlight?: boolean }) {
  return (
    <Card className={`shadow-sm border-l-4 ${highlight ? 'border-l-red-500' : 'border-l-primary'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
      </CardContent>
    </Card>
  );
}

function UsersList() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.status === 403) {
        setError('Admin access required');
      } else if (!res.ok) {
        setError(data.error || 'Failed to fetch users');
      } else {
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleBan = async (id: number, ban: boolean) => {
    const token = await getToken();
    await fetch(`/api/users/${id}/ban`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ban })
    });
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">User Database</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID, Name or Username..." 
              className="pl-9 w-[300px] bg-card border-border text-xs" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchUsers}>Refresh</Button>
        </div>
      </div>
      <Card className="bg-card border-border overflow-hidden">
        <ScrollArea className="h-[600px]">
          {loading && users.length === 0 ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : error ? (
            <div className="p-12 text-center text-red-400 font-mono text-xs uppercase tracking-widest">{error}</div>
          ) : (
            <Table>
            <TableHeader className="bg-background/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">User Identity</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Network ID</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Allocations</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Registry Date</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Status</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(users) && users.map((user) => (
                <TableRow key={user.id} className="border-border hover:bg-secondary/20">
                  <TableCell>
                    <div className="font-bold text-sm text-foreground">{user.userFullName || user.fullName || 'No Name'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">@{user.userUsername || user.username || 'n/a'}</div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-blue-400">{user.tgId.toString()}</TableCell>
                  <TableCell>
                    <div className="text-[10px] text-primary font-mono">FWC: {user.balanceReward}</div>
                    <div className="text-[10px] text-blue-400 font-mono">TON: ${user.balanceWithdrawable.toFixed(4)}</div>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground font-mono">
                    {user.joinDate ? new Date(user.joinDate).toISOString().split('T')[0] : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge className={user.isBanned ? "bg-red-500/20 text-red-500 border-red-500/30" : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"}>
                      {user.isBanned ? "REVOKED" : "AUTHORIZED"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleBan(user.id, !user.isBanned)}
                      className={user.isBanned ? "text-emerald-500 hover:text-emerald-600" : "text-rose-500 hover:text-rose-600"}
                    >
                      {user.isBanned ? <CheckCircle size={16} /> : <Ban size={16} />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}

function TasksManager() {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'tg_channel',
    buttonUrl: '',
    reward: 10,
    required: true
  });

  const fetchTasks = async () => {
    const token = await getToken();
    const res = await fetch('/api/tasks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newTask)
    });
    setIsAdding(false);
    setNewTask({ title: '', description: '', type: 'tg_channel', buttonUrl: '', reward: 10, required: true });
    fetchTasks();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">Reward Protocols</h2>
        <Button onClick={() => setIsAdding(!isAdding)} size="sm">
          {isAdding ? 'Cancel' : 'Create Protocol'}
        </Button>
      </div>

      {isAdding && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase">New Reward Protocol</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Protocol Title</Label>
                <Input 
                  placeholder="e.g. Join Official Channel" 
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="bg-background text-xs"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Reward (FWC)</Label>
                <Input 
                  type="number"
                  value={newTask.reward}
                  onChange={(e) => setNewTask({...newTask, reward: parseInt(e.target.value)})}
                  className="bg-background text-xs"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Protocol Description</Label>
                <Input 
                  placeholder="What should the user do?" 
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="bg-background text-xs"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Type</Label>
                <select 
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={newTask.type}
                  onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                >
                  <option value="tg_channel">Telegram Channel</option>
                  <option value="tg_group">Telegram Group</option>
                  <option value="website">Website Visit</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="youtube">YouTube</option>
                  <option value="discord">Discord</option>
                  <option value="custom">Custom Action</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Resource URL</Label>
                <Input 
                  placeholder="https://t.me/..." 
                  value={newTask.buttonUrl}
                  onChange={(e) => setNewTask({...newTask, buttonUrl: e.target.value})}
                  className="bg-background text-xs"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input 
                  type="checkbox" 
                  id="required"
                  checked={newTask.required}
                  onChange={(e) => setNewTask({...newTask, required: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="required" className="text-xs">Mark as Mandatory (Required for Referrals)</Label>
              </div>
              <div className="md:col-span-2 pt-2">
                <Button type="submit" className="w-full">Initialize Protocol</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(tasks) && tasks.map(task => (
          <Card key={task.id} className="bg-card border-border hover:border-primary/50 transition-all group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-bold uppercase text-foreground">{task.title}</CardTitle>
                <Badge variant="outline" className="text-[8px] font-mono border-muted-foreground/30">{task.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-4 min-h-[32px]">{task.description}</p>
              <div className="pt-4 border-t border-border flex justify-between items-center text-[10px] font-mono">
                <div className="flex flex-col">
                  <span className="text-muted-foreground uppercase text-[8px]">Reward Allocation</span>
                  <span className="text-primary font-bold">{task.reward} FWC</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-muted-foreground uppercase text-[8px]">Constraint</span>
                  <span className={`${task.required ? 'text-amber-500' : 'text-slate-500'}`}>
                    {task.required ? 'MANDATORY' : 'OPTIONAL'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function WithdrawalsManager() {
  const { getToken } = useAuth();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const fetchWithdrawals = async () => {
    const token = await getToken();
    const res = await fetch('/api/withdrawals', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setWithdrawals(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleUpdateStatus = async (id: number, status: string) => {
    const token = await getToken();
    await fetch(`/api/withdrawals/${id}/status`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    fetchWithdrawals();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] uppercase">Pending</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] uppercase">Processing</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase">Completed</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px] uppercase">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] uppercase">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">Withdrawal Management</h2>
        <Button size="sm" variant="outline" onClick={fetchWithdrawals} className="text-xs h-8">Refresh</Button>
      </div>
      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-background/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">User ID</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">TON Value ($)</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Wallet Detail</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(withdrawals) && withdrawals.map((w) => (
              <TableRow key={w.id} className="border-border hover:bg-secondary/10">
                <TableCell className="text-xs">
                  <div className="font-bold">{w.userFullName || `User #${w.userId}`}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">@{w.userUsername || 'n/a'}</div>
                </TableCell>
                <TableCell className="font-bold text-blue-400 font-mono">${w.amount.toFixed(4)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[150px]">{w.walletAddress || w.walletId}</span>
                    <span className="text-[8px] uppercase text-muted-foreground/60">{w.network}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(w.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {w.status === 'pending' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(w.id, 'processing')} className="text-[10px] h-7 bg-blue-600 hover:bg-blue-700">Process</Button>
                    )}
                    {w.status === 'processing' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(w.id, 'completed')} className="text-[10px] h-7 bg-emerald-600 hover:bg-emerald-700">Complete</Button>
                    )}
                    {(w.status === 'pending' || w.status === 'processing') && (
                      <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(w.id, 'rejected')} className="text-[10px] h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10">Reject</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {Array.isArray(withdrawals) && withdrawals.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs uppercase tracking-widest">No withdrawal records</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function DepositsManager() {
  const { getToken } = useAuth();
  const [deposits, setDeposits] = useState<any[]>([]);

  const fetchDeposits = async () => {
    const token = await getToken();
    const res = await fetch('/api/deposits', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setDeposits(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  const handleApprove = async (id: number) => {
    const token = await getToken();
    await fetch(`/api/deposits/${id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchDeposits();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">Deposit Management</h2>
        <Button size="sm" variant="outline" onClick={fetchDeposits}>Refresh</Button>
      </div>
      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-background/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">User ID</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Amount ($)</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Date</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(deposits) && deposits.map((d) => (
              <TableRow key={d.id} className="border-border hover:bg-secondary/10">
                <TableCell className="text-xs">
                   <div className="font-bold">{d.userFullName || `User #${d.userId}`}</div>
                   <div className="text-[10px] text-muted-foreground font-mono">@{d.userUsername || 'n/a'}</div>
                </TableCell>
                <TableCell className="font-bold text-primary font-mono">${d.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={d.status === 'approved' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}>
                    {d.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-[10px] text-muted-foreground font-mono">{d.createdAt ? new Date(d.createdAt).toLocaleString() : 'N/A'}</TableCell>
                <TableCell>
                  {d.status === 'pending' && (
                    <Button size="sm" onClick={() => handleApprove(d.id)} className="text-[10px] h-7">Verify & Approve</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function BroadcastManager() {
  const { getToken } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message) return;
    setSending(true);
    const token = await getToken();
    const res = await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });
    await res.json();
    alert(`Broadcast sequence initiated in background.`);
    setMessage('');
    setSending(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Broadcast Message</h2>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Message Content</Label>
            <textarea
              className="w-full min-h-[200px] p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary outline-none"
              placeholder="Enter message to send to all bot users..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={sending} onClick={handleSend}>
            {sending ? <Loader2 className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
            Send Broadcast
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Bot Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Minimum Withdrawal ($)</Label>
              <Input defaultValue="10.0" />
            </div>
            <div className="space-y-2">
              <Label>Referral Reward ($)</Label>
              <Input defaultValue="5.0" />
            </div>
            <Button>Save Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
