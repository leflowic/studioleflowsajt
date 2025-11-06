import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, Music, Heart, MessageCircle, Trash2, Shield, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import type { User, CmsContent, InsertCmsContent } from "@shared/schema";

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalVotes: number;
  totalComments: number;
}

interface ProjectWithUser {
  id: number;
  title: string;
  description: string;
  genre: string;
  mp3Url: string;
  userId: number;
  uploadDate: string;
  votesCount: number;
  currentMonth: string;
  approved: boolean;
  username: string;
}

interface CommentWithDetails {
  id: number;
  projectId: number;
  projectTitle: string;
  userId: number;
  username: string;
  text: string;
  createdAt: string;
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: "Greška",
        description: "Nemate admin privilegije",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="max-w-7xl mx-auto px-6">
          <Skeleton className="h-12 w-64 mb-2" />
          <Skeleton className="h-6 w-96 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // If not admin, don't render anything (will redirect)
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="heading-admin-panel">Admin Panel</h1>
          <p className="text-muted-foreground" data-testid="text-admin-description">
            Upravljanje korisnicima, projektima i komentarima
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full" data-testid="tabs-admin">
          <TabsList className="grid w-full grid-cols-5 mb-8" data-testid="tabs-list-admin">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Korisnici</TabsTrigger>
            <TabsTrigger value="projects" data-testid="tab-projects">Projekti</TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">Komentari</TabsTrigger>
            <TabsTrigger value="cms" data-testid="tab-cms">CMS</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsTab />
          </TabsContent>

          <TabsContent value="comments">
            <CommentsTab />
          </TabsContent>

          <TabsContent value="cms">
            <CMSTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { toast } = useToast();

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch giveaway settings
  const { data: giveawaySettings, isLoading: settingsLoading } = useQuery<{ isActive: boolean }>({
    queryKey: ["/api/giveaway/settings"],
  });

