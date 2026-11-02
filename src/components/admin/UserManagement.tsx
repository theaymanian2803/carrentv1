import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminUsers } from '@/hooks/queries/useAdmin';
import { data } from '@/lib/data';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Search, Shield, ShieldCheck, ShieldAlert, UserCheck, UserX, Eye, Mail, Calendar, CreditCard } from 'lucide-react';
import type { AdminUser, AppRole, KycStatus } from '@/lib/data/types';

type UserWithDetails = AdminUser & {
  user_roles: { role: AppRole }[];
  subscriptions: { plan: string; status: string }[];
};

const kycColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  verified: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const roleIcons: Record<string, React.ReactNode> = {
  admin: <ShieldCheck className="h-3 w-3" />,
  owner: <Shield className="h-3 w-3" />,
  renter: <ShieldAlert className="h-3 w-3" />,
};

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);

  const { data: adminUsers, isLoading } = useAdminUsers();
  const users: UserWithDetails[] = (adminUsers ?? []).map((u) => ({
    ...u,
    user_roles: u.roles.map((role) => ({ role })),
    subscriptions: [{ plan: u.plan, status: u.status }],
  }));

  const updateKyc = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      await data.admin.setKyc(userId, status as KycStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      toast({ title: 'KYC status updated' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const user = users.find((u) => u.id === userId);
      const next = [...(user?.roles ?? []).filter((r) => r !== role), role as AppRole];
      await data.admin.setRoles(userId, next);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      toast({ title: 'Role added' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const user = users.find((u) => u.id === userId);
      const next = (user?.roles ?? []).filter((r) => r !== role);
      await data.admin.setRoles(userId, next);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
      toast({ title: 'Role removed' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const filtered = users?.filter((u) => {
    const matchesSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());
    const matchesKyc = kycFilter === 'all' || u.kyc_status === kycFilter;
    const matchesRole =
      roleFilter === 'all' || u.user_roles.some((r) => r.role === roleFilter);
    return matchesSearch && matchesKyc && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={kycFilter} onValueChange={setKycFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="KYC Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="renter">Renter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{users?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {users?.filter((u) => u.kyc_status === 'verified').length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {users?.filter((u) => u.kyc_status === 'pending').length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Pending KYC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {users?.filter((u) => u.user_roles.some((r) => r.role === 'owner')).length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Owners</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filtered?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => {
                const sub = user.subscriptions?.[0];
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium uppercase">
                          {user.full_name?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium leading-none">{user.full_name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{user.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.user_roles.map((r) => (
                          <Badge key={r.role} variant="outline" className="gap-1 text-xs">
                            {roleIcons[r.role]}
                            {r.role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={kycColors[user.kyc_status]}>
                        {user.kyc_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub ? (
                        <Badge variant={sub.plan === 'pro' ? 'default' : 'secondary'}>
                          {sub.plan} · {sub.status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium uppercase">
                {selectedUser?.full_name?.[0] ?? '?'}
              </div>
              {selectedUser?.full_name || 'Unnamed User'}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{selectedUser?.id}</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Joined
                </div>
                <div>{new Date(selectedUser.created_at).toLocaleDateString()}</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-4 w-4" /> Stripe
                </div>
                <div className="font-mono text-xs">{selectedUser.stripe_account_id || '—'}</div>
              </div>

              <Separator />

              {/* KYC Management */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> KYC Verification
                </h4>
                <div className="flex gap-2">
                  {(['pending', 'verified', 'rejected'] as const).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedUser.kyc_status === status ? 'default' : 'outline'}
                      disabled={updateKyc.isPending}
                      onClick={() => {
                        updateKyc.mutate({ userId: selectedUser.id, status });
                        setSelectedUser({ ...selectedUser, kyc_status: status });
                      }}
                    >
                      {status === 'verified' && <UserCheck className="h-3 w-3 mr-1" />}
                      {status === 'rejected' && <UserX className="h-3 w-3 mr-1" />}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Role Management */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Roles
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {(['admin', 'owner', 'renter'] as const).map((role) => {
                    const has = selectedUser.user_roles.some((r) => r.role === role);
                    return (
                      <Button
                        key={role}
                        size="sm"
                        variant={has ? 'default' : 'outline'}
                        disabled={addRole.isPending || removeRole.isPending}
                        onClick={() => {
                          if (has) {
                            removeRole.mutate({ userId: selectedUser.id, role });
                            setSelectedUser({
                              ...selectedUser,
                              user_roles: selectedUser.user_roles.filter((r) => r.role !== role),
                            });
                          } else {
                            addRole.mutate({ userId: selectedUser.id, role });
                            setSelectedUser({
                              ...selectedUser,
                              user_roles: [...selectedUser.user_roles, { role }],
                            });
                          }
                        }}
                      >
                        {roleIcons[role]}
                        <span className="ml-1">{role}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Subscription */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Subscription
                </h4>
                {selectedUser.subscriptions?.[0] ? (
                  <div className="text-sm space-y-1">
                    <p>
                      Plan:{' '}
                      <Badge variant={selectedUser.subscriptions[0].plan === 'pro' ? 'default' : 'secondary'}>
                        {selectedUser.subscriptions[0].plan}
                      </Badge>
                    </p>
                    <p>
                      Status:{' '}
                      <Badge variant="outline">{selectedUser.subscriptions[0].status}</Badge>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No subscription</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagement;