  // Toggle giveaway mutation
  const toggleGiveawayMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      await apiRequest("POST", "/api/admin/giveaway/toggle", { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giveaway/settings"] });
      toast({
        title: "Uspeh",
        description: "Giveaway status je ažuriran",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju giveaway statusa",
        variant: "destructive",
      });
    },
  });

  if (statsLoading || settingsLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" data-testid={`skeleton-stat-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="content-dashboard">
      <Card data-testid="card-giveaway-toggle">
        <CardHeader>
          <CardTitle>Giveaway Kontrola</CardTitle>
          <CardDescription>Uključite ili isključite giveaway</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Switch
              id="giveaway-toggle"
              checked={giveawaySettings?.isActive || false}
              onCheckedChange={(checked) => toggleGiveawayMutation.mutate(checked)}
              disabled={toggleGiveawayMutation.isPending}
              data-testid="switch-giveaway"
            />
            <Label htmlFor="giveaway-toggle" data-testid="label-giveaway">
              Giveaway aktivan
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-stat-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno Korisnika</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {stats?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-projects">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno Projekata</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-projects">
              {stats?.totalProjects || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-votes">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno Glasova</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-votes">
              {stats?.totalVotes || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-comments">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno Komentara</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-comments">
              {stats?.totalComments || 0}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsersTab() {
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const banMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/admin/users/${userId}/ban`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Uspeh",
        description: "Korisnik je banovan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri banovanju korisnika",
        variant: "destructive",
      });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/admin/users/${userId}/unban`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Uspeh",
        description: "Korisnik je odbanovan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri odbanovanju korisnika",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Uspeh",
        description: "Korisnik je obrisan",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri brisanju korisnika",
        variant: "destructive",
      });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/admin/users/${userId}/toggle-admin`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Uspeh",
        description: "Admin privilegije su ažurirane",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri ažuriranju admin privilegija",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16" data-testid={`skeleton-user-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="content-users">
      <Card>
        <CardHeader>
          <CardTitle>Upravljanje Korisnicima</CardTitle>
          <CardDescription>Pregled i upravljanje svim korisnicima</CardDescription>
        </CardHeader>
        <CardContent>
          <Table data-testid="table-users">
            <TableHeader>
              <TableRow>
                <TableHead data-testid="header-username">Korisničko Ime</TableHead>
                <TableHead data-testid="header-email">Email</TableHead>
                <TableHead data-testid="header-role">Uloga</TableHead>
                <TableHead data-testid="header-status">Status</TableHead>
                <TableHead data-testid="header-created">Kreiran</TableHead>
                <TableHead data-testid="header-actions">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell data-testid={`cell-username-${user.id}`}>{user.username}</TableCell>
                  <TableCell data-testid={`cell-email-${user.id}`}>{user.email}</TableCell>
                  <TableCell data-testid={`cell-role-${user.id}`}>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} data-testid={`badge-role-${user.id}`}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`cell-status-${user.id}`}>
                    {user.banned && (
                      <Badge variant="destructive" data-testid={`badge-banned-${user.id}`}>
                        Banned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell data-testid={`cell-created-${user.id}`}>
                    {format(new Date(user.createdAt), "dd.MM.yyyy")}
                  </TableCell>
                  <TableCell data-testid={`cell-actions-${user.id}`}>
                    <div className="flex items-center gap-2">
                      {user.banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unbanMutation.mutate(user.id)}
                          disabled={unbanMutation.isPending}
                          data-testid={`button-unban-${user.id}`}
                        >
                          <ShieldOff className="h-4 w-4 mr-1" />
                          Unban
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => banMutation.mutate(user.id)}
                          disabled={banMutation.isPending}
                          data-testid={`button-ban-${user.id}`}
                        >
                          <ShieldOff className="h-4 w-4 mr-1" />
                          Ban
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAdminMutation.mutate(user.id)}
                        disabled={toggleAdminMutation.isPending}
                        data-testid={`button-toggle-admin-${user.id}`}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Obriši
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-testid={`dialog-delete-user-${user.id}`}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ova akcija ne može biti poništena. Korisnik "{user.username}" i svi njegovi podaci (projekti, glasovi, komentari) će biti trajno obrisani.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-user-${user.id}`}>
                              Otkaži
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUserMutation.mutate(user.id)}
                              data-testid={`button-confirm-delete-user-${user.id}`}
                            >
                              Obriši
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
}

function ProjectsTab() {
  const { toast } = useToast();

  const { data: approvedProjects, isLoading: approvedLoading } = useQuery<ProjectWithUser[]>({
    queryKey: ["/api/giveaway/projects"],
  });

  const { data: pendingProjects, isLoading: pendingLoading } = useQuery<ProjectWithUser[]>({
    queryKey: ["/api/admin/pending-projects"],
  });

  const approveMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest("POST", `/api/admin/projects/${projectId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giveaway/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-projects"] });
      toast({
        title: "Uspeh",
        description: "Projekat je odobren i sada je vidljiv korisnicima",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri odobravanju projekta",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest("DELETE", `/api/admin/projects/${projectId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/giveaway/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-projects"] });
      toast({
        title: "Uspeh",
        description: "Projekat je obrisan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri brisanju projekta",
        variant: "destructive",
      });
    },
  });

  if (pendingLoading || approvedLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" data-testid={`skeleton-project-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="content-projects" className="space-y-8">
      {/* Pending Projects Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Projekti na Čekanju</h2>
        <p className="text-muted-foreground mb-6">
          Projekti koje korisnici uploaduju moraju biti odobreni pre nego što budu vidljivi ostalim korisnicima.
        </p>
        {pendingProjects && pendingProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingProjects.map((project) => (
              <Card key={project.id} data-testid={`card-pending-project-${project.id}`} className="border-yellow-500">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500">
                      Na čekanju
                    </Badge>
                  </div>
                  <CardTitle className="text-lg" data-testid={`title-pending-project-${project.id}`}>
                    {project.title}
                  </CardTitle>
                  <CardDescription data-testid={`author-pending-project-${project.id}`}>
                    by {project.username}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Žanr:</span>
                      <Badge variant="secondary" data-testid={`genre-pending-project-${project.id}`}>
                        {project.genre}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Opis:</span>
                      <span className="text-sm text-right line-clamp-2">{project.description}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => approveMutation.mutate(project.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-project-${project.id}`}
                    >
                      Odobri Projekat
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          data-testid={`button-reject-project-${project.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Odbij i Obriši
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent data-testid={`dialog-reject-project-${project.id}`}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Projekat "{project.title}" će biti trajno odbijen i obrisan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid={`button-cancel-reject-project-${project.id}`}>
                            Otkaži
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(project.id)}
                            data-testid={`button-confirm-reject-project-${project.id}`}
                          >
                            Odbij i Obriši
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card data-testid="card-no-pending-projects">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground" data-testid="text-no-pending-projects">
                Nema projekata na čekanju
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approved Projects Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Odobreni Projekti</h2>
        <p className="text-muted-foreground mb-6">
          Projekti koji su odobreni i vidljivi svim korisnicima.
        </p>
        {approvedProjects && approvedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedProjects.map((project) => (
              <Card key={project.id} data-testid={`card-approved-project-${project.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500">
                      Odobreno
                    </Badge>
                  </div>
                  <CardTitle className="text-lg" data-testid={`title-approved-project-${project.id}`}>
                    {project.title}
                  </CardTitle>
                  <CardDescription data-testid={`author-approved-project-${project.id}`}>
                    by {project.username}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Žanr:</span>
                      <Badge variant="secondary" data-testid={`genre-approved-project-${project.id}`}>
                        {project.genre}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Glasovi:</span>
                      <span className="font-medium" data-testid={`votes-approved-project-${project.id}`}>
                        {project.votesCount}
                      </span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        data-testid={`button-delete-approved-project-${project.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Obriši Projekat
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent data-testid={`dialog-delete-approved-project-${project.id}`}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ova akcija ne može biti poništena. Projekat "{project.title}" će biti trajno obrisan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid={`button-cancel-delete-approved-project-${project.id}`}>
                          Otkaži
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(project.id)}
                          data-testid={`button-confirm-delete-approved-project-${project.id}`}
                        >
                          Obriši
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card data-testid="card-no-approved-projects">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground" data-testid="text-no-approved-projects">
                Nema odobrenih projekata
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CommentsTab() {
  const { toast } = useToast();

  const { data: comments, isLoading } = useQuery<CommentWithDetails[]>({
    queryKey: ["/api/admin/comments"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/admin/comments/${commentId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });
      toast({
        title: "Uspeh",
        description: "Komentar je obrisan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri brisanju komentara",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32" data-testid={`skeleton-comment-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="content-comments">
      {comments?.map((comment) => (
        <Card key={comment.id} data-testid={`card-comment-${comment.id}`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base" data-testid={`username-comment-${comment.id}`}>
                  {comment.username}
                </CardTitle>
                <CardDescription data-testid={`project-comment-${comment.id}`}>
                  na projektu: {comment.projectTitle}
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(comment.id)}
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-comment-${comment.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2" data-testid={`text-comment-${comment.id}`}>
              {comment.text}
            </p>
            <p className="text-xs text-muted-foreground" data-testid={`time-comment-${comment.id}`}>
              {format(new Date(comment.createdAt), "dd.MM.yyyy HH:mm")}
            </p>
          </CardContent>
        </Card>
      ))}

      {comments?.length === 0 && (
        <Card data-testid="card-no-comments">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground" data-testid="text-no-comments">
              Nema komentara
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CMSTab() {
  return (
    <Tabs defaultValue="home" data-testid="tabs-cms">
      <TabsList data-testid="tabs-list-cms-pages">
        <TabsTrigger value="home" data-testid="tab-cms-home">Home Page</TabsTrigger>
        <TabsTrigger value="team" data-testid="tab-cms-team">Team Page</TabsTrigger>
      </TabsList>

      <TabsContent value="home">
        <HomePageCMS />
      </TabsContent>

      <TabsContent value="team">
        <TeamPageCMS />
      </TabsContent>
    </Tabs>
  );
}

function HomePageCMS() {
  const { toast } = useToast();

  const { data: content = [], isLoading } = useQuery<CmsContent[]>({
    queryKey: ["/api/cms/content", "home"],
    queryFn: () => fetch("/api/cms/content?page=home").then(r => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: InsertCmsContent[]) => {
      return apiRequest("POST", "/api/cms/content", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/content", "home"] });
      toast({ title: "Uspešno", description: "Sadržaj ažuriran" });
    },
    onError: (error: Error) => {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    },
  });

  const getContent = (section: string, key: string) => {
    return content.find(c => c.section === section && c.contentKey === key)?.contentValue || "";
  };

  const [formData, setFormData] = useState({
    hero_title: "",
    hero_subtitle: "",
    hero_description: "",
    service_1_title: "",
    service_1_description: "",
    service_2_title: "",
    service_2_description: "",
    service_3_title: "",
    service_3_description: "",
    service_4_title: "",
    service_4_description: "",
    cta_title: "",
    cta_description: "",
  });

  useEffect(() => {
    if (content.length > 0) {
      setFormData({
        hero_title: getContent("hero", "title"),
        hero_subtitle: getContent("hero", "subtitle"),
        hero_description: getContent("hero", "description"),
        service_1_title: getContent("services", "service_1_title"),
        service_1_description: getContent("services", "service_1_description"),
        service_2_title: getContent("services", "service_2_title"),
        service_2_description: getContent("services", "service_2_description"),
        service_3_title: getContent("services", "service_3_title"),
        service_3_description: getContent("services", "service_3_description"),
        service_4_title: getContent("services", "service_4_title"),
        service_4_description: getContent("services", "service_4_description"),
        cta_title: getContent("cta", "title"),
        cta_description: getContent("cta", "description"),
      });
    }
  }, [content]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: InsertCmsContent[] = [
      { page: "home", section: "hero", contentKey: "title", contentValue: formData.hero_title },
      { page: "home", section: "hero", contentKey: "subtitle", contentValue: formData.hero_subtitle },
      { page: "home", section: "hero", contentKey: "description", contentValue: formData.hero_description },
      { page: "home", section: "services", contentKey: "service_1_title", contentValue: formData.service_1_title },
      { page: "home", section: "services", contentKey: "service_1_description", contentValue: formData.service_1_description },
      { page: "home", section: "services", contentKey: "service_2_title", contentValue: formData.service_2_title },
      { page: "home", section: "services", contentKey: "service_2_description", contentValue: formData.service_2_description },
      { page: "home", section: "services", contentKey: "service_3_title", contentValue: formData.service_3_title },
      { page: "home", section: "services", contentKey: "service_3_description", contentValue: formData.service_3_description },
      { page: "home", section: "services", contentKey: "service_4_title", contentValue: formData.service_4_title },
      { page: "home", section: "services", contentKey: "service_4_description", contentValue: formData.service_4_description },
      { page: "home", section: "cta", contentKey: "title", contentValue: formData.cta_title },
      { page: "home", section: "cta", contentKey: "description", contentValue: formData.cta_description },
    ];

    updateMutation.mutate(updates);
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card data-testid="card-cms-home-hero">
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hero_title">Naslov</Label>
            <Input
              id="hero_title"
              value={formData.hero_title}
              onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
              data-testid="input-hero-title"
            />
          </div>
          <div>
            <Label htmlFor="hero_subtitle">Podnaslov</Label>
            <Input
              id="hero_subtitle"
              value={formData.hero_subtitle}
              onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
              data-testid="input-hero-subtitle"
            />
          </div>
          <div>
            <Label htmlFor="hero_description">Opis</Label>
            <Textarea
              id="hero_description"
              value={formData.hero_description}
              onChange={(e) => setFormData({ ...formData, hero_description: e.target.value })}
              rows={3}
              data-testid="textarea-hero-description"
            />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-cms-home-services">
        <CardHeader>
          <CardTitle>Usluge (Services)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3, 4].map(num => (
            <div key={num} className="pl-4 space-y-3">
              <h3 className="font-semibold">Usluga {num}</h3>
              <div>
                <Label>Naslov</Label>
                <Input
                  value={formData[`service_${num}_title` as keyof typeof formData]}
                  onChange={(e) => setFormData({ ...formData, [`service_${num}_title`]: e.target.value })}
                  data-testid={`input-service-${num}-title`}
                />
              </div>
              <div>
                <Label>Opis</Label>
                <Textarea
                  value={formData[`service_${num}_description` as keyof typeof formData]}
                  onChange={(e) => setFormData({ ...formData, [`service_${num}_description`]: e.target.value })}
                  rows={2}
                  data-testid={`textarea-service-${num}-description`}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="card-cms-home-cta">
        <CardHeader>
          <CardTitle>Call to Action (CTA)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Naslov</Label>
            <Input
              value={formData.cta_title}
              onChange={(e) => setFormData({ ...formData, cta_title: e.target.value })}
              data-testid="input-cta-title"
            />
          </div>
          <div>
            <Label>Opis</Label>
            <Textarea
              value={formData.cta_description}
              onChange={(e) => setFormData({ ...formData, cta_description: e.target.value })}
              rows={2}
              data-testid="textarea-cta-description"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          data-testid="button-save-home-cms"
        >
          {updateMutation.isPending ? "Čuvanje..." : "Sačuvaj Izmene"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open("/", "_blank")}
          data-testid="button-preview-home"
        >
          Pregled Home Page
        </Button>
      </div>
    </form>
  );
}

function TeamPageCMS() {
  const { toast } = useToast();

  const { data: content = [], isLoading } = useQuery<CmsContent[]>({
    queryKey: ["/api/cms/content", "team"],
    queryFn: () => fetch("/api/cms/content?page=team").then(r => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: InsertCmsContent[]) => {
      return apiRequest("POST", "/api/cms/content", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/content", "team"] });
      toast({ title: "Uspešno", description: "Sadržaj ažuriran" });
    },
    onError: (error: Error) => {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    },
  });

  const getContent = (section: string, key: string) => {
    return content.find(c => c.section === section && c.contentKey === key)?.contentValue || "";
  };

  const [formData, setFormData] = useState({
    member_1_name: "",
    member_1_role: "",
    member_1_description: "",
    member_1_instagram: "",
    member_2_name: "",
    member_2_role: "",
    member_2_description: "",
    member_2_instagram: "",
    member_3_name: "",
    member_3_role: "",
    member_3_description: "",
    member_3_instagram: "",
    member_4_name: "",
    member_4_role: "",
    member_4_description: "",
    member_4_instagram: "",
  });

  useEffect(() => {
    if (content.length > 0) {
      setFormData({
        member_1_name: getContent("members", "member_1_name"),
        member_1_role: getContent("members", "member_1_role"),
        member_1_description: getContent("members", "member_1_description"),
        member_1_instagram: getContent("members", "member_1_instagram"),
        member_2_name: getContent("members", "member_2_name"),
        member_2_role: getContent("members", "member_2_role"),
        member_2_description: getContent("members", "member_2_description"),
        member_2_instagram: getContent("members", "member_2_instagram"),
        member_3_name: getContent("members", "member_3_name"),
        member_3_role: getContent("members", "member_3_role"),
        member_3_description: getContent("members", "member_3_description"),
        member_3_instagram: getContent("members", "member_3_instagram"),
        member_4_name: getContent("members", "member_4_name"),
        member_4_role: getContent("members", "member_4_role"),
        member_4_description: getContent("members", "member_4_description"),
        member_4_instagram: getContent("members", "member_4_instagram"),
      });
    }
  }, [content]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: InsertCmsContent[] = [
      { page: "team", section: "members", contentKey: "member_1_name", contentValue: formData.member_1_name },
      { page: "team", section: "members", contentKey: "member_1_role", contentValue: formData.member_1_role },
      { page: "team", section: "members", contentKey: "member_1_description", contentValue: formData.member_1_description },
      { page: "team", section: "members", contentKey: "member_1_instagram", contentValue: formData.member_1_instagram },
      { page: "team", section: "members", contentKey: "member_2_name", contentValue: formData.member_2_name },
      { page: "team", section: "members", contentKey: "member_2_role", contentValue: formData.member_2_role },
      { page: "team", section: "members", contentKey: "member_2_description", contentValue: formData.member_2_description },
      { page: "team", section: "members", contentKey: "member_2_instagram", contentValue: formData.member_2_instagram },
      { page: "team", section: "members", contentKey: "member_3_name", contentValue: formData.member_3_name },
      { page: "team", section: "members", contentKey: "member_3_role", contentValue: formData.member_3_role },
      { page: "team", section: "members", contentKey: "member_3_description", contentValue: formData.member_3_description },
      { page: "team", section: "members", contentKey: "member_3_instagram", contentValue: formData.member_3_instagram },
      { page: "team", section: "members", contentKey: "member_4_name", contentValue: formData.member_4_name },
      { page: "team", section: "members", contentKey: "member_4_role", contentValue: formData.member_4_role },
      { page: "team", section: "members", contentKey: "member_4_description", contentValue: formData.member_4_description },
      { page: "team", section: "members", contentKey: "member_4_instagram", contentValue: formData.member_4_instagram },
    ];

    updateMutation.mutate(updates);
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {[1, 2, 3, 4].map(num => (
        <Card key={num} data-testid={`card-cms-team-member-${num}`}>
          <CardHeader>
            <CardTitle>Tim Član {num}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Ime</Label>
              <Input
                value={formData[`member_${num}_name` as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [`member_${num}_name`]: e.target.value })}
                data-testid={`input-member-${num}-name`}
              />
            </div>
            <div>
              <Label>Uloga</Label>
              <Input
                value={formData[`member_${num}_role` as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [`member_${num}_role`]: e.target.value })}
                data-testid={`input-member-${num}-role`}
              />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea
                value={formData[`member_${num}_description` as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [`member_${num}_description`]: e.target.value })}
                rows={3}
                data-testid={`textarea-member-${num}-description`}
              />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input
                value={formData[`member_${num}_instagram` as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [`member_${num}_instagram`]: e.target.value })}
                placeholder="@username"
                data-testid={`input-member-${num}-instagram`}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          data-testid="button-save-team-cms"
        >
          {updateMutation.isPending ? "Čuvanje..." : "Sačuvaj Izmene"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open("/tim", "_blank")}
          data-testid="button-preview-team"
        >
          Pregled Team Page
        </Button>
      </div>
    </form>
  );
}
